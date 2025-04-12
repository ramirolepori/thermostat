import { getTemperature } from '../hardware/sensor';
import { turnOnRelay, turnOffRelay, getRelayState } from '../hardware/relay';

// Configuración del termostato
interface ThermostatConfig {
  targetTemperature: number;     // Temperatura objetivo deseada
  hysteresis: number;            // Diferencial para evitar ciclos frecuentes
  checkIntervalMs: number;       // Intervalo para revisar la temperatura
}

// Estado del termostato
interface ThermostatState {
  currentTemperature: number;    // Temperatura actual
  isHeating: boolean;            // Estado de la calefacción
  lastUpdated: Date;             // Última actualización del estado
  isRunning: boolean;            // Si el termostato está activo o no
}

// Valores predeterminados
const DEFAULT_CONFIG: ThermostatConfig = {
  targetTemperature: 22,         // 22°C por defecto
  hysteresis: 1.5,               // Diferencial de 1.5°C
  checkIntervalMs: 5000,        // Revisar cada 5 segundos
};

// Estado inicial
let thermostatState: ThermostatState = {
  currentTemperature: 0,
  isHeating: false,
  lastUpdated: new Date(),
  isRunning: false,
};

let thermostatConfig: ThermostatConfig = { ...DEFAULT_CONFIG };
let thermostatInterval: NodeJS.Timeout | null = null;

/**
 * Inicia el termostato con la configuración proporcionada
 */
export function startThermostat(config: Partial<ThermostatConfig> = {}): void {
  // Actualizar configuración con los valores proporcionados
  thermostatConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  
  // Solo iniciar si no está ya corriendo
  if (!thermostatState.isRunning) {
    console.log(`Iniciando termostato con temperatura objetivo: ${thermostatConfig.targetTemperature}°C`);
    console.log(`Histéresis configurada a: ${thermostatConfig.hysteresis}°C`);
    
    // Inicializar el estado
    updateCurrentState();
    
    // Iniciar el intervalo para revisar la temperatura periódicamente
    thermostatInterval = setInterval(() => {
      updateCurrentState();
      controlHeating();
    }, thermostatConfig.checkIntervalMs);
    
    thermostatState.isRunning = true;
  } else {
    console.log('El termostato ya está en funcionamiento');
  }
}

/**
 * Detiene el termostato y apaga la calefacción
 */
export function stopThermostat(): void {
  if (thermostatState.isRunning && thermostatInterval) {
    clearInterval(thermostatInterval);
    thermostatInterval = null;
    
    // Asegurar que la calefacción esté apagada al detener
    if (thermostatState.isHeating) {
      turnOffRelay();
      thermostatState.isHeating = false;
    }
    
    thermostatState.isRunning = false;
    console.log('Termostato detenido');
  }
}

/**
 * Actualiza la temperatura objetivo
 */
export function setTargetTemperature(temperature: number): void {
  thermostatConfig.targetTemperature = temperature;
  console.log(`Temperatura objetivo actualizada a: ${temperature}°C`);
  
  // Si el termostato está ejecutándose, actualizar estado y verificar calefacción
  if (thermostatState.isRunning) {
    updateCurrentState();
    controlHeating();
  }
}

/**
 * Actualiza la configuración de histéresis
 */
export function setHysteresis(hysteresis: number): void {
  if (hysteresis > 0) {
    thermostatConfig.hysteresis = hysteresis;
    console.log(`Histéresis actualizada a: ${hysteresis}°C`);
  } else {
    console.error('La histéresis debe ser un valor positivo');
  }
}

/**
 * Obtiene el estado actual del termostato
 */
export function getThermostatState(): ThermostatState {
  updateCurrentState(); // Actualizar para tener la información más reciente
  return { ...thermostatState };
}

/**
 * Obtiene la configuración actual del termostato
 */
export function getThermostatConfig(): ThermostatConfig {
  return { ...thermostatConfig };
}

// Funciones internas

/**
 * Actualiza el estado actual leyendo la temperatura del sensor
 */
function updateCurrentState(): void {
  const temperature = getTemperature();
  
  if (!isNaN(temperature)) {
    thermostatState.currentTemperature = temperature;
    thermostatState.isHeating = getRelayState();
    thermostatState.lastUpdated = new Date();
  } else {
    console.error('Error: No se pudo leer la temperatura');
  }
}

/**
 * Controla la calefacción según la temperatura y la histéresis
 */
function controlHeating(): void {
  const { targetTemperature, hysteresis } = thermostatConfig;
  const { currentTemperature, isHeating } = thermostatState;
  
  // Calcular límites de activación/desactivación
  const lowerLimit = targetTemperature - hysteresis;
  const upperLimit = targetTemperature;
  
  // Implementación de histéresis para control de calefacción
  if (isHeating) {
    // Si está calentando, verificar si alcanzó la temperatura objetivo
    if (currentTemperature >= upperLimit) {
      turnOffRelay();
      thermostatState.isHeating = false;
      console.log(`Apagando calefacción: Temperatura actual ${currentTemperature}°C alcanzó el objetivo ${upperLimit}°C`);
    }
  } else {
    // Si está apagado, verificar si debe encender
    if (currentTemperature < lowerLimit) {
      turnOnRelay();
      thermostatState.isHeating = true;
      console.log(`Encendiendo calefacción: Temperatura actual ${currentTemperature}°C por debajo del límite inferior ${lowerLimit}°C`);
    }
  }
}