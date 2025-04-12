// src/api/thermostatBackend.ts

// Interfaces de respuesta
interface TemperatureResponse {
  temperature: number;
}

interface RelayStateResponse {
  state: 'on' | 'off';
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

// Obtener el estado actual del relé (ON / OFF)
export async function getRelayState(): Promise<'on' | 'off' | undefined> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Error al obtener estado del relé');
    const data: RelayStateResponse = await res.json();
    return data.state;
  } catch (error) {
    console.error('getRelayState:', error);
    return undefined;
  }
}

// Encender la caldera (activar relé)
export async function turnOnRelay(): Promise<boolean> {
  try {
    const res = await fetch('/api/relay/on', { method: 'POST' });
    if (!res.ok) throw new Error('Error al encender relé');
    return true;
  } catch (error) {
    console.error('turnOnRelay:', error);
    return false;
  }
}

// Apagar la caldera (desactivar relé)
export async function turnOffRelay(): Promise<boolean> {
  try {
    const res = await fetch('/api/relay/off', { method: 'POST' });
    if (!res.ok) throw new Error('Error al apagar relé');
    return true;
  } catch (error) {
    console.error('turnOffRelay:', error);
    return false;
  }
}

// (Opcional) Setear temperatura objetivo
export async function setTargetTemperature(target: number): Promise<boolean> {
  try {
    const res = await fetch('/api/target-temperature', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ target }),
    });
    if (!res.ok) throw new Error('Error al setear temperatura objetivo');
    return true;
  } catch (error) {
    console.error('setTargetTemperature:', error);
    return false;
  }
}

// (Opcional) Obtener temperatura objetivo
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
