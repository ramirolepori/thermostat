import { platform } from 'os';

// Variables para controlar GPIO
let GPIO: any;
const GPIO_PIN = 17;     // GPIO 17 (pin 11) como salida
const RELAY_ON = 1;      // Valor para activar el relé (GPIO.HIGH)
const RELAY_OFF = 0;     // Valor para desactivar el relé (GPIO.LOW)

const isWindowsOS = platform() === 'win32';
let simulationMode = isWindowsOS;

let relay: any;
let relayState = false;

// Función para crear un relé simulado en Windows
const createSimulatedRelay = () => ({
  output: (value: number) => {
    const state = value === RELAY_ON ? 'ENCENDIDO' : 'APAGADO';
    console.log(`SIMULACIÓN: Relé ${state}`);
    return true;
  },
  cleanup: () => console.log('SIMULACIÓN: Relé liberado')
});

try {
  if (simulationMode) {
    relay = createSimulatedRelay();
    console.log(`Modo simulación activado para el relé (Sistema: ${platform()})`);
  } else {
    // Usar RPi.GPIO en lugar de pigpio
    GPIO = require('rpi-gpio');
    
    // Configurar el pin GPIO
    GPIO.setup(GPIO_PIN, GPIO.DIR_OUT, (err: Error) => {
      if (err) throw err;
      console.log(`GPIO ${GPIO_PIN} configurado como salida`);
      
      // Asegurar que el relé esté apagado al inicio
      GPIO.write(GPIO_PIN, RELAY_OFF, (writeErr: Error) => {
        if (writeErr) console.error(`Error al inicializar relé:`, writeErr);
        else console.log(`Relé inicializado correctamente en GPIO ${GPIO_PIN} (apagado)`);
      });
    });
    
    relay = {
      output: (value: number) => {
        return new Promise((resolve, reject) => {
          GPIO.write(GPIO_PIN, value, (err: Error) => {
            if (err) {
              console.error(`Error al cambiar estado del relé:`, err);
              reject(err);
              return false;
            }
            resolve(true);
            return true;
          });
        });
      },
      cleanup: () => GPIO.destroy()
    };
  }
} catch (error) {
  console.error(`Error al inicializar el relé en GPIO ${GPIO_PIN}:`, error);
  simulationMode = true;
  relay = createSimulatedRelay();
}

export function turnOnRelay(): boolean {
  try {
    relay.output(RELAY_ON);
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
    relay.output(RELAY_OFF);
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
  relay.output(RELAY_OFF);
  if (!simulationMode && relay.cleanup) {
    relay.cleanup();
  }
  console.log("\nGPIO liberado, saliendo...");
  process.exit(0);
});

['SIGTERM', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => {
    relay.output(RELAY_OFF);
    if (!simulationMode && relay.cleanup) {
      relay.cleanup();
    }
    console.log(`\nGPIO liberado por señal ${signal}, saliendo...`);
    process.exit(0);
  });
});
