export async function getTemperature(): Promise<number> {
    const res = await fetch('/api/temperature');
    const data = await res.json();
    return data.temperature;
  }
  
 
  