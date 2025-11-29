"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useAudioManager } from "@/hooks/use-audio-manager"

export type DriverType = "pregnant" | "injured"
export type ProjectileType = "hotdog" | "bottle" | "crutch"

export interface Projectile {
  id: string
  type: ProjectileType
  position: { x: number; y: number }
  velocity: { x: number; y: number }
  isActive: boolean
  fromPlayer: boolean
}

export interface Driver {
  id: string
  name: string
  type: DriverType
  image: string
  health: number
  maxHealth: number
  defeated: boolean
  position: { x: number; y: number }
  velocity: { x: number; y: number }
  car: {
    color: string
    width: number
    height: number
    image?: string // Add optional image property
  }
  attackCooldown: number
  isActive: boolean
}

export interface GameState {
  time: number
  lukeHealth: number
  lukeMaxHealth: number
  lukePosition: { x: number; y: number }
  lukeVelocity: { x: number; y: number }
  drivers: Driver[]
  projectiles: Projectile[]
  gameOver: boolean
  victory: boolean
  keys: {
    ArrowUp: boolean
    ArrowDown: boolean
    ArrowLeft: boolean
    ArrowRight: boolean
    Space: boolean
  }
  lastHotDogTime: number
}

interface GameContextType {
  gameState: GameState
  startGame: () => void
  throwHotDog: () => void
  updateGame: (deltaTime: number) => void
  resetGame: () => void
  setKeyPressed: (key: string, isPressed: boolean) => void
}

const initialDrivers: Driver[] = [
  {
    id: "sargam",
    name: "Sargam",
    type: "pregnant",
    image: "/images/sargam.jpeg",
    health: 100,
    maxHealth: 100,
    defeated: false,
    position: { x: -300, y: 300 },
    velocity: { x: 0, y: 0 },
    car: { color: "blue", width: 120, height: 70, image: "/images/car-blue.png" },
    attackCooldown: 0,
    isActive: true,
  },
  {
    id: "elisa",
    name: "Elisa",
    type: "pregnant",
    image: "/images/elisa.jpeg",
    health: 100,
    maxHealth: 100,
    defeated: false,
    position: { x: -600, y: 350 },
    velocity: { x: 0, y: 0 },
    car: { color: "pink", width: 120, height: 70, image: "/images/car-purple.png" },
    attackCooldown: 0,
    isActive: false,
  },
  {
    id: "talia",
    name: "Talia",
    type: "pregnant",
    image: "/images/talia.png",
    health: 100,
    maxHealth: 100,
    defeated: false,
    position: { x: -900, y: 200 }, // Adjusted for 560px height
    velocity: { x: 0, y: 0 },
    car: { color: "purple", width: 120, height: 70, image: "/images/car-yellow.png" },
    attackCooldown: 0,
    isActive: false,
  },
  {
    id: "anna",
    name: "Anna",
    type: "pregnant",
    image: "/images/anna.jpeg",
    health: 100,
    maxHealth: 100,
    defeated: false,
    position: { x: -1200, y: 250 }, // Adjusted for 560px height
    velocity: { x: 0, y: 0 },
    car: { color: "yellow", width: 120, height: 70, image: "/images/car-red.png" },
    attackCooldown: 0,
    isActive: false,
  },
  {
    id: "dom",
    name: "Dom",
    type: "injured",
    image: "/images/dom.jpeg",
    health: 100,
    maxHealth: 100,
    defeated: false,
    position: { x: -1500, y: 150 }, // Adjusted for 560px height
    velocity: { x: 0, y: 0 },
    car: { color: "green", width: 120, height: 70, image: "/images/car-green.png" },
    attackCooldown: 0,
    isActive: false,
  },
  {
    id: "laura",
    name: "Laura",
    type: "injured",
    image: "/images/laura.png",
    health: 100,
    maxHealth: 100,
    defeated: false,
    position: { x: -1800, y: 300 }, // Adjusted for 560px height
    velocity: { x: 0, y: 0 },
    car: { color: "red", width: 120, height: 70, image: "/images/car-blue.png" },
    attackCooldown: 0,
    isActive: false,
  },
  {
    id: "zara",
    name: "Zara",
    type: "injured",
    image: "/images/zara.png",
    health: 100,
    maxHealth: 100,
    defeated: false,
    position: { x: -2100, y: 200 }, // Adjusted for 560px height
    velocity: { x: 0, y: 0 },
    car: { color: "orange", width: 120, height: 70, image: "/images/car-purple.png" },
    attackCooldown: 0,
    isActive: false,
  },
]

