// src/api/thermostatBackend.ts

// Interfaces de respuesta
interface TemperatureResponse {
  temperature: number;
}

interface StatusResponse {
  currentTemperature: number;
  targetTemperature: number;
  hysteresis: number;
  isHeating: boolean;
  lastUpdated: Date; // Changed from new Date() to Date
  isRunning: boolean;
}

interface TargetTemperatureResponse {
  target: number;
}

// Headers comunes
const jsonHeaders = {
  'Content-Type': 'application/json',
};

// Obtener la temperatura actual desde el backend
export async function getTemperature(): Promise<number> {
  try {
    const res = await fetch('/api/temperature');
    if (!res.ok) throw new Error('Error al obtener temperatura');
    const data: TemperatureResponse = await res.json();
    return data.temperature;
  } catch (error) {
    console.error('getTemperature:', error);
    return NaN;
  }
}

// Obtener el estado del termostato
export async function getStatus(): Promise<StatusResponse> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Error al obtener estado');
    
    // Procesar directamente la respuesta ya que el backend ahora devuelve el formato correcto
    const data = await res.json();
    
    // Asegurarse de que lastUpdated sea una instancia de Date
    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated)
    };
  } catch (error) {
    console.error('getStatus:', error);
    return { 
      currentTemperature: NaN, 
      targetTemperature: NaN, 
      hysteresis: NaN, 
      isHeating: false, 
      lastUpdated: new Date(), 
      isRunning: false 
    };
  }
}

// Setear temperatura objetivo
export async function setTargetTemperature(target: number): Promise<boolean> {
  try {
    const res = await fetch('/api/target-temperature', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ temperature: target }),
    });
    if (!res.ok) throw new Error('Error al setear temperatura objetivo');
    return true;
  } catch (error) {
    console.error('setTargetTemperature:', error);
    return false;
  }
}

// Obtener temperatura objetivo
export async function getTargetTemperature(): Promise<number | undefined> {
  try {
    const res = await fetch('/api/target-temperature');
    if (!res.ok) throw new Error('Error al obtener temperatura objetivo');
    const data: TargetTemperatureResponse = await res.json();
    return data.target;
  } catch (error) {
    console.error('getTargetTemperature:', error);
    return undefined;
  }
}

// Iniciar termostato
export async function startThermostat(target: number): Promise<boolean> {
  try {
    const res = await fetch('/api/target-temperature', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ temperature: target }),
    });
    if (!res.ok) throw new Error('Error al setear temperatura objetivo');
    return true;
  } catch (error) {
    console.error('setTargetTemperature:', error);
    return false;
  }
}
