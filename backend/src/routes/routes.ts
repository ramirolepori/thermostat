import { Router } from 'express';
import { getTemperature } from '../hardware/sensor';
import { getTargetTemperature, setTargetTemperature, startThermostat, stopThermostat, setHysteresis, getThermostatState } from '../services/logic';

const router = Router();

// Ruta de temperatura
router.get('/api/temperature', (_req, res) => {
  const temp = getTemperature();
  res.json({ temperature: temp });
});

// Estado caldera
router.get('/api/status', (_req, res) => {
  res.json({ status: getThermostatState() });
});

// Obtener temperatura objetivo
router.get('/api/target-temperature', (_req, res) => {
  const targetTemperature = getTargetTemperature();
  res.json({ targetTemperature });
});

// Establecer temperatura objetivo
router.post('/api/target-temperature', (req, res) => {
  const { temperature } = req.body;
  
  if (typeof temperature === 'number') {
    setTargetTemperature(temperature);
    res.json({ targetTemperature: temperature });
  } else {
    res.status(400).json({ error: 'Se requiere un valor numérico para la temperatura' });
  }
});

// Iniciar termostato
router.post('/api/thermostat/start', (req, res) => {
  const { targetTemperature, hysteresis } = req.body;
  
  try {
    startThermostat({ targetTemperature, hysteresis });
    res.json({ status: 'started' });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar el termostato' });
  }
});

// Detener termostato
router.post('/api/thermostat/stop', (_req, res) => {
  try {
    stopThermostat();
    res.json({ status: 'stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Error al detener el termostato' });
  }
});

export default router;