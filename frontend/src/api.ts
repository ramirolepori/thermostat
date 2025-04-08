export async function getTemperature(): Promise<number> {
    const res = await fetch('/api/temperature');
    const data = await res.json();
    return data.temperature;
  }
  
  export async function turnRelay(on: boolean): Promise<void> {
    const endpoint = on ? '/api/relay/on' : '/api/relay/off';
    await fetch(endpoint, { method: 'POST' });
  }
  