import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const W1_PATH = '/sys/bus/w1/devices';
const SENSOR_PREFIX = '28-';

// Para desarrollo/simulación cuando no hay hardware real disponible
let lastSimulatedTemp = 22.0; // Comienza en 22°C
let useFallbackMode = false;

// Verifica si estamos en un entorno donde el sensor está disponible
function checkSensorAvailability(): boolean {
  try {
    // Verificar si el directorio w1 existe
    if (!existsSync(W1_PATH)) {
      console.log('Directorio de sensores 1-Wire no encontrado, usando modo simulación');
      useFallbackMode = true;
      return false;
    }
    
    // Verificar si hay algún sensor conectado
    const devices = readdirSync(W1_PATH);
    const sensorFolder = devices.find((name) => name.startsWith(SENSOR_PREFIX));
    if (!sensorFolder) {
      console.log('No se encontró ningún sensor DS18B20, usando modo simulación');
      useFallbackMode = true;
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('Error al verificar disponibilidad del sensor, usando modo simulación:', error);
    useFallbackMode = true;
    return false;
  }
}

// Verificar la disponibilidad del sensor al inicio
checkSensorAvailability();

function getSensorPath(): string | null {
  if (useFallbackMode) return null;
  
  try {
    const devices = readdirSync(W1_PATH);
    const sensorFolder = devices.find((name) => name.startsWith(SENSOR_PREFIX));
    return sensorFolder ? join(W1_PATH, sensorFolder, 'w1_slave') : null;
  } catch (error) {
    console.log('Error al obtener la ruta del sensor:', error);
    return null;
  }
}

// Genera una temperatura simulada con ligeras variaciones para desarrollo
function getSimulatedTemperature(): number {
  // Simular pequeñas variaciones de temperatura (-0.2 a +0.2)
  const variation = (Math.random() * 0.4) - 0.2;
  lastSimulatedTemp += variation;
  
  // Mantener en un rango razonable (18-25°C)
  if (lastSimulatedTemp < 18) lastSimulatedTemp = 18;
  if (lastSimulatedTemp > 25) lastSimulatedTemp = 25;
  
  // Redondear a 1 decimal
  return Math.round(lastSimulatedTemp * 10) / 10;
}

export function getTemperature(): number {
  // Si estamos en modo fallback, devolver temperatura simulada
  if (useFallbackMode) {
    return getSimulatedTemperature();
  }

  const sensorPath = getSensorPath();
  if (!sensorPath) {
    console.log('Sensor DS18B20 no encontrado, devolviendo temperatura simulada');
    return getSimulatedTemperature();
  }

  try {
    const data = readFileSync(sensorPath, 'utf-8');
    const match = data.match(/t=(\d+)/);
    if (match) {
      const tempC = parseInt(match[1], 10) / 1000;
      return tempC;
    } else {
      console.log('No se pudo leer la temperatura del sensor, usando simulación');
      return getSimulatedTemperature();
    }
  } catch (error) {
    console.log('Error leyendo el sensor, usando simulación:', error);
    return getSimulatedTemperature();
  }
}
