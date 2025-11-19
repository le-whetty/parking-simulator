"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import DefeatScreen from "@/components/defeat-screen"
import VictoryScreen from "@/components/victory-screen"
import LoginScreen from "@/components/login-screen"
import { useAudioManager } from "@/hooks/use-audio-manager"
import { ExplosionManager } from "@/components/explosion-manager"

// Game states
type GameState = "auth" | "intro" | "start" | "playing" | "victory" | "defeat"

// Driver types
type DriverType = "pregnant" | "injured"

// Driver interface
interface Driver {
  id: string
  name: string
  type: DriverType
  image: string
  health: number
  defeated: boolean
  position: { x: number; y: number }
  speed: number
  direction: { x: number; y: number } // Added direction vector
  directionChangeTimer: number // Timer for changing direction
  carImage?: string // Optional car image path
}

export default function Home() {
  // Game state
  const [gameState, setGameState] = useState<GameState>("auth")
  const [displayTime, setDisplayTime] = useState(508) // 8:28 AM (in minutes) - display only
  const [lukeHealth, setLukeHealth] = useState(100)
  const [message, setMessage] = useState("")
  const [debug, setDebug] = useState(false) // Debug mode toggle
  const [parkingCountdown, setParkingCountdown] = useState<number | null>(null)
  const [messageId, setMessageId] = useState(0)
  const [isInParkingSpot, setIsInParkingSpot] = useState(false)
  const [hasWon, setHasWon] = useState(false) // Victory state
  const [lukePosition, setLukePosition] = useState({ x: 600, y: 400 }) // Luke's position (state for re-renders)
  const [explosions, setExplosions] = useState<Array<{id: string, x: number, y: number}>>([]) // Track explosions
  const [parkingSpotTimer, setParkingSpotTimer] = useState(0) // Timer for how long Luke has been in parking spot
  const parkingSpotTimerRef = useRef(0) // Ref version for game loop
  const victoryRef = useRef(false) // Victory ref to prevent multiple triggers
  const driversRef = useRef<Driver[]>([]) // Ref to track latest drivers state
  const gameStartTimeRef = useRef(0) // Game start time
  const lukePositionRef = useRef({ x: 600, y: 400 }) // Luke's position (ref for game loop)
  const lukeFacingRef = useRef("right") // Luke's facing direction
  const gameDurationRef = useRef(120000) // Game duration (2 minutes)
  const lukeCarRef = useRef<HTMLDivElement | null>(null) // Luke's car ref
  const parkingSpotRef = useRef<HTMLDivElement | null>(null) // Parking spot ref
  const gameContainerRef = useRef<HTMLDivElement | null>(null) // Game container ref
  const gameLoopRef = useRef<number | null>(null) // Game loop ref
  const hotdogsRef = useRef<HTMLDivElement[]>([]) // Hotdogs ref
  const lastHotdogTime = useRef(0) // Last hotdog time
  const enemyProjectilesRef = useRef<HTMLDivElement[]>([]) // Enemy projectiles ref
  const [showSlackMessage, setShowSlackMessage] = useState(false) // State to control Slack message visibility
  const slackMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Ref for the Slack message timeout

  // Audio state - simplified to just a flag
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [audioDebug, setAudioDebug] = useState<string>("")

  // Add a new ref to track parking time
  const parkingTimerRef = useRef<number>(0)
  const isParkedRef = useRef<boolean>(false)
  const parkingMessageShownRef = useRef<boolean>(false)

  // Add this near the other refs at the top of the component
  const themeAudioRef = useRef<HTMLAudioElement | null>(null)
  const slackAudioRef = useRef<HTMLAudioElement | null>(null)
  const slackIntervalRef = useRef<number | null>(null)

  // Game area boundaries - used to keep drivers on screen
  const gameBounds = {
    minX: 100,
    maxX: 1100,
    minY: 150,
    maxY: 650,
    centerX: 600,
    centerY: 400,
  }

  // Define the parking spot area as a constant
  const PARKING_SPOT_AREA = {
    left: 425,
    right: 825,
    top: 100,
    bottom: 220,
  }

  // Add a score state near the other state variables
  const [score, setScore] = useState(0)

  const audioManager = useAudioManager()

  // Then modify the playAudio function to store the theme audio reference
  const playAudio = (src: string) => {
    // Map the src to our sound types
    if (src.includes("throw")) {
      audioManager.play("throw")
    } else if (src.includes("baby-cry")) {
      audioManager.play("babyCry")
    } else if (src.includes("ouch")) {
      audioManager.play("ouch")
    } else if (src.includes("no")) {
      audioManager.play("no")
    } else if (src.includes("anthem")) {
      audioManager.play("anthem")
    } else if (src.includes("theme")) {
      audioManager.play("theme")
    } else if (src.includes("slack")) {
      audioManager.play("slack")
    }
  }

  // Play Slack notification sound and show message
  const playSlackSound = () => {
    if (gameState !== "playing" || hasWon || victoryRef.current) return

    // Play the sound
    audioManager.play("slack")

    // Show the Slack message
    setShowSlackMessage(true)

    // Clear any existing timeout
    if (slackMessageTimeoutRef.current) {
      clearTimeout(slackMessageTimeoutRef.current)
    }

    // Set a timeout to hide the message after 5 seconds
    slackMessageTimeoutRef.current = setTimeout(() => {
      setShowSlackMessage(false)
    }, 5000)
  }

  // Set up Slack sound interval when game is playing
  useEffect(() => {
    if (gameState === "playing" && !hasWon && !victoryRef.current) {
      // Clear any existing interval
      if (slackIntervalRef.current) {
        clearInterval(slackIntervalRef.current)
      }

      // Add a 10-second delay before the first Slack notification
      const initialDelayTimeout = setTimeout(() => {
        // Play sound after the initial delay
        playSlackSound()

        // Then set up the interval for subsequent notifications every 15 seconds
        slackIntervalRef.current = window.setInterval(() => {
          playSlackSound()
        }, 15000) // 15 seconds
      }, 10000) // 10 second initial delay

      // Clean up function
      return () => {
        clearTimeout(initialDelayTimeout)
        if (slackIntervalRef.current) {
          clearInterval(slackIntervalRef.current)
          slackIntervalRef.current = null
        }

        // Also clear any message timeout
        if (slackMessageTimeoutRef.current) {
          clearTimeout(slackMessageTimeoutRef.current)
          slackMessageTimeoutRef.current = null
        }

        setShowSlackMessage(false)
      }
    }

    // Clean up interval when game state changes
    return () => {
      if (slackIntervalRef.current) {
        clearInterval(slackIntervalRef.current)
        slackIntervalRef.current = null
      }

      // Also clear any message timeout
      if (slackMessageTimeoutRef.current) {
        clearTimeout(slackMessageTimeoutRef.current)
        slackMessageTimeoutRef.current = null
      }

      setShowSlackMessage(false)
    }
  }, [gameState, hasWon])

  // Check if audio files exist
  const checkAudioFiles = () => {
    setAudioDebug("Checking audio files...")

    // List of audio files to check
    const audioFiles = [
      "/music/throw.mp3",
      "/music/theme.mp3",
      "/music/anthem.mp3",
      "/music/baby-cry.mp3",
      "/music/ouch.mp3",
      "/music/no.mp3",
      "/music/slack.mp3",
    ]

    // Check each file
    Promise.all(
      audioFiles.map((file) =>
        fetch(file)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`
File
${file}
not
found (${response.status})`)
            }
            return `
${file}
✓`
          })
          .catch((error) => `${file} ✗ (${error.message})`),
      ),
    ).then((results) => {
      setAudioDebug((prev) => prev + "\n" + results.join("\n"))

      // Count how many files were found
      const foundFiles = results.filter((r) => r.includes("✓")).length
      if (foundFiles === audioFiles.length) {
        setAudioDebug((prev) => prev + "\n\nAll audio files found!")
      } else {
        setAudioDebug((prev) => prev + `\n\n${foundFiles}/${audioFiles.length} audio files found.`)
      }
    })
  }

  // Add this function to the Home component, near the checkAudioFiles function

  // Test anthem audio specifically
  const testAnthem = () => {
    setAudioDebug("Testing anthem audio...")

    fetch("/music/anthem.mp3")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Anthem file not found (${response.status})`)
        }
        setAudioDebug((prev) => prev + "\nAnthem file exists on server!")

        // Try to create and play the audio
        try {
          const audio = new Audio("/music/anthem.mp3")

          audio.addEventListener("canplay", () => {
            setAudioDebug((prev) => prev + "\nAnthem can play!")
          })

          audio.addEventListener("error", (e) => {
            setAudioDebug((prev) => prev + `\nAnthem error: ${e.type}`)
          })

          const playPromise = audio.play()
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setAudioDebug((prev) => prev + "\nAnthem playing successfully!")
              })
              .catch((err) => {
                setAudioDebug((prev) => prev + `\nAnthem play error: ${err.message}`)
              })
          }
        } catch (e) {
          const error = e as Error
          setAudioDebug((prev) => prev + `\nAnthem exception: ${error.message}`)
        }
      })
      .catch((error) => {
        setAudioDebug((prev) => prev + `\nAnthem fetch error: ${error.message}`)
      })
  }

  // Test Slack sound
  const testSlackSound = () => {
    setAudioDebug("Testing Slack sound...")
    playSlackSound()
  }

  // Driver state with initial random directions
  const [drivers, setDrivers] = useState<Driver[]>([
    {
      id: "sargam",
      name: "Sargam",
      type: "pregnant",
      image: "/images/sargam.jpeg",
      health: 100,
      defeated: false,
      position: { x: 100, y: 150 },
      speed: 30,
      direction: { x: 0.8, y: 0.2 }, // Normalized direction vector
      directionChangeTimer: Math.random() * 5 + 3, // 3-8 seconds
      carImage: "/images/car-blue.png",
    },
    {
      id: "talia",
      name: "Talia",
      type: "pregnant",
      image: "/images/talia.png",
      health: 100,
      defeated: false,
      position: { x: 100, y: 350 },
      speed: 35,
      direction: { x: 0.3, y: -0.7 },
      directionChangeTimer: Math.random() * 5 + 3,
      carImage: "/images/car-yellow.png",
    },
    {
      id: "anna",
      name: "Anna",
      type: "pregnant",
      image: "/images/anna.jpeg",
      health: 100,
      defeated: false,
      position: { x: 100, y: 450 },
      speed: 20,
      direction: { x: 0.9, y: -0.1 },
      directionChangeTimer: Math.random() * 5 + 3,
      carImage: "/images/car-red.png",
    },
    // Add injured drivers
    {
      id: "dom",
      name: "Dom",
      type: "injured",
      image: "/images/dom.jpeg",
      health: 100,
      defeated: false,
      position: { x: 200, y: 200 },
      speed: 40, // Faster than pregnant drivers
      direction: { x: 0.6, y: 0.4 },
      directionChangeTimer: Math.random() * 5 + 3,
      carImage: "/images/car-green.png",
    },
    {
      id: "laura",
      name: "Laura",
      type: "injured",
      image: "/images/laura.png",
      health: 100,
      defeated: false,
      position: { x: 300, y: 300 },
      speed: 45,
      direction: { x: -0.7, y: 0.3 },
      directionChangeTimer: Math.random() * 5 + 3,
      carImage: "/images/car-blue.png",
    },
    {
      id: "zara",
      name: "Zara",
      type: "injured",
      image: "/images/zara.png",
      health: 100,
      defeated: false,
      position: { x: 400, y: 400 },
      speed: 50,
      direction: { x: -0.2, y: -0.8 },
      directionChangeTimer: Math.random() * 5 + 3,
      carImage: "/images/car-purple.png",
    },
  ])

  // Helper function to normalize a direction vector
  const normalizeDirection = (x: number, y: number) => {
    const length = Math.sqrt(x * x + y * y)
    return { x: x / length, y: y / length }
  }

  // Helper function to get a random direction
  const getRandomDirection = () => {
    const x = Math.random() * 2 - 1 // -1 to 1
    const y = Math.random() * 2 - 1 // -1 to 1
    return normalizeDirection(x, y)
  }

  // Helper function to get a direction toward the center of the screen
  const getDirectionTowardCenter = (position: { x: number; y: number }) => {
    const dx = gameBounds.centerX - position.x
    const dy = gameBounds.centerY - position.y
    return normalizeDirection(dx, dy)
  }

  // Also update the startGame function to stop any existing audio
  const startGame = () => {
    console.log("startGame called!")
    
    // Stop menu theme music first
    audioManager.stop("menuTheme")
    
    // Always initialize audio to ensure it's ready
    console.log("Initializing audio manager...")
    audioManager.initialize()
    
    try {
      // Stop all sounds (including menu theme)
      audioManager.stopAll()
    } catch (error) {
      console.error("Error stopping audio:", error)
    }

    // Clear any existing Slack sound interval
    if (slackIntervalRef.current) {
      clearInterval(slackIntervalRef.current)
      slackIntervalRef.current = null
    }

    // Clear any Slack message timeout
    if (slackMessageTimeoutRef.current) {
      clearTimeout(slackMessageTimeoutRef.current)
      slackMessageTimeoutRef.current = null
    }

    // Hide Slack message
    setShowSlackMessage(false)

    // Stop menu theme when starting game
    audioManager.stop("menuTheme")
    
    // Reset game state
    setGameState("playing")
    setDisplayTime(508) // 8:28 AM
    setLukeHealth(100)
    setParkingCountdown(null)
    setIsInParkingSpot(false)
    setMessage("") // Clear any messages
    setHasWon(false) // Reset victory state
    victoryRef.current = false

    // Set the game start time
    gameStartTimeRef.current = Date.now()

    // Set initial Luke position and direction
    lukePositionRef.current = { x: 600, y: 400 }
    setLukePosition({ x: 600, y: 400 })
    lukeFacingRef.current = "right"

    // Reset drivers with random directions and positions within the visible area
    const resetDrivers = drivers.map((driver) => ({
      ...driver,
      health: 100,
      defeated: false,
      position: {
        x: gameBounds.minX + Math.random() * (gameBounds.maxX - gameBounds.minX),
        y: gameBounds.minY + Math.random() * (gameBounds.maxY - gameBounds.minY),
      },
      direction: getRandomDirection(),
      directionChangeTimer: Math.random() * 5 + 3,
    }))
    setDrivers(resetDrivers)
    driversRef.current = resetDrivers // Initialize ref
    
    // Clear any explosions
    setExplosions([])
    
    // Reset parking spot timer
    parkingSpotTimerRef.current = 0
    setParkingSpotTimer(0)

    // Clear any existing game loop
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current)
    }

    // Reset the score
    setScore(0)

    // Start the game loop
    console.log("Starting game loop...")
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current)
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop)
    console.log("Game loop started, ref:", gameLoopRef.current)

    // Play theme music - wait a bit for audio to initialize
    setTimeout(() => {
      try {
        console.log("Attempting to play theme music...")
        // Just call play - it will handle initialization if needed
        audioManager.play("theme")
        console.log("Theme music play called")
      } catch (error) {
        console.error("Error playing theme music:", error)
      }
    }, 500)
  }

  // Format time (minutes to MM:SS countdown)
  const formatTime = (minutes: number) => {
    // Calculate how much time has elapsed since 8:28 AM
    const elapsedMinutes = minutes - 508 // Current time - 8:28 AM

    // Calculate remaining time (out of 2 minutes)
    const totalSeconds = Math.floor((2 - elapsedMinutes) * 60)
    const minutesRemaining = Math.floor(totalSeconds / 60)
    const secondsRemaining = totalSeconds % 60

    // Make sure we don't show negative time
    if (totalSeconds <= 0) {
      return "0:00"
    }

    // Format as MM:SS
    return `${minutesRemaining}:${secondsRemaining.toString().padStart(2, "0")}`
  }

  // Move Luke's car directly
  const moveLuke = (direction: "up" | "down" | "left" | "right") => {
    if (gameState !== "playing" || !lukeCarRef.current || hasWon) return

    const speed = 20
    let { x, y } = lukePositionRef.current

    // Update position based on direction
    if (direction === "up") {
      y -= speed
      // Update facing direction when moving up
      if (lukeFacingRef.current !== "up") {
        lukeFacingRef.current = "up"
        // Rotate car to face up
        if (lukeCarRef.current) {
          lukeCarRef.current.style.transform = "rotate(-90deg)"
        }
      }
    }

    if (direction === "down") {
      y += speed
      // Update facing direction when moving down
      if (lukeFacingRef.current !== "down") {
        lukeFacingRef.current = "down"
        // Rotate car to face down
        if (lukeCarRef.current) {
          lukeCarRef.current.style.transform = "rotate(90deg)"
        }
      }
    }

    if (direction === "left") {
      x -= speed
      // Update facing direction when moving left
      if (lukeFacingRef.current !== "left") {
        lukeFacingRef.current = "left"
        // Flip the car to face left
        if (lukeCarRef.current) {
          lukeCarRef.current.style.transform = "scaleX(-1)"
        }
      }
    }

    if (direction === "right") {
      x += speed
      // Update facing direction when moving right
      if (lukeFacingRef.current !== "right") {
        lukeFacingRef.current = "right"
        // Reset transform to face right
        if (lukeCarRef.current) {
          lukeCarRef.current.style.transform = "scaleX(1)"
        }
      }
    }

    // Constrain to game area - allow movement across the entire screen
    x = Math.max(50, Math.min(1150, x))
    y = Math.max(100, Math.min(700, y))

    // Update position reference and state
    lukePositionRef.current = { x, y }
    setLukePosition({ x, y })

    // Directly update DOM for immediate feedback
    if (lukeCarRef.current) {
      lukeCarRef.current.style.left = `${x}px`
      lukeCarRef.current.style.top = `${y}px`
    }
  }

  // Add a score effect function to show score changes
  const scoreEffect = (points: number, x: number, y: number) => {
    if (!gameContainerRef.current) return

    const effect = document.createElement("div")
    effect.className = `absolute z-50 font-bold text-xl ${points > 0 ? "text-green-400" : "text-red-400"} animate-bounce`
    effect.style.left = `${x}px`
    effect.style.top = `${y}px`
    effect.textContent = points > 0 ? `+${points}` : `${points}`

    gameContainerRef.current.appendChild(effect)

    // Remove after animation
    setTimeout(() => {
      effect.remove()
    }, 1000)
  }

  // Find the throwHotdog function and update it to play the sound effect when a hot dog is thrown

  // Throw a hotdog
  const throwHotdog = () => {
    if (gameState !== "playing" || hasWon) return

    const now = Date.now()
    if (now - lastHotdogTime.current < 300) return // Cooldown

    lastHotdogTime.current = now

    // Play throw sound effect
    audioManager.play("throw")

    // Create hotdog element
    const hotdog = document.createElement("div")
    hotdog.className = "absolute z-20"

    // Create image element for the hot dog
    const hotdogImg = document.createElement("img")
    hotdogImg.src = "/images/hot-dog.png"
    hotdogImg.className = "w-16 h-auto"
    hotdogImg.alt = "Hot Dog"

    // Append image to the hotdog div
    hotdog.appendChild(hotdogImg)

    // Position hotdog at Luke's car
    if (lukeCarRef.current) {
      const { x, y } = lukePositionRef.current

      // Position based on which direction Luke is facing
      if (lukeFacingRef.current === "right") {
        hotdog.style.left = `${x + 100}px`
        hotdog.style.top = `${y + 30}px`
        hotdog.style.transform = "rotate(12deg)"
        hotdog.dataset.direction = "right" // Store direction for movement
      } else if (lukeFacingRef.current === "left") {
        hotdog.style.left = `${x - 20}px`
        hotdog.style.top = `${y + 30}px`
        hotdog.style.transform = "scaleX(-1) rotate(12deg)" // Flip hotdog
        hotdog.dataset.direction = "left" // Store direction for movement
      } else if (lukeFacingRef.current === "up") {
        hotdog.style.left = `${x + 30}px`
        hotdog.style.top = `${y - 20}px`
        hotdog.style.transform = "rotate(-78deg)" // Rotate hotdog to face up
        hotdog.dataset.direction = "up" // Store direction for movement
      } else if (lukeFacingRef.current === "down") {
        hotdog.style.left = `${x + 30}px`
        hotdog.style.top = `${y + 80}px`
        hotdog.style.transform = "rotate(102deg)" // Rotate hotdog to face down
        hotdog.dataset.direction = "down" // Store direction for movement
      }

      // Add to game container
      gameContainerRef.current?.appendChild(hotdog)

      // Add to hotdogs ref
      hotdogsRef.current.push(hotdog)
    }
  }

  // Find the enemyAttack function and update it to use the bottle and crutches images

  // Enemy attack
  const enemyAttack = (driver: Driver) => {
    // Adjust attack probability to 0.01 (1% chance per frame) - in between the original 0.02 and current 0.005
    if (driver.defeated || Math.random() > 0.01 || hasWon) return

    // Create projectile element
    const projectile = document.createElement("div")
    projectile.className = "absolute z-20"

    // Create image element for the projectile
    const projectileImg = document.createElement("img")

    if (driver.type === "pregnant") {
      projectileImg.src = "/images/bottle.png"
      projectileImg.className = "w-10 h-auto"
      projectileImg.alt = "Baby Bottle"
    } else {
      projectileImg.src = "/images/crutches.png"
      projectileImg.className = "w-12 h-auto"
      projectileImg.alt = "Crutches"
      projectile.style.transform = "rotate(45deg)"
    }

    // Append image to the projectile div
    projectile.appendChild(projectileImg)

    // Position projectile at driver's car
    projectile.style.left = `${driver.position.x + 50}px`
    projectile.style.top = `${driver.position.y + 30}px`

    // Calculate direction vector towards Luke
    const lukePos = lukePositionRef.current
    const dx = lukePos.x - driver.position.x
    const dy = lukePos.y - driver.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Normalize and store direction
    projectile.dataset.dirX = (dx / distance).toString()
    projectile.dataset.dirY = (dy / distance).toString()

    // Add to game container
    gameContainerRef.current?.appendChild(projectile)

    // Add to enemy projectiles ref
    enemyProjectilesRef.current.push(projectile)
  }

  // Game loop
  const gameLoop = () => {
    // Skip if game is over
    if (hasWon || victoryRef.current) {
      return
    }

    // Calculate elapsed time since game start
    const currentTime = Date.now()
    const elapsedTime = currentTime - gameStartTimeRef.current

    // Check if time is up (2 minutes = 120000ms)
    if (elapsedTime >= gameDurationRef.current) {
      endGame(false)
      return
    }

    // Calculate and update display time
    // Map 0-120000ms to 508-510 minutes (8:28 AM to 8:30 AM)
    const gameTimeMinutes = 508 + (elapsedTime / gameDurationRef.current) * 2
    setDisplayTime(gameTimeMinutes)

    // Get Luke's current position
    const lukeX = lukePositionRef.current.x
    const lukeY = lukePositionRef.current.y

    // Check if Luke is in the parking spot
    const inSpot =
      lukeX >= PARKING_SPOT_AREA.left &&
      lukeX <= PARKING_SPOT_AREA.right &&
      lukeY >= PARKING_SPOT_AREA.top &&
      lukeY <= PARKING_SPOT_AREA.bottom

    // Update state only if it changed
    if (inSpot !== isInParkingSpot) {
      setIsInParkingSpot(inSpot)
    }

    // Debug message
    if (debug && inSpot !== isInParkingSpot) {
      console.log(inSpot ? "ENTERED PARKING SPOT!" : "LEFT PARKING SPOT!")
    }

    // Reset parking timer when not in spot
    if (!inSpot) {
      parkingTimerRef.current = 0
      isParkedRef.current = false
      parkingMessageShownRef.current = false
      setParkingCountdown(null)

      // Clear parking-related messages
      if (message.startsWith("Parking commenced") || message.startsWith("You need to defeat")) {
        setMessage("")
      }
    }

    // Check if all drivers are defeated
    // IMPORTANT: Use driversRef.current which is synced immediately when drivers are updated
    // Check both defeated flag AND health <= 0 to catch any edge cases
    const allDefeated = driversRef.current.length > 0 && driversRef.current.every((driver: Driver) => {
      const isDefeated = driver.defeated || driver.health <= 0
      return isDefeated
    })
    
    // Debug: Log victory condition status every frame when in spot
    if (inSpot && !victoryRef.current) {
      if (parkingSpotTimerRef.current === 0) {
        console.log("🔍 Checking victory conditions:")
        console.log("  - inSpot:", inSpot, "| Luke position:", { x: lukeX, y: lukeY })
        console.log("  - allDefeated:", allDefeated)
        console.log("  - driversRef.current length:", driversRef.current.length)
        console.log("  - Drivers from ref:", driversRef.current.map(d => `${d.name}: defeated=${d.defeated}, health=${d.health}`).join(', '))
        console.log("  - Drivers from state:", drivers.map(d => `${d.name}: defeated=${d.defeated}, health=${d.health}`).join(', '))
        console.log("  - PARKING_SPOT_AREA:", PARKING_SPOT_AREA)
      }
    }
    
    // Debug: Log when victory conditions are first met
    const currentAllDefeated = driversRef.current.length > 0 && driversRef.current.every((driver: Driver) => driver.defeated || driver.health <= 0)
    
    if (inSpot && currentAllDefeated && parkingSpotTimerRef.current === 0 && !victoryRef.current) {
      console.log("🎯 VICTORY CONDITIONS MET - Starting 3 second timer!")
      console.log("  - inSpot:", inSpot, "| Luke position:", { x: lukeX, y: lukeY })
      console.log("  - currentAllDefeated:", currentAllDefeated)
      console.log("  - Drivers from ref:", driversRef.current.map(d => `${d.name}: defeated=${d.defeated}, health=${d.health}`).join(', '))
    }

    // VICTORY CHECK - Luke must be in parking spot for 3 seconds AFTER all drivers are defeated
    if (inSpot && currentAllDefeated && !victoryRef.current) {
      // Start countdown sound when timer begins
      if (parkingSpotTimerRef.current === 0) {
        console.log("🔊 Starting countdown sound and pausing theme music")
        audioManager.stop("theme")
        audioManager.play("countdown")
      }
      
      // Use ref to track timer (more reliable than state in game loop)
      parkingSpotTimerRef.current += 0.016 // Add frame time (60fps)
      const currentTimer = parkingSpotTimerRef.current
      
      // Update state for UI display
      setParkingSpotTimer(currentTimer)
      
      // Log progress every 0.5 seconds
      const logInterval = Math.floor(currentTimer * 2)
      const prevLogInterval = Math.floor((currentTimer - 0.016) * 2)
      if (logInterval !== prevLogInterval && currentTimer > 0) {
        console.log(`⏱️ Parking timer: ${currentTimer.toFixed(2)}s / 3.0s | inSpot: ${inSpot} | currentAllDefeated: ${currentAllDefeated}`)
      }
      
      if (currentTimer >= 3.0) {
        // 3 seconds elapsed - trigger victory!
        console.log("🎉🎉🎉 WIN CONDITION MET - Luke has been in parking spot for 3 seconds after defeating all drivers! 🎉🎉🎉")
        console.log("  - inSpot:", inSpot)
        console.log("  - currentAllDefeated:", currentAllDefeated)
        console.log("  - timer:", currentTimer)
        console.log("  - Final drivers status:", driversRef.current.map(d => `${d.name}: defeated=${d.defeated}, health=${d.health}`).join(', '))

        // Calculate time bonus (1 point per second remaining)
        const currentTime = Date.now()
        const elapsedTime = currentTime - gameStartTimeRef.current
        const timeLeftMs = Math.max(0, gameDurationRef.current - elapsedTime)
        const timeLeftSeconds = Math.floor(timeLeftMs / 1000)
        const timeBonus = timeLeftSeconds // 1 point per second

        // Add time bonus to score
        setScore((prev) => {
          const newScore = prev + timeBonus
          console.log(`🏆 Victory bonus: ${timeBonus} points for ${timeLeftSeconds}s remaining = Total: ${newScore} dawgs`)
          return newScore
        })

        // Stop countdown sound
        audioManager.stop("countdown")

        // Stop Slack sound interval
        if (slackIntervalRef.current) {
          clearInterval(slackIntervalRef.current)
          slackIntervalRef.current = null
        }

        // Clear any Slack message timeout
        if (slackMessageTimeoutRef.current) {
          clearTimeout(slackMessageTimeoutRef.current)
          slackMessageTimeoutRef.current = null
        }

        // Hide Slack message
        setShowSlackMessage(false)

        // Stop theme music
        audioManager.stop("theme")

        // Play victory anthem (only once - victory-screen will also play it, so we'll remove this)
        // audioManager.play("anthem") // Removed - victory-screen will handle this

        // Set victory flags
        victoryRef.current = true

        // Cancel the game loop
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current)
          gameLoopRef.current = null
        }

        // Set hasWon immediately to show victory screen
        setHasWon(true)
        
        // Show victory message (but victory screen will appear immediately)
        showMessage("VICTORY!", 1500)
      }
    } else {
      // Reset timer if not in spot or not all defeated
      if (parkingSpotTimerRef.current > 0) {
        if (parkingSpotTimerRef.current > 0.1) {
          const checkAllDefeated = driversRef.current.length > 0 && driversRef.current.every((driver: Driver) => driver.defeated || driver.health <= 0)
          console.log("⏸️ Timer reset - conditions not met:", { inSpot, checkAllDefeated, victoryRef: victoryRef.current })
          console.log("  - Drivers status:", driversRef.current.map(d => `${d.name}: defeated=${d.defeated}, health=${d.health}`).join(', '))
        }
        parkingSpotTimerRef.current = 0
        setParkingSpotTimer(0)
        // Stop countdown sound when timer is reset
        audioManager.stop("countdown")
      }
    }

    // Update drivers with dynamic movement
    setDrivers((prevDrivers) => {
      const updated = prevDrivers.map((driver) => {
        if (driver.defeated) return driver

        // Calculate new position based on direction and speed
        const deltaTime = 0.016 // 60fps
        const newX = driver.position.x + driver.direction.x * driver.speed * deltaTime
        const newY = driver.position.y + driver.direction.y * driver.speed * deltaTime

        // Check if driver is going out of bounds
        const isOutOfBounds =
          newX < gameBounds.minX || newX > gameBounds.maxX || newY < gameBounds.minY || newY > gameBounds.maxY

        // Initialize new direction variables
        let newDirX = driver.direction.x
        let newDirY = driver.direction.y
        let posX = newX
        let posY = newY
        let newDirectionChangeTimer = driver.directionChangeTimer - deltaTime

        // If driver is going out of bounds, force a direction change toward center
        if (isOutOfBounds) {
          const towardCenter = getDirectionTowardCenter(driver.position)

          // Mix current direction with direction toward center (weighted more toward center)
          newDirX = newDirX * 0.2 + towardCenter.x * 0.8
          newDirY = newDirY * 0.2 + towardCenter.y * 0.8

          // Normalize the new direction
          const normalized = normalizeDirection(newDirX, newDirY)
          newDirX = normalized.x
          newDirY = normalized.y

          // Ensure we're not at the edge by moving slightly toward center
          posX = Math.max(gameBounds.minX, Math.min(gameBounds.maxX, posX))
          posY = Math.max(gameBounds.minY, Math.max(gameBounds.maxY, posY))

          // Reset direction change timer
          newDirectionChangeTimer = Math.random() * 5 + 3
        }
        // Regular direction change based on timer
        else if (newDirectionChangeTimer <= 0) {
          // Get a new random direction, but with some bias toward staying on screen
          const randomX = Math.random() * 2 - 1 // -1 to 1
          const randomY = Math.random() * 2 - 1 // -1 to 1

          // If near edge, bias toward center
          if (posX < gameBounds.minX + 100) {
            // Near left edge, bias right
            const towardCenter = getDirectionTowardCenter(driver.position)
            newDirX = randomX * 0.3 + towardCenter.x * 0.7
            newDirY = randomY * 0.3 + towardCenter.y * 0.7
          } else if (posX > gameBounds.maxX - 100) {
            // Near right edge, bias left
            const towardCenter = getDirectionTowardCenter(driver.position)
            newDirX = randomX * 0.3 + towardCenter.x * 0.7
            newDirY = randomY * 0.3 + towardCenter.y * 0.7
          } else if (posY < gameBounds.minY + 100) {
            // Near top edge, bias down
            const towardCenter = getDirectionTowardCenter(driver.position)
            newDirX = randomX * 0.3 + towardCenter.x * 0.7
            newDirY = randomY * 0.3 + towardCenter.y * 0.7
          } else if (posY > gameBounds.maxY - 100) {
            // Near bottom edge, bias up
            const towardCenter = getDirectionTowardCenter(driver.position)
            newDirX = randomX * 0.3 + towardCenter.x * 0.7
            newDirY = randomY * 0.3 + towardCenter.y * 0.7
          } else {
            // Not near edge, use random direction
            newDirX = randomX
            newDirY = randomY
          }

          // Normalize the new direction
          const normalized = normalizeDirection(newDirX, newDirY)
          newDirX = normalized.x
          newDirY = normalized.y

          // Reset timer (3-8 seconds)
          newDirectionChangeTimer = Math.random() * 5 + 3
        }

        // Update driver element position
        const driverElement = document.getElementById(`driver-${driver.id}`)
        if (driverElement) {
          driverElement.style.left = `${posX}px`
          driverElement.style.top = `${posY}px`

          // Flip driver based on direction
          if (newDirX < 0) {
            driverElement.style.transform = "scaleX(-1)"
          } else {
            driverElement.style.transform = "scaleX(1)"
          }
        }

        // Random chance to attack
        enemyAttack(driver)

        // Return updated driver
        return {
          ...driver,
          position: { x: posX, y: posY },
          direction: { x: newDirX, y: newDirY },
          directionChangeTimer: newDirectionChangeTimer,
        }
      })
      driversRef.current = updated // Sync ref with latest state
      return updated
    })

    // Move hotdogs
    hotdogsRef.current.forEach((hotdog, index) => {
      const currentLeft = Number.parseInt(hotdog.style.left || "0")
      const currentTop = Number.parseInt(hotdog.style.top || "0")
      const speed = 10

      // Move based on direction
      if (hotdog.dataset.direction === "left") {
        hotdog.style.left = `${currentLeft - speed}px`
        // Remove if out of bounds
        if (currentLeft < -50) {
          hotdog.remove()
          hotdogsRef.current.splice(index, 1)
        }
      } else if (hotdog.dataset.direction === "right") {
        hotdog.style.left = `${currentLeft + speed}px`
        // Remove if out of bounds
        if (currentLeft > 1200) {
          hotdog.remove()
          hotdogsRef.current.splice(index, 1)
        }
      } else if (hotdog.dataset.direction === "up") {
        hotdog.style.top = `${currentTop - speed}px`
        // Remove if out of bounds
        if (currentTop < -50) {
          hotdog.remove()
          hotdogsRef.current.splice(index, 1)
        }
      } else if (hotdog.dataset.direction === "down") {
        hotdog.style.top = `${currentTop + speed}px`
        // Remove if out of bounds
        if (currentTop > 800) {
          hotdog.remove()
          hotdogsRef.current.splice(index, 1)
        }
      }

      // Check for collisions with drivers
      drivers.forEach((driver) => {
        if (driver.defeated) return

        const driverElement = document.getElementById(`driver-${driver.id}`)
        if (!driverElement) return

        const hotdogRect = hotdog.getBoundingClientRect()
        const driverRect = driverElement.getBoundingClientRect()

        if (
          hotdogRect.left < driverRect.right &&
          hotdogRect.right > driverRect.left &&
          hotdogRect.top < driverRect.bottom &&
          hotdogRect.bottom > driverRect.top
        ) {
          // Hit driver
          setDrivers((prev) => {
            const updated = prev.map((d) => {
              if (d.id === driver.id) {
                const newHealth = Math.max(0, d.health - 20) // Ensure health doesn't go below 0
                const isNowDefeated = newHealth <= 0 && !d.defeated
                
                // If driver just got defeated, trigger explosion and play sound
                if (isNowDefeated) {
                  console.log(`💥 Driver ${driver.name} defeated - triggering explosion`)
                  
                  // Capture the driver's actual DOM position BEFORE the car disappears
                  const driverElement = document.getElementById(`driver-${driver.id}`)
                  let explosionX = driver.position.x
                  let explosionY = driver.position.y
                  
                  if (driverElement && gameContainerRef.current) {
                    const driverRect = driverElement.getBoundingClientRect()
                    const gameRect = gameContainerRef.current.getBoundingClientRect()
                    // Calculate center of driver relative to game container
                    explosionX = driverRect.left - gameRect.left + (driverRect.width / 2)
                    explosionY = driverRect.top - gameRect.top + (driverRect.height / 2)
                    console.log(`📍 Captured driver ${driver.id} DOM position: (${explosionX}, ${explosionY}) from rect (${driverRect.left}, ${driverRect.top})`)
                  } else {
                    console.warn(`⚠️ Could not find driver element ${driver.id}, using stored position (${driver.position.x}, ${driver.position.y})`)
                  }
                  
                  setExplosions(prev => [...prev, { 
                    id: driver.id, 
                    x: explosionX, 
                    y: explosionY 
                  }])
                  
                  // Play explosion sound effect
                  audioManager.play("explosion")
                  
                  // Play defeat sound based on driver
                  const driverName = driver.name.toLowerCase()
                  if (driverName === "sargam" || driverName === "talia" || driverName === "anna") {
                    console.log(`🔊 Playing baby-cry sound for ${driver.name}`)
                    audioManager.play("babyCry")
                  } else if (driverName === "dom" || driverName === "laura" || driverName === "zara") {
                    console.log(`🔊 Playing ouch sound for ${driver.name}`)
                    audioManager.play("ouch")
                  }
                }
                
                return {
                  ...d,
                  health: newHealth,
                  defeated: newHealth <= 0,
                }
              }
              return d
            })
            driversRef.current = updated // Sync ref immediately after update
            return updated
          })

          // Add points for hitting a driver
          const hitPoints = 50
          setScore((prev) => prev + hitPoints)
          scoreEffect(hitPoints, driver.position.x, driver.position.y)

          // Remove hotdog
          hotdog.remove()
          hotdogsRef.current.splice(index, 1)

          // Show hit effect
          const hitEffect = document.createElement("div")
          hitEffect.className = "absolute w-20 h-20 bg-red-500 rounded-full opacity-50 animate-ping z-30"
          hitEffect.style.left = `${driver.position.x + 30}px`
          hitEffect.style.top = `${driver.position.y + 20}px`
          gameContainerRef.current?.appendChild(hitEffect)

          // Remove hit effect after animation
          setTimeout(() => {
            hitEffect.remove()
          }, 500)

          // Show message
          showMessage(`Hit ${driver.name}!`, 1000)
        }
      })
    })

    // Move enemy projectiles
    enemyProjectilesRef.current.forEach((projectile, index) => {
      // Get current position
      const currentLeft = Number.parseInt(projectile.style.left || "0")
      const currentTop = Number.parseInt(projectile.style.top || "0")

      // Get direction vector
      const dirX = Number.parseFloat(projectile.dataset.dirX || "0")
      const dirY = Number.parseFloat(projectile.dataset.dirY || "0")

      // Move projectile towards Luke - reduced speed from 5 to 3
      const speed = 3
      projectile.style.left = `${currentLeft + dirX * speed}px`
      projectile.style.top = `${currentTop + dirY * speed}px`

      // Remove if out of bounds
      if (currentLeft < -50 || currentLeft > 1200 || currentTop < -50 || currentTop > 800) {
        projectile.remove()
        enemyProjectilesRef.current.splice(index, 1)
      }

      // Check for collision with Luke
      if (lukeCarRef.current) {
        const projectileRect = projectile.getBoundingClientRect()
        const lukeRect = lukeCarRef.current.getBoundingClientRect()

        if (
          projectileRect.left < lukeRect.right &&
          projectileRect.right > lukeRect.left &&
          projectileRect.top < lukeRect.bottom &&
          projectileRect.bottom > lukeRect.top
        ) {
          // Hit Luke
          setLukeHealth((prev) => {
            const newHealth = prev - 2 // Reduced damage from 10 to 2
            if (newHealth <= 0) {
              endGame(false)
              return 0
            }
            return newHealth
          })

          // Subtract points for getting hit
          const hitPenalty = -10
          setScore((prev) => Math.max(0, prev + hitPenalty))
          scoreEffect(hitPenalty, lukeX, lukeY)

          // Remove projectile
          projectile.remove()
          enemyProjectilesRef.current.splice(index, 1)

          // Show hit effect
          const hitEffect = document.createElement("div")
          hitEffect.className = "absolute w-full h-full border-4 border-red-500 animate-pulse opacity-50 z-30"
          lukeCarRef.current.appendChild(hitEffect)

          // Remove hit effect after animation
          setTimeout(() => {
            hitEffect.remove()
          }, 300)
        }
      }
    })

    // Continue game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }

  // End the game
  const endGame = (victory: boolean) => {
    console.log(`Ending game with ${victory ? "VICTORY" : "DEFEAT"}`)

    // Cancel the game loop
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current)
      gameLoopRef.current = null
    }

    // Stop Slack sound interval
    if (slackIntervalRef.current) {
      clearInterval(slackIntervalRef.current)
      slackIntervalRef.current = null
    }

    // Clear any Slack message timeout
    if (slackMessageTimeoutRef.current) {
      clearTimeout(slackMessageTimeoutRef.current)
      slackMessageTimeoutRef.current = null
    }

    // Hide Slack message
    setShowSlackMessage(false)

    // Stop all sounds
    audioManager.stopAll()

    // Pause theme music - more aggressive approach
    if (themeAudioRef.current) {
      console.log("Pausing theme music from themeAudioRef")
      themeAudioRef.current.pause()
      themeAudioRef.current = null
    }

    // Try to find and pause theme audio by ID
    const themeAudio = document.getElementById("theme-audio") as HTMLAudioElement
    if (themeAudio) {
      console.log("Found theme audio element, pausing it")
      themeAudio.pause()
    }

    // Try to access window.themeAudio if it exists
    const anyWindow = window as any
    if (anyWindow.themeAudio) {
      console.log("Found window.themeAudio, pausing it")
      anyWindow.themeAudio.pause()
    }

    // Pause all audio elements except the one we're about to play
    const audioElements = document.querySelectorAll("audio")
    audioElements.forEach((audio) => {
      if (!audio.src.includes("anthem") && !audio.src.includes("no")) {
        console.log("Pausing audio:", audio.src)
        audio.pause()
      }
    })

    if (victory) {
      // Calculate time left in seconds
      const currentTime = Date.now()
      const elapsedTime = currentTime - gameStartTimeRef.current
      const timeLeftMs = Math.max(0, gameDurationRef.current - elapsedTime)
      const timeLeftSeconds = Math.floor(timeLeftMs / 1000)

      // Add bonus points for time left (1 point per second)
      const timeBonus = timeLeftSeconds // 1 point per second
      
      setScore((prev) => {
        const newScore = prev + timeBonus
        console.log(`🏆 Victory bonus: ${timeBonus} points for ${timeLeftSeconds}s remaining = Total: ${newScore} dawgs`)
        return newScore
      })

      // Stop theme music
      audioManager.stop("theme")
      
      // Don't play anthem here - victory-screen will handle it
      // audioManager.play("anthem") // Removed - victory-screen will handle this
    } else {
      // Play defeat sound
      audioManager.play("no")
    }

    // Use setTimeout to ensure state updates happen after the current execution
    setTimeout(() => {
      if (victory) {
        // Use our simple direct victory approach
        console.log("Setting victory state in endGame")
        setHasWon(true)
        victoryRef.current = true
      } else {
        setGameState("defeat")
      }
      setParkingCountdown(null)
      setMessage("") // Clear any messages
    }, 50)

    // Clean up projectiles
    hotdogsRef.current.forEach((hotdog) => hotdog.remove())
    hotdogsRef.current = []

    enemyProjectilesRef.current.forEach((projectile) => projectile.remove())
    enemyProjectilesRef.current = []
  }

  // Toggle debug mode
  const toggleDebug = () => {
    setDebug(!debug)
  }

  const showMessage = (text: string, duration = 1000) => {
    const id = messageId + 1
    setMessageId(id)
    setMessage(text)

    // Clear this specific message after duration
    setTimeout(() => {
      // Only clear if it's still the same message
      if (messageId === id) {
        setMessage("")
      }
    }, duration)
  }

  // Handle keyboard input - improved to allow simultaneous actions
  useEffect(() => {
    const keysPressed = new Set<string>()

    // Process keys at regular intervals to allow simultaneous actions
    const processKeysInterval = setInterval(() => {
      if (gameState !== "playing") return

      // Process movement if any movement keys are pressed
      if (keysPressed.has("w") || keysPressed.has("W")) {
        moveLuke("up")
      }
      if (keysPressed.has("s") || keysPressed.has("S")) {
        moveLuke("down")
      }
      if (keysPressed.has("a") || keysPressed.has("A")) {
        moveLuke("left")
      }
      if (keysPressed.has("d") || keysPressed.has("D")) {
        moveLuke("right")
      }

      // Process shooting separately from movement
      if (keysPressed.has(" ") || keysPressed.has("Space")) {
        throwHotdog()
      }
    }, 50) // Process keys every 50ms

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for game controls to avoid browser scrolling
      if (["w", "W", "a", "A", "s", "S", "d", "D", " ", "Space"].includes(e.key) || e.code === "Space") {
        e.preventDefault()
      }

      // Add key to the set of pressed keys
      keysPressed.add(e.key)
      if (e.code === "Space") {
        keysPressed.add("Space")
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Remove key from the set of pressed keys
      keysPressed.delete(e.key)
      if (e.code === "Space") {
        keysPressed.delete("Space")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      clearInterval(processKeysInterval)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [gameState])

  // Render start screen
  const onInitializeAudio = () => {
    // This will be called when the user clicks "Enable Sound"
    audioManager.initialize()
  }

  // Debug: Log gameState changes
  useEffect(() => {
    console.log("Game state changed to:", gameState)
  }, [gameState])

  // Play menu theme music when on start screen (after user interaction from intro screen)
  useEffect(() => {
    if (gameState === "start") {
      // Initialize audio if not already done
      if (!audioManager.initialized) {
        audioManager.initialize()
      }
      
      // Start menu theme immediately (user has already interacted by clicking intro button)
      console.log("Starting menu theme music...")
      audioManager.play("menuTheme")
    } else {
      // Stop menu theme when leaving start screen (only stop if going to playing/victory/defeat)
      if (gameState === "playing" || gameState === "victory" || gameState === "defeat") {
        console.log("Stopping menu theme music...")
        audioManager.stop("menuTheme")
      }
    }
  }, [gameState]) // Only depend on gameState to avoid loops

  // Render login screen
  if (gameState === "auth") {
    return <LoginScreen onAuthenticated={() => setGameState("intro")} />
  }

  // Render intro/splash screen
  if (gameState === "intro") {
    return (
      <div 
        className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4 font-quicksand cursor-pointer"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log("Intro screen clicked - transitioning to start screen")
          // Initialize audio on user interaction
          if (!audioManager.initialized) {
            audioManager.initialize()
          }
          // Transition to start screen (music will start via useEffect)
          setGameState("start")
        }}
      >
        <div className="flex flex-col items-center justify-center gap-8 p-8 max-w-2xl text-center">
          <div className="mb-4">
            <img src="/images/tracksuit-logo-purple.png" alt="Tracksuit" className="w-[300px] mx-auto" />
          </div>
          <h1 className="text-6xl font-bold text-red-500 mb-4">Parking Simulator</h1>
          <p className="text-2xl text-gray-300 mb-8">Click anywhere to begin</p>
        </div>
      </div>
    )
  }

  if (gameState === "start") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4 font-quicksand">
        <div className="flex flex-col items-center justify-center gap-8 p-8 max-w-2xl text-center">
          <div className="mb-4">
            <img src="/images/tracksuit-logo-purple.png" alt="Tracksuit" className="w-[300px] mx-auto" />
          </div>
          <h1 className="text-4xl font-bold text-red-500">Parking Simulator</h1>

          <div className="relative w-[200px] h-[200px] mx-auto">
            <img src="/images/luke.png" alt="Luke Amundson" className="w-full h-full object-contain" />
          </div>

          <div className="space-y-4">
            <p className="text-xl">
              Play as Luke Amundson, Head of Sales ANZ at Tracksuit, in his daily battle for the priority parking space
              - normally reserved for expectant parents and the temporarily injured!
            </p>
            <p>
              Your first meeting is at 8:30 AM, but it's 8:28 AM and there's only one spot left - and it's the closest
              to the office. Defeat your pregnant and injured colleagues by throwing Kirkland™ hot dogs at their cars
              before they take your spot!
            </p>

            <div className="bg-gray-800 p-4 rounded-md">
              <h3 className="font-bold mb-2">How to Play:</h3>
              <ul className="text-left list-disc pl-5 space-y-1">
                <li>Use WASD keys to move Luke's car (W=up, A=left, S=down, D=right)</li>
                <li>Press SPACE to throw hot dogs at the approaching cars</li>
                <li>Pregnant drivers throw baby bottles, injured drivers throw crutches</li>
                <li>To win: Defeat all drivers AND park in the green spot</li>
                <li>Don't let your health reach zero!</li>
                <li>Land that sweet alpha parking spot before 8:30 AM!</li>
              </ul>
            </div>
          </div>

          <Button
            size="lg" 
            onClick={(e) => {
              console.log("Button clicked!", e)
              e.preventDefault()
              e.stopPropagation()
              console.log("About to call startGame")
              startGame()
              console.log("startGame returned")
            }} 
            type="button"
            className="bg-red-600 hover:bg-red-700"
          >
            Start Game
          </Button>
        </div>
      </div>
    )
  }

  // Render defeat screen
  if (gameState === "defeat") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white font-quicksand">
        <DefeatScreen onRestart={startGame} />
      </div>
    )
  }

  // Replace the entire inline victory screen block:
  if (hasWon) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white font-quicksand">
        <VictoryScreen onRestart={startGame} score={score} />
      </div>
    )
  }

  // Render game screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white font-quicksand">
      <div
        ref={gameContainerRef}
        className="relative w-full max-w-4xl h-[800px] bg-gray-800 overflow-hidden focus:outline-none"
        tabIndex={0}
      >
        {/* Tracksuit header */}
        <div className="absolute top-0 left-0 right-0 h-[100px] bg-purple-200 flex items-center justify-center">
          <h1 className="text-5xl font-bold text-black">Tracksuit</h1>
        </div>
        {/* Parking layout */}
        <div className="absolute top-[100px] left-0 right-0 bottom-0 flex z-0">
          {/* Left column of parking spots */}
          <div className="w-1/2 flex flex-col space-y-4 p-4">
            {[1, 2, 3, 4].map((spot) => (
              <div key={`left-${spot}`} className="h-[100px] bg-pink-200 rounded-3xl flex items-center justify-center">
                <span className="text-2xl text-black font-bold">Parking spot</span>
              </div>
            ))}
          </div>

          {/* Right column of parking spots */}
          <div className="w-1/2 flex flex-col space-y-4 p-4">
            {/* This is the winning parking spot */}
            <div
              ref={parkingSpotRef}
              className="h-[100px] bg-green-200 rounded-3xl flex items-center justify-center relative"
              id="winning-spot"
            >
              <span className="text-2xl text-black font-bold">WINNING SPOT</span>
              {/* Add visual indicator for the winning spot */}
              <div className="absolute inset-0 border-4 border-green-500 rounded-3xl animate-pulse"></div>
            </div>
            {[1, 2, 3].map((spot) => (
              <div key={`right-${spot}`} className="h-[100px] bg-pink-200 rounded-3xl flex items-center justify-center">
                <span className="text-2xl text-black font-bold">Parking spot</span>
              </div>
            ))}
          </div>
        </div>
        {debug && (
          <div
            className="absolute border-4 border-yellow-500 z-40 pointer-events-none"
            style={{
              left: "425px",
              top: "100px",
              width: "400px",
              height: "120px",
              opacity: 0.5,
            }}
          >
            <div className="absolute inset-0 bg-yellow-300 opacity-30"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black font-bold">
              Parking Detection Area
            </div>
          </div>
        )}
        {/* Game UI */}
        <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-start">
          <div className="bg-black/50 p-2 rounded-md">
            <p className="text-sm">Time: {formatTime(displayTime)}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Luke</span>
                <span className="text-sm">{lukeHealth}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    lukeHealth > 50 ? "bg-green-500" : lukeHealth > 25 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, lukeHealth))}%` }}
                />
              </div>
            </div>
            <p className="text-sm">Score: {score}</p>
            {isInParkingSpot && <p className="text-green-500 font-bold">IN PARKING SPOT!</p>}
            {parkingSpotTimer > 0 && driversRef.current.every((d) => d.defeated || d.health <= 0) && (
              <p className="text-yellow-400 font-bold">
                Parking... {Math.ceil(3 - parkingSpotTimer)}s
              </p>
            )}
          </div>

          {/* Driver health bars */}
          <div className="bg-black/50 p-2 rounded-md max-w-xs">
            <h3 className="text-xs font-bold mb-1">Drivers:</h3>
            {drivers.map((driver) => (
              <div key={driver.id} className="flex items-center gap-2 mb-1">
                <span className="text-xs w-16 truncate">{driver.name}</span>
                <div className="w-20 h-2 bg-gray-700 rounded">
                  <div
                    className={`h-full rounded ${driver.defeated ? "bg-gray-500" : "bg-red-500"}`}
                    style={{ width: `${driver.health}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Luke's car */}
        <div
          ref={lukeCarRef}
          id="luke-car"
          className="absolute z-30"
          style={{ 
            left: `${lukePosition.x}px`, 
            top: `${lukePosition.y}px`,
            width: "140px",
            height: "80px"
          }}
        >
          <img src="/images/minivan.png" alt="Luke's Car" className="w-full h-full object-contain" />
          {/* Luke's avatar */}
          <div className="absolute top-[-40px] left-[10px] w-[40px] h-[40px] rounded-full overflow-hidden border-2 border-white bg-white z-40">
            <img
              src="/images/luke.png"
              alt="Luke"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Luke's name */}
          <div className="absolute top-[-60px] left-[10px] text-xs font-bold bg-black/70 px-2 py-1 rounded text-white z-40 whitespace-nowrap">
            Luke
          </div>
        </div>

        {/* Drivers */}
        {drivers.map((driver) => {
          // Don't render car if it's exploding or already defeated
          if (explosions.some(e => e.id === driver.id) || driver.defeated) {
            return null
          }
          
          return (
            <div
              key={driver.id}
              id={`driver-${driver.id}`}
              className="absolute z-30"
              style={{ 
                left: `${driver.position.x}px`, 
                top: `${driver.position.y}px`,
                width: "120px",
                height: "70px"
              }}
            >
              {/* Car image */}
              <img 
                src={driver.carImage || "/images/car-blue.png"} 
                alt={`${driver.name}'s car`} 
                className="w-full h-full object-contain" 
              />
              {/* Driver avatar */}
              <div className="absolute top-[-40px] left-[10px] w-[40px] h-[40px] rounded-full overflow-hidden border-2 border-white bg-white z-40">
                <img
                  src={driver.image || "/placeholder.svg"}
                  alt={driver.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Driver name */}
              <div className="absolute top-[-60px] left-[10px] text-xs font-bold bg-black/70 px-2 py-1 rounded text-white z-40 whitespace-nowrap">
                {driver.name}
              </div>
            </div>
          )
        })}
        
        {/* Explosion animations */}
        <ExplosionManager 
          explosions={explosions}
          gameContainerRef={gameContainerRef}
          onExplosionComplete={(id) => {
            console.log(`Removing explosion for driver ${id}`)
            setExplosions(prev => prev.filter(e => e.id !== id))
          }}
        />
      </div>
    </div>
  )
}
