// src/api/thermostatBackend.ts

// Obtener la temperatura actual desde el backend
export async function getTemperature(): Promise<number> {
  const res = await fetch('/api/temperature');
  const data = await res.json();
  return data.temperature;
}

// Obtener el estado actual del relé (ON / OFF)
export async function getRelayState(): Promise<'on' | 'off'> {
  const res = await fetch('/api/status');
  const data = await res.json();
  return data.state;
}

// Encender la caldera (activar relé)
export async function turnOnRelay(): Promise<void> {
  await fetch('/api/relay/on', { method: 'POST' });
}

// Apagar la caldera (desactivar relé)
export async function turnOffRelay(): Promise<void> {
  await fetch('/api/relay/off', { method: 'POST' });
}

// (Opcional) Setear temperatura objetivo
export async function setTargetTemperature(target: number): Promise<void> {
  await fetch('/api/target-temperature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target }),
  });
}

// (Opcional) Obtener temperatura objetivo
export async function getTargetTemperature(): Promise<number> {
  const res = await fetch('/api/target-temperature');
  const data = await res.json();
  return data.target;
}
