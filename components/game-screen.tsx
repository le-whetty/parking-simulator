"use client"

import { useEffect, useRef, useState } from "react"
import { useGame } from "./game-context"
import { formatTime } from "@/lib/utils"
import { Car } from "./car"
import { HealthBar } from "./health-bar"
import { useAudioManager } from "@/hooks/use-audio-manager"
import { Projectile } from "./projectile"

interface GameScreenProps {
  onVictory: () => void
  onDefeat: () => void
}

export default function GameScreen({ onVictory, onDefeat }: GameScreenProps) {
  const { gameState, throwHotDog, updateGame, setKeyPressed } = useGame()
  const requestRef = useRef<number>()
  const previousTimeRef = useRef<number>()
  const [showEffect, setShowEffect] = useState<string | null>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const audioManager = useAudioManager()

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault()
        setKeyPressed(e.key, true)
      }
      if (e.key === " " || e.code === "Space") {
        e.preventDefault()
        throwHotDog()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault()
        setKeyPressed(e.key, false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    // Focus the game container to ensure it receives keyboard events
    if (gameContainerRef.current) {
      gameContainerRef.current.focus()
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [setKeyPressed, throwHotDog])

  // Handle hit animations
  useEffect(() => {
    if (gameState.lukeHealth < gameState.lukeMaxHealth) {
      setHitAnimation(true)
      setTimeout(() => setHitAnimation(false), 300)
    }
  }, [gameState.lukeHealth, gameState.lukeMaxHealth])

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current
      updateGame(deltaTime)

      // Check for game over conditions
      if (gameState.gameOver) {
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current)
        }

        // Small delay before showing victory/defeat screen
        setTimeout(() => {
          if (gameState.victory) {
            onVictory()
          } else {
            onDefeat()
          }
        }, 500)
      }
    }
    previousTimeRef.current = time
    requestRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [])

  // Add a more robust check for victory conditions
  useEffect(() => {
    // Check if all drivers are defeated and Luke is in the parking spot
    const allDriversDefeated = gameState.drivers.every((driver) => driver.defeated)

    if (allDriversDefeated && gameState.gameOver && gameState.victory) {
      console.log("VICTORY CONDITION MET IN GAME SCREEN")
      // Small delay before showing victory screen
      setTimeout(() => {
        onVictory()
      }, 100)
    }
  }, [gameState.drivers, gameState.gameOver, gameState.victory, onVictory])

  // Play sound effects when drivers are defeated
  useEffect(() => {
    gameState.drivers.forEach((driver) => {
      if (driver.health <= 0 && !driver.defeated) {
        // Always show visual effect
        if (driver.type === "pregnant") {
          setShowEffect("waa waa")
          audioManager.play("babyCry")
        } else {
          setShowEffect("owwww")
          audioManager.play("ouch")
        }

        // Hide effect after 1 second
        setTimeout(() => {
          setShowEffect(null)
        }, 1000)
      }
    })

    if (gameState.lukeHealth <= 0) {
      // Always show visual effect
      setShowEffect("noooooo")
      audioManager.play("no")
      setTimeout(() => {
        setShowEffect(null)
      }, 1000)
    }
  }, [gameState.drivers, gameState.lukeHealth, audioManager])

  // Get active drivers
  const activeDrivers = gameState.drivers.filter((driver) => driver.isActive && !driver.defeated)

  // Add visual feedback for throwing hot dogs and getting hit
  const [hitAnimation, setHitAnimation] = useState(false)

  return (
    <div
      ref={gameContainerRef}
      className="relative w-full max-w-4xl h-[850px] bg-gray-800 overflow-hidden focus:outline-none font-quicksand"
      tabIndex={0}
    >
      {/* Office building background */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        {/* Sky */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gray-700">
          {/* Tracksuit building */}
          <div className="absolute top-0 right-0 w-[500px] h-[250px] bg-gray-500">
            <div className="absolute top-[20px] left-[20px] text-white font-bold text-2xl">Tracksuit</div>
            <div className="absolute bottom-0 left-[200px] w-[100px] h-[50px] bg-gray-800">{/* Door */}</div>
          </div>
        </div>

        {/* Road */}
        <div className="absolute bottom-0 left-0 w-full h-[350px] bg-gray-900">
          {/* Parking spots */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute bottom-10 h-[100px] w-[150px] border border-white/30"
              style={{ left: `${i * 180 + 50}px` }}
            />
          ))}

          {/* Last spot */}
          <div
            className="absolute bottom-10 h-[100px] w-[150px] border border-white/30"
            style={{ left: `${6 * 180 + 50}px` }}
          >
            <div className="absolute inset-0 bg-green-500/20 animate-pulse">
              <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-bold text-xs">
                LAST SPOT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Game UI */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <div className="bg-black/50 p-2 rounded-md">
          <div className="text-xl font-bold">Time: {formatTime(gameState.time)}</div>
          <div className="text-sm text-red-400">Meeting at 8:30 AM</div>
        </div>

        <div className="flex gap-4">
          <div className="bg-black/50 p-2 rounded-md">
            <div className="text-sm mb-1">Luke's Health</div>
            <HealthBar current={gameState.lukeHealth} max={gameState.lukeMaxHealth} />
          </div>

          {activeDrivers.length > 0 && (
            <div className="bg-black/50 p-2 rounded-md">
              <div className="text-sm mb-1">{activeDrivers[0].name}'s Health</div>
              <HealthBar current={activeDrivers[0].health} max={activeDrivers[0].maxHealth} />
            </div>
          )}
        </div>
      </div>

      {/* Luke's car */}
      <Car
        position={gameState.lukePosition}
        color="black"
        width={140}
        height={80}
        driver={{
          name: "Luke",
          image: "/images/luke.png",
        }}
        carImage="/images/minivan.png"
      />

      {/* Active driver cars */}
      {activeDrivers.map((driver) => (
        <Car
          key={driver.id}
          position={driver.position}
          color={driver.car.color}
          width={driver.car.width}
          height={driver.car.height}
          driver={{
            name: driver.name,
            image: driver.image,
          }}
          carImage={driver.car.image}
        />
      ))}

      {/* Projectiles */}
      {gameState.projectiles.map((projectile) => (
        <Projectile key={projectile.id} type={projectile.type} position={projectile.position} />
      ))}

      {/* Hit animation */}
      {hitAnimation && (
        <div
          className="absolute"
          style={{
            left: `${gameState.lukePosition.x}px`,
            top: `${gameState.lukePosition.y}px`,
            width: "140px",
            height: "80px",
            pointerEvents: "none",
          }}
        >
          <div className="w-full h-full border-4 border-red-500 animate-pulse opacity-50"></div>
        </div>
      )}

      {/* Visual effects */}
      {showEffect && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-white animate-bounce">
          {showEffect}
        </div>
      )}

      {/* Controls instruction */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded-md text-white text-center">
        <div className="font-bold mb-1">Controls:</div>
        <div>Arrow keys to move • SPACE to throw hot dogs 🌭</div>
      </div>
    </div>
  )
}
