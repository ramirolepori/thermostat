
import type React from "react"
import { useState, useEffect } from "react"
import { Thermometer, Power, Plus, Minus, Zap, Save } from "lucide-react"
import SceneSelector from "./SceneSelector"
import "../styles/Thermostat.css"

interface Scene {
  id: number
  name: string
  temperature: number
  active: boolean
}

const initialScenes: Scene[] = [
  { id: 1, name: "Morning", temperature: 22, active: false },
  { id: 2, name: "Day", temperature: 24, active: false },
  { id: 3, name: "Evening", temperature: 23, active: false },
  { id: 4, name: "Night", temperature: 20, active: false },
]

const Thermostat: React.FC = () => {
  const [currentTemp, setCurrentTemp] = useState(21)
  const [targetTemp, setTargetTemp] = useState(22)
  const [isHeating, setIsHeating] = useState(false)
  const [isPowerOn, setIsPowerOn] = useState(true)
  const [scenes, setScenes] = useState<Scene[]>(initialScenes)
  const [newSceneName, setNewSceneName] = useState("")
  const [isCreatingScene, setIsCreatingScene] = useState(false)

  // Simulate temperature sensor reading
  useEffect(() => {
    if (!isPowerOn) return

    const interval = setInterval(() => {
      // Simulate temperature changes
      if (isHeating && currentTemp < targetTemp) {
        setCurrentTemp((prev) => +(prev + 0.1).toFixed(1))
      } else if (!isHeating && currentTemp > 18) {
        setCurrentTemp((prev) => +(prev - 0.1).toFixed(1))
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [currentTemp, targetTemp, isHeating, isPowerOn])

  // Control heating based on target temperature
  useEffect(() => {
    if (!isPowerOn) {
      setIsHeating(false)
      return
    }

    if (currentTemp < targetTemp - 0.5) {
      setIsHeating(true)
    } else if (currentTemp >= targetTemp) {
      setIsHeating(false)
    }
  }, [currentTemp, targetTemp, isPowerOn])

  const increaseTemp = () => {
    if (isPowerOn && targetTemp < 30) {
      setTargetTemp((prev) => prev + 0.5)
    }
  }

  const decreaseTemp = () => {
    if (isPowerOn && targetTemp > 15) {
      setTargetTemp((prev) => prev - 0.5)
    }
  }

  const togglePower = () => {
    setIsPowerOn((prev) => !prev)
  }

  const activateScene = (sceneId: number) => {
    const updatedScenes = scenes.map((scene) => {
      if (scene.id === sceneId) {
        setTargetTemp(scene.temperature)
        return { ...scene, active: true }
      }
      return { ...scene, active: false }
    })
    setScenes(updatedScenes)
  }

  const deleteScene = (sceneId: number) => {
    // Check if the scene to delete is active
    const sceneToDelete = scenes.find((scene) => scene.id === sceneId)

    // Remove the scene from the list
    const updatedScenes = scenes.filter((scene) => scene.id !== sceneId)

    // If we're deleting an active scene, deactivate all scenes
    if (sceneToDelete?.active && updatedScenes.length > 0) {
      updatedScenes.forEach((scene) => {
        scene.active = false
      })
    }

    setScenes(updatedScenes)
  }

  const saveNewScene = () => {
    if (newSceneName.trim() === "") return

    const newScene = {
      id: Date.now(),
      name: newSceneName,
      temperature: targetTemp,
      active: false,
    }

    setScenes([...scenes, newScene])
    setNewSceneName("")
    setIsCreatingScene(false)
  }

  return (
    <div className="thermostat-container">
      <div className="thermostat">
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
