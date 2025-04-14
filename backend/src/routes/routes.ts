import { Router } from 'express';
import { getTemperature } from '../hardware/sensor';
import { getHysteresis, getTargetTemperature, setTargetTemperature, startThermostat, stopThermostat, setHysteresis, getThermostatState } from '../services/logic';

const router = Router();

// Ruta de temperatura
router.get('/api/temperature', (_req, res) => {
  try {
    const temp = getTemperature();
    if (isNaN(temp)) {
      return res.status(500).json({ error: 'Error al obtener la temperatura del sensor' });
    }
    res.status(200).json({ temperature: temp });
  } catch (error) {
    console.error('Error en endpoint /api/temperature:', error);
    res.status(500).json({ error: 'Error interno al obtener la temperatura' });
  }
});

// Estado caldera
router.get('/api/status', (_req, res) => {
  try {
    // Obtener estado actualizado del termostato
    const thermostatState = getThermostatState();
    
    // Enviar respuesta en el formato que espera el frontend
    res.status(200).json({
      currentTemperature: thermostatState.currentTemperature,
      targetTemperature: thermostatState.targetTemperature,
      hysteresis: thermostatState.hysteresis,
      isHeating: thermostatState.isHeating,
      lastUpdated: thermostatState.lastUpdated,
      isRunning: thermostatState.isRunning
    });
  } catch (error) {
    console.error('Error en endpoint /api/status:', error);
    res.status(500).json({ error: 'Error interno al obtener el estado del termostato' });
  }
});

// Obtener temperatura objetivo
router.get('/api/target-temperature', (_req, res) => {
  try {
    const targetTemperature = getTargetTemperature();
    res.status(200).json({ target: targetTemperature });
  } catch (error) {
    console.error('Error en endpoint /api/target-temperature:', error);
    res.status(500).json({ error: 'Error interno al obtener la temperatura objetivo' });
  }
});

// Obtener hysteresis
router.get('/api/hysteresis', (_req, res) => {
  try {
    const hysteresis = getHysteresis();
    res.status(200).json({ hysteresis });
  } catch (error) {
    console.error('Error en endpoint /api/hysteresis:', error);
    res.status(500).json({ error: 'Error interno al obtener la histéresis' });
  }
});

// Establecer temperatura objetivo
router.post('/api/target-temperature', (req, res) => {
  try {
    const { temperature } = req.body;
    
    if (temperature === undefined || temperature === null) {
      return res.status(400).json({ error: 'No se proporcionó un valor de temperatura' });
    }
    
    if (typeof temperature !== 'number' || isNaN(temperature)) {
      return res.status(400).json({ error: 'Se requiere un valor numérico válido para la temperatura' });
    }
    
    // Validar rango de temperatura razonable (ejemplo: entre 5°C y 30°C)
    if (temperature < 5 || temperature > 30) {
      return res.status(400).json({ error: 'La temperatura debe estar entre 5°C y 30°C' });
    }
    
    setTargetTemperature(temperature);
    res.status(200).json({ targetTemperature: temperature });
  } catch (error) {
    console.error('Error en endpoint /api/target-temperature:', error);
    res.status(500).json({ error: 'Error interno al establecer la temperatura objetivo' });
  }
});

// Establecer hysteresis
router.post('/api/hysteresis', (req, res) => {
  try {
    const { hysteresis } = req.body;
    
    if (hysteresis === undefined || hysteresis === null) {
      return res.status(400).json({ error: 'No se proporcionó un valor de histéresis' });
    }
    
    if (typeof hysteresis !== 'number' || isNaN(hysteresis)) {
      return res.status(400).json({ error: 'Se requiere un valor numérico válido para la histéresis' });
    }
    
    // Validar rango de histéresis razonable (ejemplo: entre 0.1 y 5)
    if (hysteresis <= 0 || hysteresis > 5) {
      return res.status(400).json({ error: 'La histéresis debe ser un valor positivo entre 0.1 y 5' });
    }
    
    setHysteresis(hysteresis);
    res.status(200).json({ hysteresis });
  } catch (error) {
    console.error('Error en endpoint /api/hysteresis:', error);
    res.status(500).json({ error: 'Error interno al establecer la histéresis' });
  }
});

// Iniciar termostato
router.post('/api/thermostat/start', (req, res) => {
  try {
    const { targetTemperature, hysteresis } = req.body;
    const config: { targetTemperature?: number; hysteresis?: number } = {};
    
    // Validar temperatura objetivo si se proporciona
    if (targetTemperature !== undefined) {
      if (typeof targetTemperature !== 'number' || isNaN(targetTemperature)) {
        return res.status(400).json({ error: 'La temperatura objetivo debe ser un valor numérico válido' });
      }
      
      if (targetTemperature < 5 || targetTemperature > 30) {
        return res.status(400).json({ error: 'La temperatura objetivo debe estar entre 5°C y 30°C' });
      }
      
      config.targetTemperature = targetTemperature;
    }
    
    // Validar histéresis si se proporciona
    if (hysteresis !== undefined) {
      if (typeof hysteresis !== 'number' || isNaN(hysteresis)) {
        return res.status(400).json({ error: 'La histéresis debe ser un valor numérico válido' });
      }
      
      if (hysteresis <= 0 || hysteresis > 5) {
        return res.status(400).json({ error: 'La histéresis debe ser un valor positivo entre 0.1 y 5' });
      }
      
      config.hysteresis = hysteresis;
    }
    
    startThermostat(config);
    res.status(200).json({ status: 'started', config });
  } catch (error) {
    console.error('Error en endpoint /api/thermostat/start:', error);
    res.status(500).json({ error: 'Error al iniciar el termostato' });
  }
});

// Detener termostato
router.post('/api/thermostat/stop', (_req, res) => {
  try {
    stopThermostat();
    res.status(200).json({ status: 'stopped' });
  } catch (error) {
    console.error('Error en endpoint /api/thermostat/stop:', error);
    res.status(500).json({ error: 'Error al detener el termostato' });
  }
});

export default router;