
import { useState, useEffect } from "react"
import { Thermometer, Power, Plus, Minus, Zap, Save } from "lucide-react"
import "../styles/SmartThermostat.css"
import SceneSelector from "./SceneSelector"

// Mock data for scenes
const initialScenes = [
  { id: 1, name: "Morning", temperature: 22, active: false },
  { id: 2, name: "Day", temperature: 24, active: false },
  { id: 3, name: "Evening", temperature: 23, active: false },
  { id: 4, name: "Night", temperature: 20, active: false },
]

interface Scene {
    id: number
    name: string
    temperature: number
    active: boolean
}

export default function SmartThermostat() {
  const [currentTemp, setCurrentTemp] = useState(21)
  const [targetTemp, setTargetTemp] = useState(22)
  const [isHeating, setIsHeating] = useState(false)
  const [isPowerOn, setIsPowerOn] = useState(true)
  const [scenes, setScenes] = useState(initialScenes)
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



const activateScene = (sceneId: number): void => {
    const updatedScenes: Scene[] = scenes.map((scene: Scene): Scene => {
        if (scene.id === sceneId) {
            setTargetTemp(scene.temperature)
            return { ...scene, active: true }
        }
        return { ...scene, active: false }
    })
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
    <div className="thermostat">
      <div className="main-control">
        <button className={`power-button ${isPowerOn ? "on" : "off"}`} onClick={togglePower}>
          <Power size={24} />
        </button>

        <div className="temperature-display">
          <div className="current-temp">
            <Thermometer className="icon" />
            <span>{currentTemp.toFixed(1)}°C</span>
            {isHeating && <Zap className="heating-icon" />}
          </div>

          <div className={`target-temp ${!isPowerOn ? "disabled" : ""}`}>
            <button className="temp-button" onClick={decreaseTemp} disabled={!isPowerOn}>
              <Minus size={20} />
            </button>

            <span>{targetTemp.toFixed(1)}°C</span>

            <button className="temp-button" onClick={increaseTemp} disabled={!isPowerOn}>
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="scenes-section">
        <h2>Scenes</h2>
        <SceneSelector scenes={scenes} onActivate={activateScene} onDelete={() => {}} disabled={!isPowerOn} />

        {isCreatingScene ? (
          <div className="new-scene-form">
            <input
              type="text"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              placeholder="Scene name"
              className="scene-input"
            />
            <button className="save-button" onClick={saveNewScene}>
              <Save size={16} /> Save
            </button>
            <button className="cancel-button" onClick={() => setIsCreatingScene(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="add-scene-button" onClick={() => setIsCreatingScene(true)} disabled={!isPowerOn}>
            Add New Scene
          </button>
        )}
      </div>
    </div>
  )
}
