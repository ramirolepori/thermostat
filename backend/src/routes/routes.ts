import { Router, Request, Response, NextFunction } from 'express';
import { getTemperature } from '../hardware/sensor';
import { 
  getHysteresis,
  getTargetTemperature, 
  setTargetTemperature, 
  startThermostat, 
  stopThermostat, 
  setHysteresis, 
  getThermostatState,
  getLastError,
  resetThermostat,
  validateTemperatureValue,
  validateHysteresisValue
} from '../services/logic';
import { SceneModel } from '../database/scene.model';
import { Types } from 'mongoose';

const router = Router();

// Cache para datos de temperatura
let temperatureCache: {
  value: number | null;
  timestamp: number;
} = {
  value: null,
  timestamp: 0
};

// Tiempo de expiración del caché (500 ms)
const CACHE_TTL = 500;

// Interfaces para los tipos de las solicitudes
interface TemperatureRequest extends Request {
  body: {
    temperature?: number;
  }
}

interface HysteresisRequest extends Request {
  body: {
    hysteresis?: number;
  }
}

interface ThermostatConfigRequest extends Request {
  body: {
    targetTemperature?: number;
    hysteresis?: number;
  }
}

// Middleware para validación de parámetros de temperatura usando lógica centralizada
const validateTemperature = (req: TemperatureRequest, res: Response, next: NextFunction) => {
  const temperature = req.body.temperature;
  if (temperature === undefined || temperature === null) {
    return res.status(400).json({ error: 'No se proporcionó un valor de temperatura' });
  }
  if (!validateTemperatureValue(temperature)) {
    return res.status(400).json({ error: 'La temperatura debe estar entre 5°C y 30°C' });
  }
  next();
};

// Middleware para validación de histéresis usando lógica centralizada
const validateHysteresis = (req: HysteresisRequest, res: Response, next: NextFunction) => {
  const hysteresis = req.body.hysteresis;
  if (hysteresis === undefined || hysteresis === null) {
    return res.status(400).json({ error: 'No se proporcionó un valor de histéresis' });
  }
  if (!validateHysteresisValue(hysteresis)) {
    return res.status(400).json({ error: 'La histéresis debe ser un valor positivo entre 0.1 y 5' });
  }
  next();
};

