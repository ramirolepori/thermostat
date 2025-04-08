import express from 'express';
import cors from 'cors';
import { getTemperature } from './sensor';
import { turnOnRelay, turnOffRelay } from './relay';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Ruta de temperatura simulada
app.get('/api/temperature', (_req, res) => {
  const temp  =  getTemperature();
  res.json({ temperature: temp });
});

// Encender caldera
app.post('/api/relay/on', (_req, res) => {
  turnOnRelay();
  console.log('🔥 Caldera encendida');
  // Acá iría el control del GPIO para activar el relé
  res.json({ status: 'on' });
});

// Apagar caldera
app.post('/api/relay/off', (_req, res) => {
  turnOffRelay();
  console.log('❄️ Caldera apagada');
  // Acá iría el control del GPIO para desactivar el relé
  res.json({ status: 'off' });
});

app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});
