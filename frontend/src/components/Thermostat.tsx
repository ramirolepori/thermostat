// Importaciones necesarias para React y componentes adicionales
import React from "react"
import { useState, useEffect } from "react"
import { Thermometer, Power, Plus, Minus, Zap, Save } from "lucide-react"
import SceneSelector from "./SceneSelector"
import "../styles/Thermostat.css"

// Definición de la interfaz para las escenas
interface Scene {
  id: number // Identificador único de la escena
  name: string // Nombre de la escena
  temperature: number // Temperatura objetivo de la escena
  active: boolean // Indica si la escena está activa
}

// Escenas iniciales predefinidas
const initialScenes: Scene[] = [
  { id: 1, name: "Morning", temperature: 22, active: false },
  { id: 2, name: "Day", temperature: 24, active: false },
  { id: 3, name: "Evening", temperature: 23, active: false },
  { id: 4, name: "Night", temperature: 20, active: false },
]

const Thermostat: React.FC = () => {
  // Estados para manejar la lógica del termostato
  const [currentTemp, setCurrentTemp] = useState(21) // Temperatura actual
  const [targetTemp, setTargetTemp] = useState(22) // Temperatura objetivo
  const [isHeating, setIsHeating] = useState(false) // Indica si está calentando
  const [isPowerOn, setIsPowerOn] = useState(true) // Indica si el termostato está encendido
  const [scenes, setScenes] = useState<Scene[]>(initialScenes) // Lista de escenas
  const [newSceneName, setNewSceneName] = useState("") // Nombre de la nueva escena
  const [isCreatingScene, setIsCreatingScene] = useState(false) // Indica si se está creando una nueva escena

  // Simula la lectura de un sensor de temperatura
  useEffect(() => {
    if (!isPowerOn) return // Si el termostato está apagado, no hacer nada

    const interval = setInterval(() => {
      // Simula cambios en la temperatura
      if (isHeating && currentTemp < targetTemp) {
        setCurrentTemp((prev) => +(prev + 0.1).toFixed(1)) // Incrementa la temperatura
      } else if (!isHeating && currentTemp > 18) {
        setCurrentTemp((prev) => +(prev - 0.1).toFixed(1)) // Reduce la temperatura
      }
    }, 2000) // Intervalo de 2 segundos

    return () => clearInterval(interval) // Limpia el intervalo al desmontar
  }, [currentTemp, targetTemp, isHeating, isPowerOn])

  // Controla el estado de calentamiento basado en la temperatura objetivo
  useEffect(() => {
    if (!isPowerOn) {
      setIsHeating(false) // Apaga el calentamiento si el termostato está apagado
      return
    }

    if (currentTemp < targetTemp - 0.5) {
      setIsHeating(true) // Activa el calentamiento si la temperatura actual es menor a la objetivo
    } else if (currentTemp >= targetTemp) {
      setIsHeating(false) // Desactiva el calentamiento si se alcanza la temperatura objetivo
    }
  }, [currentTemp, targetTemp, isPowerOn])

  // Incrementa la temperatura objetivo
  const increaseTemp = () => {
    if (isPowerOn && targetTemp < 30) {
      setTargetTemp((prev) => prev + 0.5)
    }
  }

  // Reduce la temperatura objetivo
  const decreaseTemp = () => {
    if (isPowerOn && targetTemp > 15) {
      setTargetTemp((prev) => prev - 0.5)
    }
  }

  // Alterna el estado de encendido/apagado del termostato
  const togglePower = () => {
    setIsPowerOn((prev) => !prev)
  }

  // Activa una escena específica
  const activateScene = (sceneId: number) => {
    const updatedScenes = scenes.map((scene) => {
      if (scene.id === sceneId) {
        setTargetTemp(scene.temperature) // Ajusta la temperatura objetivo según la escena
        return { ...scene, active: true } // Marca la escena como activa
      }
      return { ...scene, active: false } // Desactiva las demás escenas
    })
    setScenes(updatedScenes)
  }

  // Elimina una escena de la lista
  const deleteScene = (sceneId: number) => {
    const sceneToDelete = scenes.find((scene) => scene.id === sceneId) // Encuentra la escena a eliminar
    const updatedScenes = scenes.filter((scene) => scene.id !== sceneId) // Filtra la lista de escenas

    if (sceneToDelete?.active && updatedScenes.length > 0) {
      updatedScenes.forEach((scene) => {
        scene.active = false // Desactiva todas las escenas si se elimina una activa
      })
    }

    setScenes(updatedScenes)
  }

  // Guarda una nueva escena en la lista
  const saveNewScene = () => {
    if (newSceneName.trim() === "") return // No permite nombres vacíos

    const newScene = {
      id: Date.now(), // Genera un ID único basado en la fecha actual
      name: newSceneName, // Asigna el nombre ingresado
      temperature: targetTemp, // Usa la temperatura objetivo actual
      active: false, // La nueva escena no está activa por defecto
    }

    setScenes([...scenes, newScene]) // Agrega la nueva escena a la lista
    setNewSceneName("") // Limpia el campo de entrada
    setIsCreatingScene(false) // Finaliza el modo de creación
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
              <span>{currentTemp.toFixed(1)}°C</span>
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

              <span>{targetTemp.toFixed(1)}°C</span>

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
          <SceneSelector scenes={scenes} onActivate={activateScene} onDelete={deleteScene} disabled={!isPowerOn} />

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
                <button className="cancel-button" onClick={() => setIsCreatingScene(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="add-scene-button" onClick={() => setIsCreatingScene(true)} disabled={!isPowerOn}>
              Add New Scene
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Thermostat
