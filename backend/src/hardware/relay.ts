import { Gpio } from 'onoff';

// Constantes para mejorar legibilidad y mantenibilidad
const GPIO_PIN = 17;     // GPIO 17 (pin 11) como salida
const RELAY_ON = 0;      // Valor para activar el relé (lógica inversa)
const RELAY_OFF = 1;     // Valor para desactivar el relé

// Inicialización del relé con manejo de errores
let relay: Gpio;
let relayState = false;  // Estado del relé (encendido/apagado)

try {
  relay = new Gpio(GPIO_PIN, 'out');
  // Asegurar que el relé comienza en estado apagado
  relay.writeSync(RELAY_OFF);
} catch (error) {
  console.error(`Error al inicializar el relé en GPIO ${GPIO_PIN}:`, error);
  // Proporcionar un objeto simulado para entornos donde GPIO no esté disponible
  relay = {
    writeSync: (value: number) => console.log(`Simulación: Relé escrito con valor ${value}`),
    unexport: () => console.log('Simulación: Relé liberado')
  } as unknown as Gpio;
}

export function turnOnRelay(): boolean {
  try {
    relay.writeSync(RELAY_ON);
    relayState = true;
    console.log("Relé encendido");
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
    console.log("Relé apagado");
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

// Liberar el GPIO al salir
process.on('SIGINT', () => {
  relay.writeSync(RELAY_OFF); // Asegurar que el relé queda apagado
  relay.unexport();           // Liberar el GPIO
  console.log("\nGPIO liberado, saliendo...");
  process.exit(0);
});

// También manejar otros eventos de terminación
['SIGTERM', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => {
    relay.writeSync(RELAY_OFF);
    relay.unexport();
    console.log(`\nGPIO liberado por señal ${signal}, saliendo...`);
    process.exit(0);
  });
});
