
import React from "react"
import { useState } from "react"
import Thermostat from "./components/Thermostat"
import Automations from "./components/Automations"
import { Thermometer, Zap } from "lucide-react"
import "./App.css"

function App() {
  const [currentScreen, setCurrentScreen] = useState<"thermostat" | "automations">("thermostat")

  return (
    <div className="app">
      <header>
        <h1>Smart Thermostat</h1>
      </header>
      <main>{currentScreen === "thermostat" ? <Thermostat /> : <Automations />}</main>
      <nav className="navigation">
        <button
          className={`nav-button ${currentScreen === "thermostat" ? "active" : ""}`}
          onClick={() => setCurrentScreen("thermostat")}
        >
          <Thermometer size={24} />
          <span>Thermostat</span>
        </button>
        <button
          className={`nav-button ${currentScreen === "automations" ? "active" : ""}`}
          onClick={() => setCurrentScreen("automations")}
        >
          <Zap size={24} />
          <span>Automations</span>
        </button>
      </nav>
      <footer>
        <p>Smart Home Control System</p>
      </footer>
    </div>
  )
}

export default App
