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
    if (!res.ok) throw new Error(`Error al obtener temperatura: ${res.status} ${res.statusText}`);
    
    // Depuración: verificar el contenido de la respuesta
    const text = await res.text();
    console.debug('Respuesta de /api/temperature:', text);
    
    // Intentar analizar la respuesta como JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Error parseando JSON en getTemperature:', parseError);
      return NaN;
    }
    
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
    if (!res.ok) throw new Error(`Error al obtener estado: ${res.status} ${res.statusText}`);
    
    // Depuración: verificar el contenido de la respuesta antes de intentar analizarlo
    const text = await res.text();
    console.debug('Respuesta de /api/status:', text);
    
    // Intentar analizar la respuesta como JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError);
      // Si no es JSON válido, devolver valores por defecto
      return { 
        currentTemperature: NaN, 
        targetTemperature: NaN, 
        hysteresis: NaN, 
        isHeating: false, 
        lastUpdated: new Date(), 
        isRunning: false 
      };
    }
    
    // Asegurarse de que lastUpdated sea una instancia de Date
    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated || Date.now())
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
    if (!res.ok) throw new Error(`Error al obtener temperatura objetivo: ${res.status} ${res.statusText}`);
    
    // Depuración: verificar el contenido de la respuesta antes de intentar analizarlo
    const text = await res.text();
    console.debug('Respuesta de /api/target-temperature:', text);
    
    // Intentar analizar la respuesta como JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Error parseando JSON en getTargetTemperature:', parseError);
      // Si no es JSON válido, devolver undefined
      return undefined;
    }
    
    return data.target;
  } catch (error) {
    console.error('getTargetTemperature:', error);
    return undefined;
  }
}

// Iniciar termostato
export async function startThermostat(targetTemperature?: number, hysteresis?: number): Promise<boolean> {
  try {
    const res = await fetch('/api/thermostat/start', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ temperature: targetTemperature, hysteresis: hysteresis }),
    });
    if (!res.ok) throw new Error('Error al setear temperatura objetivo');
    return true;
  } catch (error) {
    console.error('startThermostat:', error);
    return false;
  }
}

// Detiene el termostato
export async function stopThermostat(): Promise<boolean> {
  try {
    const res = await fetch('/api/thermostat/stop', {
      method: 'POST',
      headers: jsonHeaders,
    });
    if (!res.ok) throw new Error('Error al detener el termostato');
    return true;
  } catch (error) {
    console.error('stopThermostat:', error);
    return false;
  }
}
