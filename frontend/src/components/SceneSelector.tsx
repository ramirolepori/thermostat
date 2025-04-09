
import type React from "react"
import { useState, useEffect } from "react"
import { Trash2 } from "lucide-react"
import "../styles/Thermostat.css"

interface Scene {
  id: number
  name: string
  temperature: number
  active: boolean
}

interface SceneSelectorProps {
  scenes: Scene[]
  onActivate: (id: number) => void
  onDelete: (id: number) => void
  disabled: boolean
}

const SceneSelector: React.FC<SceneSelectorProps> = ({ scenes, onActivate, onDelete, disabled }) => {
  const [contextMenu, setContextMenu] = useState<{ id: number; x: number; y: number } | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detect if we're on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
    }

    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [contextMenu])

  // Handle delete with confirmation
  const handleDelete = (e: React.MouseEvent, sceneId: number) => {
    e.stopPropagation() // Prevent activating the scene when clicking delete
    onDelete(sceneId)
    setContextMenu(null)
  }

  // Handle long press for mobile
  const handleTouchStart = (e: React.TouchEvent, sceneId: number) => {
    if (disabled) return

    const timer = setTimeout(() => {
      const touch = e.touches[0]
      const rect = e.currentTarget.getBoundingClientRect()
      setContextMenu({
        id: sceneId,
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      })
    }, 500) // 500ms long press

    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleTouchMove = () => {
    // Cancel long press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  return (
    <div className="scenes-list">
      {scenes.map((scene) => (
        <div
          key={scene.id}
          className="scene-wrapper"
          onTouchStart={(e) => isMobile && handleTouchStart(e, scene.id)}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
          onTouchMove={isMobile ? handleTouchMove : undefined}
        >
          <button
            className={`scene-button ${scene.active ? "active-scene" : ""}`}
            onClick={() => onActivate(scene.id)}
            disabled={disabled}
          >
            <span className="scene-name">{scene.name}</span>
            <span className="scene-temp">{scene.temperature}°C</span>
          </button>

          {/* Desktop delete button (visible on hover) */}
          {!isMobile && (
            <button
              className="delete-scene-button"
              onClick={(e) => handleDelete(e, scene.id)}
              disabled={disabled}
              aria-label={`Delete ${scene.name} scene`}
            >
              <Trash2 size={16} />
            </button>
          )}

          {/* Context menu for mobile */}
          {contextMenu && contextMenu.id === scene.id && (
            <div
              className="context-menu"
              style={{
                top: `${contextMenu.y}px`,
                left: `${contextMenu.x}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="context-menu-item delete-option" onClick={(e) => handleDelete(e, scene.id)}>
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default SceneSelector
