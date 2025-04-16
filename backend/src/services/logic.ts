import { getTemperature } from "../hardware/sensor";
import { turnOnRelay, turnOffRelay, getRelayState, toggleRelay } from "../hardware/relay";

// Configuración del termostato
interface ThermostatConfig {
  targetTemperature: number; // Temperatura objetivo deseada
  hysteresis: number; // Diferencial para evitar ciclos frecuentes
  checkIntervalMs: number; // Intervalo para revisar la temperatura
  maxConsecutiveErrors: number; // Máximo de errores consecutivos permitidos
}

// Estado del termostato
interface ThermostatState {
  currentTemperature: number; // Temperatura actual
  targetTemperature: number; // Temperatura objetivo
  hysteresis: number; // Histéresis configurada
  isHeating: boolean; // Estado de la calefacción
  lastUpdated: Date; // Última actualización del estado
  isRunning: boolean; // Si el termostato está activo o no
  lastError: string | null; // Último error ocurrido
  consecutiveErrors: number; // Contador de errores consecutivos
}

// Valores predeterminados
const DEFAULT_CONFIG: ThermostatConfig = {
  targetTemperature: 22, // 22°C por defecto
  hysteresis: 1.5, // Diferencial de 1.5°C
  checkIntervalMs: 1000, // Revisar cada 1 segundo (antes 5 segundos)
  maxConsecutiveErrors: 5, // Máximo de errores consecutivos antes de apagar el sistema
};

// Estado inicial
let thermostatState: ThermostatState = {
  currentTemperature: 0,
  targetTemperature: DEFAULT_CONFIG.targetTemperature,
  hysteresis: DEFAULT_CONFIG.hysteresis,
  isHeating: false,
  lastUpdated: new Date(),
  isRunning: false,
  lastError: null,
  consecutiveErrors: 0,
};

let thermostatConfig: ThermostatConfig = { ...DEFAULT_CONFIG };
let thermostatInterval: NodeJS.Timeout | null = null;
let lastControlAction = Date.now(); // Rastrear la última vez que se tomó una acción de control

// Evento que se dispara cuando se detecta un error crítico
type ErrorHandler = (error: string) => void;
const errorHandlers: ErrorHandler[] = [];

/**
 * Registra un manejador para eventos de error crítico
 */
export function onCriticalError(handler: ErrorHandler): void {
  errorHandlers.push(handler);
}

/**
 * Inicia el termostato con la configuración proporcionada
 */
export function startThermostat(config: Partial<ThermostatConfig> = {}): boolean {
  try {
    // Actualizar configuración con los valores proporcionados
    thermostatConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Solo iniciar si no está ya corriendo
    if (!thermostatState.isRunning) {
      console.log(
        `Iniciando termostato con temperatura objetivo: ${thermostatConfig.targetTemperature}°C`
      );
      console.log(`Histéresis configurada a: ${thermostatConfig.hysteresis}°C`);

      // Inicializar el estado
      thermostatState.lastError = null;
      thermostatState.consecutiveErrors = 0;
      const initialUpdateSuccess = updateCurrentState();
      
      if (!initialUpdateSuccess) {
        console.warn("Advertencia: No se pudo leer la temperatura inicial, iniciando con valores predeterminados");
      }

      // Iniciar el intervalo para revisar la temperatura periódicamente
      thermostatInterval = setInterval(() => {
        const stateUpdateSuccess = updateCurrentState();
        if (stateUpdateSuccess) {
          thermostatState.consecutiveErrors = 0; // Resetear contador de errores tras éxito
          controlHeating();
        } else {
          thermostatState.consecutiveErrors++;
          console.error(`Error consecutivo #${thermostatState.consecutiveErrors} al actualizar estado`);
          
          // Si hay demasiados errores consecutivos, apagar el sistema por seguridad
          if (thermostatState.consecutiveErrors >= thermostatConfig.maxConsecutiveErrors) {
            const errorMsg = `Demasiados errores consecutivos (${thermostatState.consecutiveErrors}), apagando termostato por seguridad`;
            console.error(errorMsg);
            notifyCriticalError(errorMsg);
            stopThermostat();
          }
        }
      }, thermostatConfig.checkIntervalMs);

      thermostatState.isRunning = true;
      return true;
    } else {
      console.log("El termostato ya está en funcionamiento");
      return true;
    }
  } catch (error) {
    const errorMsg = `Error al iniciar el termostato: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    thermostatState.lastError = errorMsg;
    return false;
  }
}

/**
 * Detiene el termostato y apaga la calefacción
 */
export function stopThermostat(): boolean {
  try {
    if (thermostatState.isRunning && thermostatInterval) {
      clearInterval(thermostatInterval);
      thermostatInterval = null;

      // Asegurar que la calefacción esté apagada al detener
      let relayTurnedOff = true;
      if (thermostatState.isHeating) {
        relayTurnedOff = turnOffRelay();
        thermostatState.isHeating = false;
      }

      thermostatState.isRunning = false;
      console.log("Termostato detenido");
      
      return relayTurnedOff;
    }
    return true;
  } catch (error) {
    const errorMsg = `Error al detener el termostato: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    thermostatState.lastError = errorMsg;
    return false;
  }
}

