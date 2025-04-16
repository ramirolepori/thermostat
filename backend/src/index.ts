import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes/routes';
import { startThermostat } from './services/logic';
import { cpus, networkInterfaces } from 'os';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Escuchar en todas las interfaces de red
const isProd = process.env.NODE_ENV === 'production';

// Función para obtener la IP del dispositivo
function getLocalIP(): string {
  const nets = networkInterfaces();
  let localIP = 'localhost';
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Omitir interfaces loopback e IPv6
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        return localIP;
      }
    }
  }
  
  return localIP;
}

// Aplicar middleware de seguridad básica (solo en producción)
if (isProd) {
  app.use(helmet());
}

// Middleware para comprimir respuestas
app.use(compression());

// Configurar CORS con opciones más específicas
app.use(cors({
  origin: '*', // Permitir solicitudes desde cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cachear preflight requests por 24 horas
}));

// Parsear JSON con límite para evitar ataques de payload grandes
app.use(express.json({ limit: '100kb' }));

// Timeout extendido para conexiones lentas
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).send('Request timeout');
  });
  next();
});

// Cache control para respuestas estáticas
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutos
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

// Logging sencillo
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) { // Solo logear peticiones lentas
      console.log(`[SLOW] ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
  });
  next();
});

// Montar las rutas
app.use(routes);

// Manejador global de errores
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`Error en ${req.method} ${req.path}:`, err.message);
  res.status(500).json({
    error: isProd ? 'Error interno del servidor' : err.message
  });
});

// Iniciar el servidor
app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`✅ Backend corriendo en http://${HOST === '0.0.0.0' ? localIP : HOST}:${PORT} (${isProd ? 'producción' : 'desarrollo'})`);
  console.log(`✅ Servidor optimizado para ${cpus().length} CPU(s)`);
  
  // Iniciar el termostato con la configuración predeterminada
  startThermostat();
  console.log('✅ Termostato iniciado con configuración predeterminada');
});
