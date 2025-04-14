// src/api/thermostatBackend.ts

// Interfaces de respuesta
interface TemperatureResponse {
  temperature: number;
}

interface StatusResponse {
  currentTemperature: number;
  targetTemperature: number;
  hysteresis: number;
  isHeating: boolean;
  lastUpdated: Date;
  isRunning: boolean;
}

interface TargetTemperatureResponse {
  target: number;
}

// Configuración de API base
const API_BASE_URL = '/api';
let isBackendAvailable = true;
let backendCheckInProgress = false;
let lastBackendCheckTime = 0;
const BACKEND_CHECK_INTERVAL = 30000; // 30 segundos
const BACKEND_CHECK_TIMEOUT = 15000; // 5 segundos

// Headers comunes
const jsonHeaders = {
  'Content-Type': 'application/json',
};

// Función para verificar si el backend está disponible
async function checkBackendAvailability(): Promise<boolean> {
  if (backendCheckInProgress) return isBackendAvailable;
  
  const now = Date.now();
  if (now - lastBackendCheckTime < BACKEND_CHECK_INTERVAL) return isBackendAvailable;
  
  try {
    backendCheckInProgress = true;
    
    // Usar un timeout más corto para evitar bloquear la UI
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_CHECK_TIMEOUT);
    
    try {
      // Usar una ruta ligera para la verificación de disponibilidad
      const res = await fetch(`${API_BASE_URL}/temperature`, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
        cache: 'no-store' // No guardar caché para este tipo de petición
      });
      
      // Limpiar el timeout
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`Backend responded with status: ${res.status}`);
      
      // Comprueba que la respuesta es realmente JSON para detectar páginas HTML de error
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Backend responded with non-JSON content');
      }
      
      await res.json(); // Confirma que la respuesta es JSON válido
      
      isBackendAvailable = true;
    } catch (error) {
      // Limpiar el timeout en caso de error
      clearTimeout(timeoutId);
      throw error; // Re-lanzar para ser capturado por el try/catch exterior
    }
  } catch (error) {
    console.error('Backend availability check failed:', error);
    isBackendAvailable = false;
  } finally {
    backendCheckInProgress = false;
    lastBackendCheckTime = Date.now();
  }
  
  return isBackendAvailable;
}

// Función base para realizar peticiones fetch con manejo de errores mejorado
async function fetchWithErrorHandling<T>(
  endpoint: string, 
  options: RequestInit = {},
  defaultValue?: T
): Promise<T> {
  // Verificar disponibilidad del backend (sólo una vez por intervalo)
  if (!await checkBackendAvailability()) {
    console.warn(`Skipping request to ${endpoint} - backend unavailable`);
    throw new Error('Backend service unavailable');
  }
  
  // Configuración por defecto
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...jsonHeaders,
      ...(options.headers || {})
    }
  };
  
  // Usar un controlador de aborto con timeout reducido
  const controller = new AbortController();
  // Reducir de 5 segundos a 2 segundos para que la interfaz no parezca bloqueada
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  
  // Asignar la señal del controlador si no hay una ya configurada
  if (!options.signal) {
    fetchOptions.signal = controller.signal;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
    
    // Limpiar el timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Verificar que es JSON antes de intentar parsearlo
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Invalid Content-Type: ${contentType} for endpoint ${endpoint}`);
      throw new Error('Invalid response format: expected JSON');
    }
    
    return await response.json();
  } catch (error) {
    // Limpiar el timeout en caso de error
    clearTimeout(timeoutId);
    
    // Mejorar los mensajes de error para errores de red
    let errorMessage = error.message || 'Unknown error';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - the server took too long to respond';
    } else if (errorMessage.includes('NetworkError') || errorMessage.includes('network')) {
      errorMessage = 'Network connection error - check your internet connection';
    }
    
    console.error(`Error in ${endpoint}:`, errorMessage);
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(errorMessage);
  }
}

// Obtener la temperatura actual desde el backend
export async function getTemperature(): Promise<number> {
  try {
    const data = await fetchWithErrorHandling<TemperatureResponse>(
      '/temperature',
      {},
      { temperature: NaN }
    );
    return data.temperature;
  } catch (error) {
    console.error('getTemperature failed:', error);
    return NaN;
  }
}

// Obtener el estado del termostato
export async function getStatus(): Promise<StatusResponse | null> {
  try {
    const defaultStatus: StatusResponse = { 
      currentTemperature: NaN, 
      targetTemperature: NaN, 
      hysteresis: NaN, 
      isHeating: false, 
      lastUpdated: new Date(), 
      isRunning: false 
    };
    
    const data = await fetchWithErrorHandling<StatusResponse>('/status', {}, defaultStatus);
    
    // Asegurarse de que lastUpdated sea una instancia de Date
    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated || Date.now())
    };
  } catch (error) {
    console.error('getStatus failed:', error);
    return null;
  }
}

// Setear temperatura objetivo
export async function setTargetTemperature(target: number): Promise<boolean> {
  try {
    await fetchWithErrorHandling('/target-temperature', {
      method: 'POST',
      body: JSON.stringify({ temperature: target }),
    });
    return true;
  } catch (error) {
    console.error('setTargetTemperature failed:', error);
    return false;
  }
}

// Obtener temperatura objetivo
export async function getTargetTemperature(): Promise<number | undefined> {
  try {
    const data = await fetchWithErrorHandling<TargetTemperatureResponse>(
      '/target-temperature',
      {},
      { target: NaN }
    );
    return data.target;
  } catch (error) {
    console.error('getTargetTemperature failed:', error);
    return undefined;
  }
}

// Iniciar termostato
export async function startThermostat(targetTemperature?: number, hysteresis?: number): Promise<boolean> {
  try {
    // Probamos con diferentes métodos HTTP ya que el error 405 indica que el método POST podría no ser permitido
    try {
      await fetchWithErrorHandling('/thermostat/start', {
        method: 'POST',
        body: JSON.stringify({ temperature: targetTemperature, hysteresis: hysteresis }),
      });
    } catch (error) {
      if (error.message?.includes('405')) {
        // Intentar con método PUT si POST falla con 405
        console.warn('POST method not allowed for thermostat/start, attempting PUT');
        await fetchWithErrorHandling('/thermostat/start', {
          method: 'PUT',
          body: JSON.stringify({ temperature: targetTemperature, hysteresis: hysteresis }),
        });
      } else {
        throw error;
      }
    }
    return true;
  } catch (error) {
    console.error('startThermostat failed:', error);
    return false;
  }
}

// Detiene el termostato
export async function stopThermostat(): Promise<boolean> {
  try {
    await fetchWithErrorHandling('/thermostat/stop', {
      method: 'POST',
    });
    return true;
  } catch (error) {
    console.error('stopThermostat failed:', error);
    return false;
  }
}

// Verificar conectividad del backend (utilidad pública)
export async function checkBackendConnectivity(): Promise<boolean> {
  return await checkBackendAvailability();
}
