import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const W1_PATH = '/sys/bus/w1/devices';
const SENSOR_PREFIX = '28-';

function getSensorPath(): string | null {
  const devices = readdirSync(W1_PATH);
  const sensorFolder = devices.find((name) => name.startsWith(SENSOR_PREFIX));
  return sensorFolder ? join(W1_PATH, sensorFolder, 'w1_slave') : null;
}

export function getTemperature(): number {
  const sensorPath = getSensorPath();
  if (!sensorPath) {
    console.error('Sensor DS18B20 no encontrado');
    return NaN;
  }

  try {
    const data = readFileSync(sensorPath, 'utf-8');
    const match = data.match(/t=(\d+)/);
    if (match) {
      const tempC = parseInt(match[1], 10) / 1000;
      return tempC;
    } else {
      console.error('No se pudo leer la temperatura');
      return NaN;
    }
  } catch (error) {
    console.error('Error leyendo el sensor:', error);
    return NaN;
  }
}
