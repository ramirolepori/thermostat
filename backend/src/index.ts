import express from 'express';
import { getTemperature } from './sensor';
import { turnOnRelay, turnOffRelay } from './relay';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/temperature', (_req, res) => {
  const temp = getTemperature();
  res.json({ temperature: temp });
});

app.post('/relay/on', (_req, res) => {
  turnOnRelay();
  res.json({ status: 'on' });
});

app.post('/relay/off', (_req, res) => {
  turnOffRelay();
  res.json({ status: 'off' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
