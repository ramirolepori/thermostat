import { Router } from 'express';
import { getTemperature } from '../hardware/sensor';
import { turnOnRelay, turnOffRelay, getRelayState } from '../hardware/relay';
import { setTargetTemperature, startThermostat, stopThermostat, setHysteresis } from '../services/logic';

const router = Router();

// Ruta de temperatura simulada
router.get('/api/temperature', (_req, res) => {
  const temp = getTemperature();
  res.json({ temperature: temp });
});

// Estado caldera
router.get('/api/status', (_req, res) => {
  res.json({ status: getRelayState() ? 'on' : 'off' });
});

// Encender o apagar la caldera
router.post('/api/relay', (req, res) => {
  const { state } = req.body;

  if (state === 'on') {
    turnOnRelay();
    res.json({ status: 'on' });
  } else if (state === 'off') {
    turnOffRelay();
    res.json({ status: 'off' });
  } else {
    res.status(400).json({ error: 'Invalid state. Use "on" or "off".' });
  }
});

// Obtener temperatura objetivo
router.get('/api/target-temperature', (_req, res) => {
  // Importamos la configuración actual desde el servicio logic
  // Esta llamada deberá implementarse en logic.ts
  try {
    const targetTemperature = 22; // Este valor debería venir del servicio
    res.json({ targetTemperature });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener temperatura objetivo' });
  }
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