/**
 * Actualiza la temperatura objetivo
 */
export function setTargetTemperature(temperature: number): boolean {
  try {
    // Validar rango de temperatura
    if (temperature < 5 || temperature > 30) {
      throw new Error(`Temperatura fuera de rango válido: ${temperature}°C (debe estar entre 5-30°C)`);
    }
    
    thermostatConfig.targetTemperature = temperature;
    console.log(`Temperatura objetivo actualizada a: ${temperature}°C`);

    // Si el termostato está ejecutándose, actualizar estado y verificar calefacción
    if (thermostatState.isRunning) {
      updateCurrentState();
      controlHeating();
    }
    return true;
  } catch (error) {
    const errorMsg = `Error al configurar temperatura objetivo: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    thermostatState.lastError = errorMsg;
    return false;
  }
}

/**
 * Devuelve la temperatura objetivo
 */
export function getTargetTemperature(): number {
  return thermostatConfig.targetTemperature;
}

/**
 * Actualiza la configuración de histéresis
 */
export function setHysteresis(hysteresis: number): boolean {
  try {
    if (hysteresis <= 0 || hysteresis > 5) {
      throw new Error(`Valor de histéresis inválido: ${hysteresis} (debe estar entre 0.1-5°C)`);
    }
    
    thermostatConfig.hysteresis = hysteresis;
    console.log(`Histéresis actualizada a: ${hysteresis}°C`);
    return true;
  } catch (error) {
    const errorMsg = `Error al configurar histéresis: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    thermostatState.lastError = errorMsg;
    return false;
  }
}

export function getHysteresis(): number {
  return thermostatConfig.hysteresis;
}

/**
 * Obtiene el estado actual del termostato
 */
export function getThermostatState(): ThermostatState {
  try {
    // Intentar obtener la temperatura actual
    try {
      const temperature = getTemperature();
      thermostatState.currentTemperature = temperature;
    } catch (error) {
      console.error("Error al leer la temperatura:", error);
      // No actualizamos la temperatura en caso de error, mantenemos el último valor válido
    }
    
    thermostatState.isHeating = getRelayState();
    thermostatState.targetTemperature = thermostatConfig.targetTemperature;
    thermostatState.hysteresis = thermostatConfig.hysteresis;
    thermostatState.lastUpdated = new Date();
    
    // Devolver una copia del objeto para evitar modificaciones externas
    return { ...thermostatState };
  } catch (error) {
    console.error("Error al obtener estado del termostato:", error);
    return { ...thermostatState };
  }
}

