let relayState: boolean = false; // Estado del relé (encendido/apagado)

export function turnOnRelay(): void {
  relayState = true; // Cambia el estado del relé a encendido
  // Aquí iría el código para activar el GPIO del relé real  
  console.log("Relé encendido (simulado)");
  }
  
  export function turnOffRelay(): void {
    relayState = false; // Cambia el estado del relé a apagado
    // Aquí iría el código para desactivar el GPIO del relé real
    console.log("Relé apagado (simulado)");
  }
  
  export function getRelayState(): boolean {
    return relayState; // Devuelve el estado actual del relé
  }
  