import express from 'express';
import cors from 'cors';
import routes from './routes/routes';
import { startThermostat } from './services/logic';

const app = express();
const PORT = 3001;

// Configuración del servidor
app.use(cors());
app.use(express.json());

// Montar las rutas
app.use(routes);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
  
  // Iniciar el termostato con la configuración predeterminada
  startThermostat();
  console.log('✅ Termostato iniciado con configuración predeterminada');
});
