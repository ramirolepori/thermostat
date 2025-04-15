import { Gpio } from 'onoff';
import { platform } from 'os';
import { existsSync } from 'fs';

// Constantes para mejorar legibilidad y mantenibilidad
const GPIO_PIN = 17;     // GPIO 17 (pin 11) como salida
const RELAY_ON = 0;      // Valor para activar el relé (lógica inversa)
const RELAY_OFF = 1;     // Valor para desactivar el relé

// Estado de simulación
const isWindowsOS = platform() === 'win32';
// Verificar si los GPIO están disponibles en sistemas Linux
const isGpioAvailable = !isWindowsOS && existsSync('/sys/class/gpio');
let simulationMode = isWindowsOS || !isGpioAvailable;

// Inicialización del relé con manejo de errores
let relay: Gpio | any;
let relayState = false;  // Estado del relé (encendido/apagado)

// Crear un objeto simulado para entornos donde GPIO no esté disponible
const createSimulatedRelay = () => {
  console.log(`Modo simulación activado para el relé (Sistema: ${platform()}${!isWindowsOS ? ', GPIO no disponible o sin permisos' : ''})`);
  return {
    writeSync: (value: number) => {
      const state = value === RELAY_ON ? 'ENCENDIDO' : 'APAGADO';
      console.log(`SIMULACIÓN: Relé ${state}`);
      return true;
    },
    unexport: () => console.log('SIMULACIÓN: Relé liberado')
  } as unknown as Gpio;
};

try {
  if (simulationMode) {
    relay = createSimulatedRelay();
  } else {
    // En sistemas Linux (Raspberry Pi), verificar permisos y disponibilidad antes de inicializar
    try {
      // Intentar inicializar el GPIO
      relay = new Gpio(GPIO_PIN, 'out');
      // Asegurar que el relé comienza en estado apagado
      relay.writeSync(RELAY_OFF);
      console.log(`Relé inicializado correctamente en GPIO ${GPIO_PIN}`);
    } catch (gpioError: any) {
      // Si hay un error específico de permisos, mostrarlo claramente
      if (gpioError.code === 'EACCES') {
        console.error(`Error de permisos en GPIO ${GPIO_PIN}. Ejecute con sudo o agregue el usuario al grupo gpio.`);
      } else if (gpioError.code === 'EINVAL') {
        console.error(`Error al configurar GPIO ${GPIO_PIN}: Argumento inválido. Verifique que el pin esté disponible y no esté en uso.`);
      }
      
      // Lanzar el error para que sea capturado por el bloque principal
      throw gpioError;
    }
  }
} catch (error) {
  console.error(`Error al inicializar el relé en GPIO ${GPIO_PIN}:`, error);
  // Si falla, cambiar a modo simulación
  simulationMode = true;
  relay = createSimulatedRelay();
}

export function turnOnRelay(): boolean {
  try {
    relay.writeSync(RELAY_ON);
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
    relay.writeSync(RELAY_OFF);
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

// Liberar el GPIO al salir (solo si no estamos en modo simulación)
process.on('SIGINT', () => {
  relay.writeSync(RELAY_OFF); // Asegurar que el relé queda apagado
  if (!simulationMode) {
    relay.unexport();         // Liberar el GPIO solo en modo real
  }
  console.log("\nGPIO liberado, saliendo...");
  process.exit(0);
});

// También manejar otros eventos de terminación
['SIGTERM', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => {
    relay.writeSync(RELAY_OFF);
    if (!simulationMode) {
      relay.unexport();
    }
    console.log(`\nGPIO liberado por señal ${signal}, saliendo...`);
    process.exit(0);
  });
});
