// Importaciones necesarias para React y componentes adicionales
import React, { useState, useEffect, useCallback } from "react";
import { Thermometer, Power, Plus, Minus, Zap, Save } from "lucide-react";
import SceneSelector from "./SceneSelector";
import "../styles/Thermostat.css";
import {
  getTemperature,
  getStatus,
  setTargetTemperature,
  getTargetTemperature,
  startThermostat,
  stopThermostat
} from "../api/thermostatBackend";

// Definición de la interfaz para las escenas
interface Scene {
  id: number; // Identificador único de la escena
  name: string; // Nombre de la escena
  temperature: number; // Temperatura objetivo de la escena
  active: boolean; // Indica si la escena está activa
}

// Escenas iniciales predefinidas
const initialScenes: Scene[] = [
  { id: 1, name: "Morning", temperature: 22, active: false },
  { id: 2, name: "Day", temperature: 24, active: false },
  { id: 3, name: "Evening", temperature: 23, active: false },
  { id: 4, name: "Night", temperature: 20, active: false },
];

const Thermostat: React.FC = () => {
  // Estados para manejar la lógica del termostato
  const [currentTemp, setCurrentTemp] = useState<number>(20); // Temperatura actual con valor por defecto
  const [targetTemp, setTargetTemp] = useState<number>(22); // Temperatura objetivo con valor por defecto
  const [isHeating, setIsHeating] = useState<boolean>(false); // Indica si está calentando
  const [isPowerOn, setIsPowerOn] = useState<boolean>(false); // Indica si el termostato está encendido
  const [scenes, setScenes] = useState<Scene[]>(initialScenes); // Lista de escenas
  const [newSceneName, setNewSceneName] = useState(""); // Nombre de la nueva escena
  const [isCreatingScene, setIsCreatingScene] = useState(false); // Indica si se está creando una nueva escena
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga
  const [error, setError] = useState<string | null>(null); // Estado para manejar errores

  // Fetch initial data from the backend
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener datos en paralelo para mejorar la eficiencia
        const [tempResponse, statusResponse, targetResponse] = await Promise.all([
          getTemperature(),
          getStatus(),
          getTargetTemperature()
        ]);
        
        // Validar y actualizar los datos con valores por defecto cuando sea necesario
        setCurrentTemp(isNaN(tempResponse) ? 20 : tempResponse);
        setIsPowerOn(statusResponse?.isRunning || false);
        setIsHeating(statusResponse?.isHeating || false);
        setTargetTemp(targetResponse !== undefined && !isNaN(targetResponse) ? targetResponse : 22);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setError("Failed to connect to thermostat system. Using default values.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Actualización periódica de la temperatura y estado cada 5 segundos
    const intervalId = setInterval(async () => {
      if (!isPowerOn) return; // No actualizar si está apagado

      try {
        setError(null);
        const [tempResponse, statusResponse] = await Promise.all([
          getTemperature(),
          getStatus()
        ]);
        
        if (!isNaN(tempResponse)) {
          setCurrentTemp(tempResponse);
        }
        
        if (statusResponse) {
          setIsHeating(statusResponse.isHeating || false);
        }
      } catch (error) {
        console.error("Error updating thermostat data:", error);
        // No mostrar error en la interfaz para actualizaciones periódicas
        // a menos que persista por múltiples intentos
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isPowerOn]);

  // Incrementa la temperatura objetivo
  const increaseTemp = useCallback(async () => {
    if (targetTemp >= 30) return;
    
    const newTarget = targetTemp + 0.5;
    setTargetTemp(newTarget);
    
    try {
      await setTargetTemperature(newTarget);
    } catch (error) {
      console.error("Error setting target temperature:", error);
      setError("Error setting target temperature");
      // Revertir cambio en la UI si hay error
      setTargetTemp(targetTemp);
    }
  }, [targetTemp]);

  // Reduce la temperatura objetivo
  const decreaseTemp = useCallback(async () => {
    if (targetTemp <= 15) return;
    
    const newTarget = targetTemp - 0.5;
    setTargetTemp(newTarget);
    
    try {
      await setTargetTemperature(newTarget);
    } catch (error) {
      console.error("Error setting target temperature:", error);
      setError("Error setting target temperature");
      // Revertir cambio en la UI si hay error
      setTargetTemp(targetTemp);
    }
  }, [targetTemp]);

  // Alterna el estado de encendido/apagado del termostato
  const togglePower = useCallback(async () => {
    try {
      const newPowerState = !isPowerOn;
      setIsPowerOn(newPowerState);
      
      if (newPowerState) {
        await startThermostat();
      } else {
        await stopThermostat();
      }
    } catch (error) {
      console.error("Error toggling power:", error);
      setError("Error toggling power");
      setIsPowerOn(!isPowerOn); // Revertir cambio en UI si falla
    }
  }, [isPowerOn]);

  // Activa una escena específica
  const activateScene = useCallback(async (sceneId: number) => {
    const selectedScene = scenes.find((scene) => scene.id === sceneId);
    if (!selectedScene) return;
    
    const updatedScenes = scenes.map((scene) => ({
      ...scene,
      active: scene.id === sceneId,
    }));
    
    setScenes(updatedScenes);
    
    try {
      // Primero intentar actualizar la temperatura en el backend
      await setTargetTemperature(selectedScene.temperature);
      // Si es exitoso, actualizar el estado local
      setTargetTemp(selectedScene.temperature);
    } catch (error) {
      console.error("Error activating scene:", error);
      setError("Error activating scene");
      // Revertir cambios en las escenas si hay error
      setScenes(scenes);
    }
  }, [scenes]);

  // Elimina una escena de la lista
  const deleteScene = useCallback((sceneId: number) => {
    const updatedScenes = scenes.filter((scene) => scene.id !== sceneId);
    setScenes(updatedScenes);
  }, [scenes]);

  // Guarda una nueva escena en la lista
  const saveNewScene = useCallback(() => {
    if (newSceneName.trim() === "") {
      setError("Scene name cannot be empty");
      return;
    }
    
    // Validar si ya existe una escena con el mismo nombre
    if (scenes.some(scene => scene.name.toLowerCase() === newSceneName.trim().toLowerCase())) {
      setError("A scene with this name already exists");
      return;
    }

    const newScene = {
      id: Date.now(),
      name: newSceneName.trim(),
      temperature: targetTemp,
      active: false,
    };

    setScenes([...scenes, newScene]);
    setNewSceneName("");
    setIsCreatingScene(false);
    setError(null);
  }, [newSceneName, targetTemp, scenes]);

  if (loading) {
    return <div className="thermostat-loading">Loading thermostat data...</div>;
  }

  // Mostrar mensaje de error si existe
  if (error) {
    return (
      <div className="thermostat-container">
        <div className="thermostat-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
        <div className="thermostat">
          {/* Controles principales del termostato */}
          <div className="main-control">
            <button
              className={`power-button ${isPowerOn ? "power-on" : "power-off"}`}
              onClick={togglePower}
              aria-label="Power"
            >
              <Power size={24} />
            </button>

            <div className="temperature-display">
              <div className="current-temp">
                <Thermometer className="temp-icon" />
                <span>{currentTemp !== null ? currentTemp.toFixed(1) : "--"}°C</span>
                {isHeating && <Zap className="heating-icon" />}
              </div>

              <div className={`target-temp ${!isPowerOn ? "disabled" : ""}`}>
                <button
                  className="temp-button decrease"
                  onClick={decreaseTemp}
                  disabled={!isPowerOn}
                  aria-label="Decrease temperature"
                >
                  <Minus size={20} />
                </button>

                <span>{targetTemp !== null ? targetTemp.toFixed(1) : "--"}°C</span>

                <button
                  className="temp-button increase"
                  onClick={increaseTemp}
                  disabled={!isPowerOn}
                  aria-label="Increase temperature"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Sección de escenas */}
          <div className="scenes-section">
            <h2>Scenes</h2>
            <SceneSelector
              scenes={scenes}
              onActivate={activateScene}
              onDelete={deleteScene}
              disabled={!isPowerOn}
            />

            {isCreatingScene ? (
              <div className="new-scene-form">
                <input
                  type="text"
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  placeholder="Scene name"
                  className="scene-input"
                />
                <div className="scene-form-buttons">
                  <button className="save-button" onClick={saveNewScene}>
                    <Save size={16} /> Save
                  </button>
                  <button
                    className="cancel-button"
                    onClick={() => setIsCreatingScene(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="add-scene-button"
                onClick={() => setIsCreatingScene(true)}
                disabled={!isPowerOn}
              >
                Add New Scene
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="thermostat-container">
      <div className="thermostat">
        {/* Controles principales del termostato */}
        <div className="main-control">
          <button
            className={`power-button ${isPowerOn ? "power-on" : "power-off"}`}
            onClick={togglePower}
            aria-label="Power"
          >
            <Power size={24} />
          </button>

          <div className="temperature-display">
            <div className="current-temp">
              <Thermometer className="temp-icon" />
              <span>{currentTemp !== null ? currentTemp.toFixed(1) : "--"}°C</span>
              {isHeating && <Zap className="heating-icon" />}
            </div>

            <div className={`target-temp ${!isPowerOn ? "disabled" : ""}`}>
              <button
                className="temp-button decrease"
                onClick={decreaseTemp}
                disabled={!isPowerOn}
                aria-label="Decrease temperature"
              >
                <Minus size={20} />
              </button>

              <span>{targetTemp !== null ? targetTemp.toFixed(1) : "--"}°C</span>

              <button
                className="temp-button increase"
                onClick={increaseTemp}
                disabled={!isPowerOn}
                aria-label="Increase temperature"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Sección de escenas */}
        <div className="scenes-section">
          <h2>Scenes</h2>
          <SceneSelector
            scenes={scenes}
            onActivate={activateScene}
            onDelete={deleteScene}
            disabled={!isPowerOn}
          />

          {isCreatingScene ? (
            <div className="new-scene-form">
              <input
                type="text"
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
                placeholder="Scene name"
                className="scene-input"
              />
              <div className="scene-form-buttons">
                <button className="save-button" onClick={saveNewScene}>
                  <Save size={16} /> Save
                </button>
                <button
                  className="cancel-button"
                  onClick={() => setIsCreatingScene(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="add-scene-button"
              onClick={() => setIsCreatingScene(true)}
              disabled={!isPowerOn}
            >
              Add New Scene
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Thermostat;