/**
 * Obtiene la configuración actual del termostato
 */
export function getThermostatConfig(): ThermostatConfig {
  return { ...thermostatConfig };
}

/**
 * Obtiene el último error registrado
 */
export function getLastError(): string | null {
  return thermostatState.lastError;
}

/**
 * Reinicia el sistema de termostato (útil tras errores)
 */
export function resetThermostat(): boolean {
  const wasRunning = thermostatState.isRunning;
  const targetTemp = thermostatConfig.targetTemperature;
  const hysteresis = thermostatConfig.hysteresis;
  
  const stopSuccess = stopThermostat();
  if (!stopSuccess) {
    return false;
  }
  
  // Reiniciar contadores de error
  thermostatState.consecutiveErrors = 0;
  thermostatState.lastError = null;
  
  // Reiniciar sólo si estaba activo anteriormente
  if (wasRunning) {
    return startThermostat({
      targetTemperature: targetTemp,
      hysteresis: hysteresis
    });
  }
  
  return true;
}

// Funciones internas

/**
 * Notifica a los manejadores registrados sobre un error crítico
 */
function notifyCriticalError(errorMessage: string): void {
  errorHandlers.forEach(handler => {
    try {
      handler(errorMessage);
    } catch (error) {
      console.error("Error al ejecutar manejador de errores:", error);
    }
  });
}

/**
 * Actualiza el estado actual leyendo la temperatura del sensor
 * @returns boolean indicando si la actualización fue exitosa
 */
function updateCurrentState(): boolean {
  try {
    // Intentar leer la temperatura del sensor DS18B20
    const temperature = getTemperature();
    
    thermostatState.currentTemperature = temperature;
    thermostatState.isHeating = getRelayState();
    thermostatState.lastUpdated = new Date();
    return true;
  } catch (error) {
    const errorMsg = `Error al actualizar estado: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    thermostatState.lastError = errorMsg;
    return false;
  }
}

/**
 * Controla la calefacción según la temperatura y la histéresis
 */
function controlHeating(): void {
  try {
    const { targetTemperature, hysteresis } = thermostatConfig;
    const { currentTemperature, isHeating } = thermostatState;
    const now = Date.now();
    
    // Calcular límites de activación/desactivación
    const lowerLimit = targetTemperature - hysteresis;
    const upperLimit = targetTemperature;

    // Prevenir cambios de estado demasiado frecuentes (mínimo 30 segundos entre acciones)
    const minActionInterval = 30000; // 30 segundos
    if (now - lastControlAction < minActionInterval) {
      return;
    }

    // Implementación de histéresis para control de calefacción
    if (isHeating) {
      // Si está calentando, verificar si alcanzó la temperatura objetivo
      if (currentTemperature >= upperLimit) {
        const success = turnOffRelay();
        if (success) {
          thermostatState.isHeating = false;
          lastControlAction = now;
          console.log(
            `Apagando calefacción: Temperatura actual ${currentTemperature}°C alcanzó el objetivo ${upperLimit}°C`
          );
        } else {
          console.error(`Error al intentar apagar el relé a ${upperLimit}°C`);
          thermostatState.lastError = "Error al intentar apagar la calefacción";
        }
      }
    } else {
      // Si está apagado, verificar si debe encender
      if (currentTemperature < lowerLimit) {
        const success = turnOnRelay();
        if (success) {
          thermostatState.isHeating = true;
          lastControlAction = now;
          console.log(
            `Encendiendo calefacción: Temperatura actual ${currentTemperature}°C por debajo del límite inferior ${lowerLimit}°C`
          );
        } else {
          console.error(`Error al intentar encender el relé a ${lowerLimit}°C`);
          thermostatState.lastError = "Error al intentar encender la calefacción";
        }
      }
    }
  } catch (error) {
    const errorMsg = `Error al controlar calefacción: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    thermostatState.lastError = errorMsg;
  }
}