const initialState: GameState = {
  time: 8 * 60 - 1, // 7:59 AM in minutes (31 minutes until meeting)
  lukeHealth: 100,
  lukeMaxHealth: 100,
  lukePosition: { x: 150, y: 450 }, // Adjusted for 560px height
  lukeVelocity: { x: 0, y: 0 },
  drivers: initialDrivers.map((driver) => ({
    ...driver,
    position: {
      x: driver.id === "sargam" ? -200 : driver.position.x,
      y: driver.position.y,
    },
    isActive: driver.id === "sargam" ? true : false,
  })),
  projectiles: [],
  gameOver: false,
  victory: false,
  keys: {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
  },
  lastHotDogTime: 0,
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>({ ...initialState })
  const audioManager = useAudioManager()

  const startGame = () => {
    setGameState({ ...initialState })
  }

  const resetGame = () => {
    setGameState({ ...initialState })
  }

  const setKeyPressed = (key: string, isPressed: boolean) => {
    setGameState((prev) => ({
      ...prev,
      keys: {
        ...prev.keys,
        [key === "ArrowUp"
          ? "ArrowUp"
          : key === "ArrowDown"
            ? "ArrowDown"
            : key === "ArrowLeft"
              ? "ArrowLeft"
              : key === "ArrowRight"
                ? "ArrowRight"
                : key === " " || key === "Space"
                  ? "Space"
                  : key]: isPressed,
      },
    }))
  }

  const throwHotDog = () => {
    if (gameState.gameOver) return

    const now = Date.now()
    // Limit hot dog firing rate (300ms cooldown)
    if (now - gameState.lastHotDogTime < 300) return

    // Play throw sound
    audioManager.play("throw")

    const newProjectile: Projectile = {
      id: `hotdog-${now}`,
      type: "hotdog",
      position: { x: gameState.lukePosition.x + 100, y: gameState.lukePosition.y + 20 },
      velocity: { x: 400, y: 0 },
      isActive: true,
      fromPlayer: true,
    }

    setGameState((prev) => ({
      ...prev,
      projectiles: [...prev.projectiles, newProjectile],
      lastHotDogTime: now,
    }))
  }

  const updateGame = (deltaTime: number) => {
    if (gameState.gameOver) return

    // Convert deltaTime to seconds for easier calculations
    const dt = deltaTime / 1000

    // Update time (countdown)
    const newTime = Math.max(0, gameState.time - dt)

    // Check if time is up (8:30 AM)
    const timeIsUp = newTime <= 0

    // Handle keyboard input for Luke's car
    let lukeVelocityX = 0
    let lukeVelocityY = 0
    const moveSpeed = 200 // pixels per second

    if (gameState.keys.ArrowLeft) lukeVelocityX = -moveSpeed
    if (gameState.keys.ArrowRight) lukeVelocityX = moveSpeed
    if (gameState.keys.ArrowUp) lukeVelocityY = -moveSpeed
    if (gameState.keys.ArrowDown) lukeVelocityY = moveSpeed

    // Update Luke's position
    const newLukeX = Math.max(50, Math.min(500, gameState.lukePosition.x + lukeVelocityX * dt))
    const newLukeY = Math.max(100, Math.min(480, gameState.lukePosition.y + lukeVelocityY * dt)) // Adjusted for 560px height

    // Update drivers
    const updatedDrivers = [...gameState.drivers]

    // Count active and defeated drivers
    let activeDrivers = 0
    let defeatedDrivers = 0

    updatedDrivers.forEach((driver, index) => {
      if (driver.defeated) {
        defeatedDrivers++
        return
      }

      if (driver.isActive) {
        activeDrivers++

        // Move driver towards parking spot
        const targetX = 750 // Last parking spot X position (896px width)
        const moveSpeed = 60 + Math.random() * 20 // Randomize speed slightly

        // Update position
        updatedDrivers[index] = {
          ...driver,
          position: {
            x: driver.position.x + moveSpeed * dt,
            y: driver.position.y,
          },
          attackCooldown: Math.max(0, driver.attackCooldown - dt),
        }

        // Driver attacks Luke (throw projectile)
        if (driver.attackCooldown <= 0 && Math.random() < 0.02) {
          const projectileType = driver.type === "pregnant" ? "bottle" : "crutch"
          
          const velocityX = -200 - Math.random() * 100
          
          console.log('🎯 ENEMY ATTACK:', {
            driver: driver.name,
            type: projectileType,
            velocityX: velocityX.toFixed(0),
            driverPos: `(${driver.position.x.toFixed(0)}, ${driver.position.y.toFixed(0)})`
          })

          const newProjectile = {
            id: `${projectileType}-${Date.now()}-${Math.random()}`,
            type: projectileType,
            position: { ...driver.position },
            velocity: {
              x: velocityX,
              y: 0,
            },
            isActive: true,
            fromPlayer: false,
          }

          setGameState((prev) => ({
            ...prev,
            projectiles: [...prev.projectiles, newProjectile],
          }))

          // Reset attack cooldown (2-4 seconds)
          updatedDrivers[index].attackCooldown = 2 + Math.random() * 2
        }

        // Check if driver reached parking spot
        if (driver.position.x >= targetX) {
          setGameState((prev) => ({
            ...prev,
            gameOver: true,
            victory: false,
          }))
          return
        }
      }
    })

    // Activate new drivers if needed
    if (activeDrivers < 3) {
      for (let i = 0; i < updatedDrivers.length; i++) {
        if (!updatedDrivers[i].isActive && !updatedDrivers[i].defeated) {
          updatedDrivers[i].isActive = true
          // Force position to be visible on screen
          updatedDrivers[i].position.x = -200
          break
        }
      }
    }

    // Update projectiles
    const updatedProjectiles = gameState.projectiles
      .map((projectile) => {
        // Move projectile
        const newX = projectile.position.x + projectile.velocity.x * dt
        const newY = projectile.position.y + projectile.velocity.y * dt

        // Check if projectile is out of bounds (896x560 canvas)
        if (newX < -50 || newX > 950 || newY < -50 || newY > 610) {
          return { ...projectile, isActive: false }
        }

        return {
          ...projectile,
          position: { x: newX, y: newY },
        }
      })
      .filter((p) => p.isActive) // Remove inactive projectiles

    // Check for collisions between projectiles and cars
    let lukeHealth = gameState.lukeHealth

    updatedProjectiles.forEach((projectile) => {
      if (!projectile.isActive) return

      // Check collision with Luke's car
      if (!projectile.fromPlayer) {
        const lukeCar = {
          x: newLukeX,
          y: newLukeY,
          width: 140,
          height: 80,
        }

        if (
          projectile.position.x >= lukeCar.x &&
          projectile.position.x <= lukeCar.x + lukeCar.width &&
          projectile.position.y >= lukeCar.y &&
          projectile.position.y <= lukeCar.y + lukeCar.height
        ) {
          // Hit Luke's car
          console.log('💥 LUKE HIT!', {
            projectileType: projectile.type,
            projectileVelocity: projectile.velocity.x.toFixed(0),
            healthBefore: lukeHealth,
            healthAfter: lukeHealth - 10
          })
          lukeHealth = Math.max(0, lukeHealth - 10)
          projectile.isActive = false
        }
      } else {
        // Check collision with driver cars
        updatedDrivers.forEach((driver, driverIndex) => {
          if (!driver.isActive || driver.defeated) return

          const driverCar = {
            x: driver.position.x,
            y: driver.position.y,
            width: driver.car.width,
            height: driver.car.height,
          }

          if (
            projectile.position.x >= driverCar.x &&
            projectile.position.x <= driverCar.x + driverCar.width &&
            projectile.position.y >= driverCar.y &&
            projectile.position.y <= driverCar.y + driverCar.height
          ) {
            // Hit driver's car
            const newHealth = Math.max(0, driver.health - 20)
            const wasDefeated = driver.defeated
            const isNowDefeated = newHealth <= 0

            updatedDrivers[driverIndex] = {
              ...driver,
              health: newHealth,
              defeated: isNowDefeated,
            }

            projectile.isActive = false

            // Add a console log to help debug when a driver is defeated
            if (!wasDefeated && isNowDefeated) {
              console.log(`Driver ${driver.name} (${driver.type}) defeated!`)
            }
          }
        })
      }
    })

    // Check if Luke is defeated
    if (lukeHealth <= 0) {
      setGameState((prev) => ({
        ...prev,
        lukeHealth: 0,
        gameOver: true,
        victory: false,
      }))
      return
    }

    // Check if all drivers are defeated
    if (defeatedDrivers === updatedDrivers.length) {
      console.log("All drivers defeated - setting victory condition")
      setGameState((prev) => ({
        ...prev,
        gameOver: true,
        victory: true,
      }))
      return
    }

    // Update game state
    setGameState((prev) => ({
      ...prev,
      time: newTime,
      lukeHealth,
      lukePosition: { x: newLukeX, y: newLukeY },
      lukeVelocity: { x: lukeVelocityX, y: lukeVelocityY },
      drivers: updatedDrivers,
      projectiles: updatedProjectiles.filter((p) => p.isActive),
      gameOver: timeIsUp ? true : prev.gameOver,
      victory: timeIsUp ? false : prev.victory,
    }))
  }

  return (
    <GameContext.Provider value={{ gameState, startGame, throwHotDog, updateGame, resetGame, setKeyPressed }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
