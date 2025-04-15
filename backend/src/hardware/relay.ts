import { platform } from 'os';

// Usar pigpio solo en Linux/Raspberry Pi
let Gpio: any;
if (platform() !== 'win32') {
  try {
    Gpio = require('pigpio').Gpio;
  } catch (e) {
    console.error('No se pudo cargar pigpio:', e);
  }
}

const GPIO_PIN = 17;     // GPIO 17 (pin 11) como salida
const RELAY_ON = 0;      // Valor para activar el relé (lógica inversa)
const RELAY_OFF = 1;     // Valor para desactivar el relé

const isWindowsOS = platform() === 'win32';
let simulationMode = isWindowsOS || !Gpio;

let relay: any;
let relayState = false;

const createSimulatedRelay = () => ({
  digitalWrite: (value: number) => {
    const state = value === RELAY_ON ? 'ENCENDIDO' : 'APAGADO';
    console.log(`SIMULACIÓN: Relé ${state}`);
    return true;
  },
  mode: (_: any) => {},
  unexport: () => console.log('SIMULACIÓN: Relé liberado')
});

try {
  if (simulationMode) {
    relay = createSimulatedRelay();
    console.log(`Modo simulación activado para el relé (Sistema: ${platform()})`);
  } else {
    relay = new Gpio(GPIO_PIN, {mode: Gpio.OUTPUT});
    relay.digitalWrite(RELAY_OFF); // Apagar relé al iniciar
    console.log(`Relé inicializado correctamente en GPIO ${GPIO_PIN} usando pigpio`);
  }
} catch (error) {
  console.error(`Error al inicializar el relé en GPIO ${GPIO_PIN}:`, error);
  simulationMode = true;
  relay = createSimulatedRelay();
}

export function turnOnRelay(): boolean {
  try {
    relay.digitalWrite(RELAY_ON);
    relayState = true;
    if (!simulationMode) {
      console.log("Relé encendido");
    }
    return true;
  } catch (error) {
    console.error("Error al encender el relé:", error);
    return false;
  }
}

export function turnOffRelay(): boolean {
  try {
    relay.digitalWrite(RELAY_OFF);
    relayState = false;
    if (!simulationMode) {
      console.log("Relé apagado");
    }
    return true;
  } catch (error) {
    console.error("Error al apagar el relé:", error);
    return false;
  }
}

export function getRelayState(): boolean {
  return relayState;
}

export function toggleRelay(): boolean {
  return relayState ? turnOffRelay() : turnOnRelay();
}

process.on('SIGINT', () => {
  relay.digitalWrite(RELAY_OFF);
  if (!simulationMode && relay.unexport) {
    relay.unexport();
  }
  console.log("\nGPIO liberado, saliendo...");
  process.exit(0);
});

['SIGTERM', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => {
    relay.digitalWrite(RELAY_OFF);
    if (!simulationMode && relay.unexport) {
      relay.unexport();
    }
    console.log(`\nGPIO liberado por señal ${signal}, saliendo...`);
    process.exit(0);
  });
});
