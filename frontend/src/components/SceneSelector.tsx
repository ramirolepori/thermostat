import React, { useState, useEffect, useCallback, useMemo } from "react"
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

// Usar React.memo para evitar renderizados innecesarios
const SceneSelector: React.FC<SceneSelectorProps> = React.memo(({ scenes, onActivate, onDelete, disabled }) => {
  const [contextMenu, setContextMenu] = useState<{ id: number; x: number; y: number } | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detect if we're on a mobile device - optimizado con useCallback
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    // Usar un debounce para resize para evitar múltiples rerenderizados
    let resizeTimer: number | null = null;
    const handleResize = () => {
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = window.setTimeout(checkMobile, 100);
    };

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
      }
    }
  }, [])

  // Close context menu when clicking outside - optimizado con useCallback
  useEffect(() => {
    // Solo agregar event listeners si el menú contextual está abierto
    if (!contextMenu) return;
    
    const handleClickOutside = () => {
      setContextMenu(null)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [contextMenu])

  // Handle delete with confirmation - optimizado con useCallback
  const handleDelete = useCallback((e: React.MouseEvent, sceneId: number) => {
    e.stopPropagation() // Prevent activating the scene when clicking delete
    onDelete(sceneId)
    setContextMenu(null)
  }, [onDelete])

  // Handle long press for mobile - optimizado con useCallback
  const handleTouchStart = useCallback((e: React.TouchEvent, sceneId: number) => {
    if (disabled) return

    const timer = window.setTimeout(() => {
      const touch = e.touches[0]
      const rect = e.currentTarget.getBoundingClientRect()
      setContextMenu({
        id: sceneId,
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      })
    }, 500) // 500ms long press

    setLongPressTimer(timer)
  }, [disabled])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }, [longPressTimer])

  const handleTouchMove = useCallback(() => {
    // Cancel long press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }, [longPressTimer])

  // Memoizar la lista de escenas para evitar recálculo
  const scenesList = useMemo(() => (
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
            onClick={() => !disabled && onActivate(scene.id)}
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
  ), [scenes, isMobile, disabled, handleTouchStart, handleTouchEnd, handleTouchMove, handleDelete, contextMenu, onActivate])

  return scenesList;
});

export default React.memo(SceneSelector);
