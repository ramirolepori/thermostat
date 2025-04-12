// Importaciones necesarias para React y componentes adicionales
import React from "react";
import { useState, useEffect } from "react";
import { Thermometer, Power, Plus, Minus, Zap, Save } from "lucide-react";
import SceneSelector from "./SceneSelector";
import "../styles/Thermostat.css";
import {
  getTemperature,
  getRelayState,
  setTargetTemperature,
  getTargetTemperature,
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
  const [currentTemp, setCurrentTemp] = useState<number | null>(null); // Temperatura actual
  const [targetTemp, setTargetTemp] = useState<number | null>(null); // Temperatura objetivo
  const [isHeating, setIsHeating] = useState<boolean>(false); // Indica si está calentando
  const [isPowerOn, setIsPowerOn] = useState<boolean | null>(null); // Indica si el termostato está encendido
  const [scenes, setScenes] = useState<Scene[]>(initialScenes); // Lista de escenas
  const [newSceneName, setNewSceneName] = useState(""); // Nombre de la nueva escena
  const [isCreatingScene, setIsCreatingScene] = useState(false); // Indica si se está creando una nueva escena
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga

  // Fetch initial data from the backend
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const temp = await getTemperature();
        const relayState = await getRelayState();
        const target = await getTargetTemperature();

        setCurrentTemp(temp || 20); // Valor predeterminado si es NaN
        setIsPowerOn(relayState === "on");
        setTargetTemp(target || 22); // Valor predeterminado si es undefined
      } catch (error) {
        console.error("Error fetching initial data:", error);
        // Valores predeterminados en caso de error
        setCurrentTemp(20);
        setIsPowerOn(false);
        setTargetTemp(22);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Actualización periódica de la temperatura cada 30 segundos
    const intervalId = setInterval(async () => {
      try {
        const temp = await getTemperature();
        if (!isNaN(temp)) {
          setCurrentTemp(temp);
        }
        
        const relayState = await getRelayState();
        if (relayState) {
          setIsHeating(relayState === "on");
        }
      } catch (error) {
        console.error("Error updating temperature:", error);
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Incrementa la temperatura objetivo
  const increaseTemp = async () => {
    if (targetTemp === null || targetTemp >= 30) return;
    
    const newTarget = targetTemp + 0.5;
    setTargetTemp(newTarget);
    
    try {
      await setTargetTemperature(newTarget);
    } catch (error) {
      console.error("Error setting target temperature:", error);
    }
  };

  // Reduce la temperatura objetivo
  const decreaseTemp = async () => {
    if (targetTemp === null || targetTemp <= 15) return;
    
    const newTarget = targetTemp - 0.5;
    setTargetTemp(newTarget);
    
    try {
      await setTargetTemperature(newTarget);
    } catch (error) {
      console.error("Error setting target temperature:", error);
    }
  };

  // Alterna el estado de encendido/apagado del termostato
  const togglePower = async () => {
    try {
      const newPowerState = !isPowerOn;
      setIsPowerOn(newPowerState);
      
      if (newPowerState) {
        await turnOnRelay();
      } else {
        await turnOffRelay();
      }
    } catch (error) {
      console.error("Error toggling power:", error);
      setIsPowerOn(!isPowerOn); // Revertir cambio en UI si falla
    }
  };

  // Activa una escena específica
  const activateScene = async (sceneId: number) => {
    const selectedScene = scenes.find((scene) => scene.id === sceneId);
    if (!selectedScene) return;
    
    const updatedScenes = scenes.map((scene) => ({
      ...scene,
      active: scene.id === sceneId,
    }));
    
    setScenes(updatedScenes);
    setTargetTemp(selectedScene.temperature);
    
    try {
      await setTargetTemperature(selectedScene.temperature);
    } catch (error) {
      console.error("Error activating scene:", error);
    }
  };

  // Elimina una escena de la lista
  const deleteScene = (sceneId: number) => {
    const updatedScenes = scenes.filter((scene) => scene.id !== sceneId);
    setScenes(updatedScenes);
  };

  // Guarda una nueva escena en la lista
  const saveNewScene = () => {
    if (newSceneName.trim() === "" || targetTemp === null) return;

    const newScene = {
      id: Date.now(),
      name: newSceneName,
      temperature: targetTemp,
      active: false,
    };

    setScenes([...scenes, newScene]);
    setNewSceneName("");
    setIsCreatingScene(false);
  };

  if (loading) {
    return <div className="thermostat-loading">Loading thermostat data...</div>;
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
