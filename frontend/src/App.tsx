import { useEffect, useState } from 'react';
import { getTemperature, turnRelay } from './api';

function App() {
  const [temp, setTemp] = useState<number | null>(null);

  useEffect(() => {
    const fetchTemp = async () => {
      const t = await getTemperature();
      setTemp(t);
    };
    fetchTemp();
  }, []);

  return (
    <div>
      <h1>Caldera SMART</h1>
      <p>Temperatura actual: {temp?.toFixed(2)} °C</p>
      <button onClick={() => turnRelay(true)}>Encender caldera</button>
      <button onClick={() => turnRelay(false)}>Apagar caldera</button>
    </div>
  );
}

export default App;
