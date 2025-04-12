import express from 'express';
import cors from 'cors';
import { getTemperature } from './sensor';
import { turnOnRelay, turnOffRelay, getRelayState } from './relay';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Ruta de temperatura simulada
app.get('/api/temperature', (_req, res) => {
  const temp  =  getTemperature();
  res.json({ temperature: temp });
});

// Estado caldera
app.get('/api/status', (_req, res) => {
  res.json({ status: getRelayState() ? 'on' : 'off' });
});

// Encender o apagar la caldera
app.post('/api/relay', (req, res) => {
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


app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});