// Ruta de prueba para comprobar que el servidor está funcionando
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Ruta de comprobación de estado del sistema
router.get('/health', (_req: Request, res: Response) => {
  try {
    const lastError = getLastError();
    const thermostatState = getThermostatState();
    
    res.status(200).json({
      status: 'ok',
      version: '1.2.0',
      uptime: process.uptime(),
      thermostatRunning: thermostatState.isRunning,
      lastError: lastError,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en endpoint /health:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Error al verificar estado del sistema',
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta de temperatura con caché
router.get('/temperature', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    
    // Usar caché si está disponible y es reciente
    if (temperatureCache.value !== null && (now - temperatureCache.timestamp) < CACHE_TTL) {
      return res.status(200).json({ 
        temperature: temperatureCache.value,
        fromCache: true
      });
    }
    
    const temp = getTemperature();
    if (isNaN(temp)) {
      return res.status(500).json({ error: 'Error al obtener la temperatura del sensor' });
    }
    
    // Actualizar caché
    temperatureCache = {
      value: temp,
      timestamp: now
    };
    
    res.set('Cache-Control', 'private, max-age=1');
    res.status(200).json({ temperature: temp });
  } catch (error) {
    console.error('Error en endpoint /temperature:', error);
    res.status(500).json({ error: 'Error interno al obtener la temperatura' });
  }
});

// Estado del termostato con caché ETags
let lastStateETag = '';
let lastState = null;

// Estado caldera
router.get('/status', (req: Request, res: Response) => {
  try {
    // Obtener estado actualizado del termostato
    const thermostatState = getThermostatState();
    
    // Generar ETag basado en los datos
    const stateHash = JSON.stringify(thermostatState);
    const etag = Buffer.from(stateHash).toString('base64').substring(0, 16);
    
    // Verificar si el cliente ya tiene la versión más reciente
    if (req.headers['if-none-match'] === etag && lastStateETag === etag) {
      return res.status(304).end();
    }
    
    // Actualizar ETag y estado en caché
    lastStateETag = etag;
    lastState = thermostatState;
    
    // Establecer cabeceras para caching
    res.set('ETag', etag);
    res.set('Cache-Control', 'private, max-age=1');
    
    // Enviar respuesta con los datos
    res.status(200).json({
      currentTemperature: thermostatState.currentTemperature,
      targetTemperature: thermostatState.targetTemperature,
      hysteresis: thermostatState.hysteresis,
      isHeating: thermostatState.isHeating,
      lastUpdated: thermostatState.lastUpdated,
      isRunning: thermostatState.isRunning,
      lastError: thermostatState.lastError
    });
  } catch (error) {
    console.error('Error en endpoint /status:', error);
    res.status(500).json({ error: 'Error interno al obtener el estado del termostato' });
  }
});

// Obtener temperatura objetivo
router.get('/target-temperature', (_req: Request, res: Response) => {
  try {
    const targetTemperature = getTargetTemperature();
    res.set('Cache-Control', 'private, max-age=5');
    res.status(200).json({ target: targetTemperature });
  } catch (error) {
    console.error('Error en endpoint /target-temperature:', error);
    res.status(500).json({ error: 'Error interno al obtener la temperatura objetivo' });
  }
});

// Obtener hysteresis
router.get('/hysteresis', (_req: Request, res: Response) => {
  try {
    const hysteresis = getHysteresis();
    res.set('Cache-Control', 'private, max-age=5');
    res.status(200).json({ hysteresis });
  } catch (error) {
    console.error('Error en endpoint /hysteresis:', error);
    res.status(500).json({ error: 'Error interno al obtener la histéresis' });
  }
});

// Establecer temperatura objetivo usando middleware de validación
router.post('/target-temperature', validateTemperature, (req: TemperatureRequest, res: Response) => {
  try {
    const { temperature } = req.body;
    
    // Ya validado por el middleware
    const success = setTargetTemperature(temperature!);
    
    if (!success) {
      const lastError = getLastError();
      return res.status(400).json({ 
        error: lastError || 'Error al establecer la temperatura objetivo'
      });
    }
    
    // Invalidar caché
    temperatureCache.timestamp = 0;
    lastStateETag = '';
    
    res.status(200).json({ targetTemperature: temperature });
  } catch (error) {
    console.error('Error en endpoint /target-temperature:', error);
    res.status(500).json({ error: 'Error interno al establecer la temperatura objetivo' });
  }
});

// Establecer hysteresis usando middleware de validación
router.post('/hysteresis', validateHysteresis, (req: HysteresisRequest, res: Response) => {
  try {
    const { hysteresis } = req.body;
    
    // Ya validado por el middleware
    const success = setHysteresis(hysteresis!);
    
    if (!success) {
      const lastError = getLastError();
      return res.status(400).json({ 
        error: lastError || 'Error al establecer la histéresis'
      });
    }
    
    // Invalidar caché
    lastStateETag = '';
    
    res.status(200).json({ hysteresis });
  } catch (error) {
    console.error('Error en endpoint /hysteresis:', error);
    res.status(500).json({ error: 'Error interno al establecer la histéresis' });
  }
});

// Iniciar termostato
router.post('/thermostat/start', (req: ThermostatConfigRequest, res: Response) => {
  try {
    const { targetTemperature, hysteresis } = req.body;
    const config: { targetTemperature?: number; hysteresis?: number } = {};
    
    // Validar temperatura objetivo si se proporciona
    if (targetTemperature !== undefined) {
      if (typeof targetTemperature !== 'number' || isNaN(targetTemperature)) {
        return res.status(400).json({ error: 'La temperatura objetivo debe ser un valor numérico válido' });
      }
      
      if (!validateTemperatureValue(targetTemperature)) {
        return res.status(400).json({ error: 'La temperatura objetivo debe estar entre 5°C y 30°C' });
      }
      
      config.targetTemperature = targetTemperature;
    }
    
    // Validar histéresis si se proporciona
    if (hysteresis !== undefined) {
      if (typeof hysteresis !== 'number' || isNaN(hysteresis)) {
        return res.status(400).json({ error: 'La histéresis debe ser un valor numérico válido' });
      }
      
      if (!validateHysteresisValue(hysteresis)) {
        return res.status(400).json({ error: 'La histéresis debe ser un valor positivo entre 0.1 y 5' });
      }
      
      config.hysteresis = hysteresis;
    }
    
    const success = startThermostat(config);
    
    if (!success) {
      const lastError = getLastError();
      return res.status(500).json({ 
        error: lastError || 'Error al iniciar el termostato' 
      });
    }
    
    // Invalidar caché
    temperatureCache.timestamp = 0;
    lastStateETag = '';
    
    res.status(200).json({ status: 'started', config });
  } catch (error) {
    console.error('Error en endpoint /thermostat/start:', error);
    res.status(500).json({ error: 'Error al iniciar el termostato' });
  }
});

// Detener termostato
router.post('/thermostat/stop', (_req: Request, res: Response) => {
  try {
    const success = stopThermostat();
    
    if (!success) {
      const lastError = getLastError();
      return res.status(500).json({ 
        error: lastError || 'Error al detener el termostato' 
      });
    }
    
    // Invalidar caché
    temperatureCache.timestamp = 0;
    lastStateETag = '';
    
    res.status(200).json({ status: 'stopped' });
  } catch (error) {
    console.error('Error en endpoint /thermostat/stop:', error);
    res.status(500).json({ error: 'Error al detener el termostato' });
  }
});

// Reiniciar el termostato (útil cuando ocurren errores)
router.post('/thermostat/reset', (_req: Request, res: Response) => {
  try {
    const success = resetThermostat();
    
    if (!success) {
      const lastError = getLastError();
      return res.status(500).json({ 
        error: lastError || 'Error al reiniciar el termostato' 
      });
    }
    
    // Invalidar caché
    temperatureCache.timestamp = 0;
    lastStateETag = '';
    
    const state = getThermostatState();
    
    res.status(200).json({ 
      status: 'reset', 
      running: state.isRunning,
      targetTemperature: state.targetTemperature,
      hysteresis: state.hysteresis
    });
  } catch (error) {
    console.error('Error en endpoint /thermostat/reset:', error);
    res.status(500).json({ error: 'Error al reiniciar el termostato' });
  }
});

// Obtener todas las escenas
router.get('/scenes', async (_req, res) => {
  try {
    const scenes = await SceneModel.find();
    res.json(scenes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener escenas' });
  }
});

// Crear una nueva escena
router.post('/scenes', async (req, res) => {
  try {
    const { name, temperature, active } = req.body;
    if (!name || typeof temperature !== 'number') {
      return res.status(400).json({ error: 'Nombre y temperatura son requeridos' });
    }
    const scene = new SceneModel({ name, temperature, active: !!active });
    await scene.save();
    res.status(201).json(scene);
  } catch (error) {
    // Corregido: asegurar que error es any para acceder a error.code
    if ((error as any).code === 11000) {
      return res.status(409).json({ error: 'Ya existe una escena con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear la escena' });
  }
});

// Eliminar una escena por ID
router.delete('/scenes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const result = await SceneModel.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: 'Escena no encontrada' });
    }
    res.json({ message: 'Escena eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la escena' });
  }
});

export default router;