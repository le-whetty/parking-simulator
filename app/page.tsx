"use client"

// Cache break comment - deployment trigger
import { useState, useEffect, useRef } from "react"
import "@/lib/mixpanel" // Initialize Mixpanel
import { Button } from "@/components/ui/button"
import DefeatScreen from "@/components/defeat-screen"
import VictoryScreen from "@/components/victory-screen"
import LoginScreen from "@/components/login-screen"
import StartScreen from "@/components/start-screen"
import VehicleSelection from "@/components/vehicle-selection"
import ProfileMenu from "@/components/profile-menu"
import UsernameModal from "@/components/username-modal"
import ProfilePage from "@/components/profile-page"
import DLCStore from "@/components/dlc-store"
import { useAudioManager } from "@/hooks/use-audio-manager"
import { ExplosionManager } from "@/components/explosion-manager"
import { supabase } from "@/lib/supabase"
import mixpanel from "@/lib/mixpanel"
import { Vehicle, getPaceMultiplier, getArmorMultiplier, getImpactMultiplier } from "@/lib/vehicles"
import { ACHIEVEMENT_CODES } from "@/lib/achievements"

// Game states
type GameState = "auth" | "intro" | "start" | "vehicle-selection" | "playing" | "victory" | "defeat" | "profile" | "dlc-store"

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
  // Check if we're in dev mode (skip auth)
  const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === "true" || process.env.NEXT_PUBLIC_SKIP_AUTH === "1"
  
  // Log for debugging
  useEffect(() => {
    console.log('🔧 AUTH CHECK:', {
      skipAuth: process.env.NEXT_PUBLIC_SKIP_AUTH,
      isDevMode,
      allEnvVars: Object.keys(process.env).filter(k => k.includes('SKIP') || k.includes('AUTH'))
    })
  }, [isDevMode])
  
  // Game state - skip auth in dev mode
  const [gameState, setGameState] = useState<GameState>(isDevMode ? "intro" : "auth")
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [hasUsername, setHasUsername] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [displayTime, setDisplayTime] = useState(508) // 8:28 AM (in minutes) - display only
  const [lukeHealth, setLukeHealth] = useState(100)
  const [message, setMessage] = useState("")
  const [debug, setDebug] = useState(false) // Debug mode toggle
  const [parkingCountdown, setParkingCountdown] = useState<number | null>(null)
  const [messageId, setMessageId] = useState(0)
  const [isInParkingSpot, setIsInParkingSpot] = useState(false)
  const [hasWon, setHasWon] = useState(false) // Victory state
  const [isSimulatorMode, setIsSimulatorMode] = useState(false) // Simulator mode flag
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null) // Selected vehicle
  const selectedVehicleRef = useRef<Vehicle | null>(null) // Ref for selected vehicle (for game loop closures)
  const [lukePosition, setLukePosition] = useState({ x: 600, y: 400 }) // Luke's position (state for re-renders)
  const [explosions, setExplosions] = useState<Array<{id: string, x: number, y: number}>>([]) // Track explosions
  const [parkingSpotTimer, setParkingSpotTimer] = useState(0) // Timer for how long Luke has been in parking spot
  const parkingSpotTimerRef = useRef(0) // Ref version for game loop
  const victoryRef = useRef(false) // Victory ref to prevent multiple triggers
  const driversRef = useRef<Driver[]>([]) // Ref to track latest drivers state
  const gameStartTimeRef = useRef(0) // Game start time
  const lukePositionRef = useRef<{ x: number; y: number; lastPaceLog?: number }>({ x: 600, y: 400 }) // Luke's position (ref for game loop)
  const lukeFacingRef = useRef("right") // Luke's facing direction
  const gameDurationRef = useRef(120000) // Game duration (2 minutes)
  const lukeCarRef = useRef<HTMLDivElement | null>(null) // Luke's car ref
  const parkingSpotRef = useRef<HTMLDivElement | null>(null) // Parking spot ref
  const gameContainerRef = useRef<HTMLDivElement | null>(null) // Game container ref
  const gameLoopRef = useRef<number | null>(null) // Game loop ref
  const hotdogsRef = useRef<HTMLDivElement[]>([]) // Hotdogs ref
  const lastHotdogTime = useRef(0) // Last hotdog time
  const enemyProjectilesRef = useRef<HTMLDivElement[]>([]) // Enemy projectiles ref
  // Frame tracking for diagnostics
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const lastLogTimeRef = useRef(performance.now())
  const smoothedDeltaTimeRef = useRef(16.67) // Start with 60fps equivalent
  const [showSlackMessage, setShowSlackMessage] = useState(false) // State to control Slack message visibility
  const slackMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Ref for the Slack message timeout
  const gameReadyRef = useRef(false) // Track if game is ready to start (after countdown)
  const [countdown, setCountdown] = useState<number | null>(null) // Countdown: 3, 2, 1, null

  // Audio state - simplified to just a flag
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [audioDebug, setAudioDebug] = useState<string>("")

  // Combo system state
  const comboCountRef = useRef<number>(0) // Current combo streak
  const maxComboRef = useRef<number>(0) // Maximum combo reached in this game
  const totalHitsRef = useRef<number>(0) // Total hits/hotdogs that hit targets in this game
  const totalHotdogsThrownRef = useRef<number>(0) // Total hotdogs thrown (including misses) in this game
  const lastHitTimeRef = useRef<number>(0) // Time of last hit (for combo timeout)
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Combo timeout timer
  const [comboBadge, setComboBadge] = useState<{ image: string; points: number; key: number; x: number; y: number } | null>(null) // Current combo badge to display
  const comboAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Animation timeout
  const comboAudioRef = useRef<HTMLAudioElement | null>(null) // Combo sound effect
  const reachedMilestonesRef = useRef<Set<number>>(new Set()) // Track which milestones have been reached in current combo streak

  // Add a new ref to track parking time
  const parkingTimerRef = useRef<number>(0)
  const isParkedRef = useRef<boolean>(false)
  const parkingMessageShownRef = useRef<boolean>(false)
  // Track off-screen time for bonus points (starts at 100%, decreases when off-screen)
  const offScreenTimeRef = useRef<number>(0) // Time spent off-screen in seconds
  const lastOnScreenCheckRef = useRef<number>(0) // Last time we checked on-screen status

  // Add this near the other refs at the top of the component
  const themeAudioRef = useRef<HTMLAudioElement | null>(null)
  const slackAudioRef = useRef<HTMLAudioElement | null>(null)
  const slackIntervalRef = useRef<number | null>(null)
  const menuThemeStoppedRef = useRef<boolean>(false) // Track if menu theme has been stopped
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null) // Ref for countdown interval

  // Combo milestone definitions
  const comboMilestones = [
    { hits: 3, points: 150, image: '/images/150.png' },
    { hits: 5, points: 300, image: '/images/300.png' },
    { hits: 10, points: 500, image: '/images/500.png' },
  ]

  // Game area boundaries - used to keep drivers on screen
  // Only penalize off-screen to the RIGHT (where players can actually go)
  // Bottom, left, and top edges are visible, so allow full range
  const gameBounds = {
    minX: 50,   // Allow left edge (was 100, but player can go to 90 and still be visible)
    maxX: 820,  // Right boundary - players can go off-screen beyond this (was 1100, but 840 is off-screen)
    minY: 100,  // Allow top edge (was 150, but player can go to 140 and still be visible)
    maxY: 700,  // Allow bottom edge (was 650, but player can go to 660 and still be visible)
    centerX: 600,
    centerY: 400,
  }

  // Define the parking spot area as a constant
  // Adjusted to match new background image - narrower on left side
  const PARKING_SPOT_AREA = {
    left: 535,
    right: 825,
    top: 100,
    bottom: 220,
  }

  // Add a score state near the other state variables
  const [score, setScore] = useState(0)
  const [onScreenTimeDisplay, setOnScreenTimeDisplay] = useState(0) // For UI display

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

    // Set a timeout to hide the message after 3 seconds
    slackMessageTimeoutRef.current = setTimeout(() => {
      setShowSlackMessage(false)
    }, 3000)
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

  // Test Slack sound
  const testSlackSound = () => {
    setAudioDebug("Testing Slack sound...")
    playSlackSound()
  }

  // Preload combo badge images
  useEffect(() => {
    if (gameState === "playing" || gameState === "vehicle-selection" || gameState === "start") {
      comboMilestones.forEach((milestone) => {
        const img = new Image()
        img.src = milestone.image
      })
    }
  }, [gameState])

  // Function to handle combo milestone reached
  const handleComboMilestone = (hits: number, points: number, image: string, x: number, y: number) => {
    // Clear any existing animation timeout
    if (comboAnimationTimeoutRef.current) {
      clearTimeout(comboAnimationTimeoutRef.current)
      comboAnimationTimeoutRef.current = null
    }

    // Stop any currently playing combo sound
    if (comboAudioRef.current) {
      comboAudioRef.current.pause()
      comboAudioRef.current.currentTime = 0
    }

    // Play combo sound
    const audio = new Audio('/music/combo.mp3')
    audio.volume = 0.7
    comboAudioRef.current = audio
    audio.play().catch((error) => {
      // Silently handle audio errors
      if (error.name !== 'NotAllowedError' && error.name !== 'NotSupportedError') {
        console.warn('Could not play combo sound:', error)
      }
    })

    // Show badge with unique key to force re-render at player position
    setComboBadge({ image, points, key: Date.now(), x, y })

    // Auto-hide after animation completes (2 seconds)
    comboAnimationTimeoutRef.current = setTimeout(() => {
      setComboBadge(null)
      comboAnimationTimeoutRef.current = null
    }, 2000)
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
    {
      id: "sarah",
      name: "Sarah",
      type: "pregnant",
      image: "/images/sarah.png",
      health: 100,
      defeated: false,
      position: { x: 150, y: 250 },
      speed: 32,
      direction: { x: 0.5, y: 0.5 },
      directionChangeTimer: Math.random() * 2 + 1,
      carImage: "/images/car-purple.png",
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
  const startGame = async () => {
    console.log("startGame called!")
    
    // Track Game Started event
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        mixpanel.identify(session.user.id)
            mixpanel.track('Game Started', {
              user_id: session.user.id,
              vehicle_type: selectedVehicle?.id || null,
              vehicle_name: selectedVehicle?.name || null,
            })
      }
    } catch (error) {
      console.error("Error tracking game started:", error)
    }
    
    // Stop menu theme music first - do this before anything else
    console.log("Stopping menu theme music before starting game...")
    audioManager.stop("menuTheme")
    menuThemeStoppedRef.current = true // Mark as stopped
    
    // Also try to stop all sounds to be safe
    try {
      audioManager.stopAll()
    } catch (error) {
      console.error("Error stopping audio:", error)
    }
    
    // Only initialize audio if not already initialized
    if (!audioManager.initialized) {
      console.log("Initializing audio manager...")
      audioManager.initialize()
    } else {
      console.log("Audio manager already initialized, skipping...")
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
    
    // Reset game state
    setGameState("playing")
    setDisplayTime(508) // 8:28 AM
    setLukeHealth(100)
    setParkingCountdown(null)
    setIsInParkingSpot(false)
    setMessage("") // Clear any messages
    setHasWon(false) // Reset victory state
    setIsSimulatorMode(false) // Reset simulator mode
    // Don't reset selectedVehicle here - it should persist through the game session
    // Only reset when explicitly restarting (e.g., from victory/defeat screens)
    // Note: selectedVehicleRef.current persists automatically
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
    
    // Reset off-screen tracking (starts at 100% on-screen)
    offScreenTimeRef.current = 0
    setOnScreenTimeDisplay(100) // Start at 100%
    lastOnScreenCheckRef.current = Date.now()

    // Reset combo system
    comboCountRef.current = 0
    lastHitTimeRef.current = 0
    reachedMilestonesRef.current = new Set()
    setComboBadge(null)
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current)
      comboTimeoutRef.current = null
    }
    if (comboAnimationTimeoutRef.current) {
      clearTimeout(comboAnimationTimeoutRef.current)
      comboAnimationTimeoutRef.current = null
    }
    if (comboAudioRef.current) {
      comboAudioRef.current.pause()
      comboAudioRef.current = null
    }

    // Clear any existing game loop
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current)
    }

    // Reset the score
    setScore(0)

    // Reset game ready state
    gameReadyRef.current = false
    setCountdown(3) // Start countdown at 3

    // Play countdown sound immediately when countdown starts
    audioManager.play("3-2-1")

    // Clear any existing countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    // Start countdown - game will start after countdown completes
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
          gameReadyRef.current = true
          setCountdown(null)
          
          // Start theme music (let countdown sound play out naturally)
          audioManager.play("theme")
          
          // Start the game loop after countdown
          console.log("Starting game loop after countdown...")
          if (gameLoopRef.current) {
            cancelAnimationFrame(gameLoopRef.current)
          }
          gameLoopRef.current = requestAnimationFrame(gameLoop)
          console.log("Game loop started, ref:", gameLoopRef.current)
          
          return null
        }
        return prev - 1
      })
    }, 1000) // Update every second
    
    // Log container dimensions
    if (gameContainerRef.current) {
      const container = gameContainerRef.current
      console.log('🎮 GAME CONTAINER:', {
        width: container.clientWidth,
        height: container.clientHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        boundingRect: container.getBoundingClientRect()
      })
    }

    // Theme music will start after countdown completes (handled in countdown interval)
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
    if (gameState !== "playing" || !lukeCarRef.current || hasWon || !gameReadyRef.current) return

    // Apply pace multiplier from selected vehicle
    const baseSpeed = 20
    const vehicle = selectedVehicleRef.current
    const paceMultiplier = vehicle ? getPaceMultiplier(vehicle.pace) : 1.0
    const speed = baseSpeed * paceMultiplier
    
    // Vehicle Stats Tracking: PACE (log once per movement to avoid spam)
    if (!lukePositionRef.current.lastPaceLog || Date.now() - lukePositionRef.current.lastPaceLog > 1000) {
      console.log('🚗 VEHICLE STATS - PACE:', {
        vehicle: vehicle?.name || 'None',
        pace: vehicle?.pace || 'N/A',
        baseSpeed: baseSpeed,
        paceMultiplier: paceMultiplier.toFixed(2),
        actualSpeed: speed.toFixed(2),
      })
      lukePositionRef.current.lastPaceLog = Date.now()
    }
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
  const throwHotdog = async () => {
    totalHotdogsThrownRef.current += 1 // Track total hotdogs thrown
    if (gameState !== "playing" || hasWon || !gameReadyRef.current) return

    const now = Date.now()
    if (now - lastHotdogTime.current < 300) return // Cooldown

    lastHotdogTime.current = now

    // Track Hot Dog Fired event
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        mixpanel.identify(session.user.id)
        mixpanel.track('Hot Dog Fired', {
          user_id: session.user.id,
        })
      }
    } catch (error) {
      console.error("Error tracking hot dog fired:", error)
    }

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

  // Enemy attack - frame-rate independent
  const enemyAttack = (driver: Driver, deltaTimeMs: number) => {
    if (driver.defeated || hasWon || !gameReadyRef.current) return // Don't attack during countdown
    
    // Attack rate: 0.6 attacks per second (was 0.01 per frame at 60fps)
    // Convert to time-based probability: rate * deltaTimeSeconds
    const attackRatePerSecond = 0.6
    const attackProbability = attackRatePerSecond * (deltaTimeMs / 1000)
    if (Math.random() > attackProbability) return

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
    const dirX = dx / distance
    const dirY = dy / distance
    projectile.dataset.dirX = dirX.toString()
    projectile.dataset.dirY = dirY.toString()
    
    // Enemy attack (no logging)

    // Add to game container
    gameContainerRef.current?.appendChild(projectile)

    // Add to enemy projectiles ref
    enemyProjectilesRef.current.push(projectile)
  }

  // Game loop
  const gameLoop = () => {
    // Skip if game is over or not ready (countdown still happening)
    if (hasWon || victoryRef.current || !gameReadyRef.current) {
      if (!gameReadyRef.current) {
        // Still schedule next frame to check again
        gameLoopRef.current = requestAnimationFrame(gameLoop)
      }
      return
    }

    // Track frame rate and delta time
    const now = performance.now()
    let deltaTime = now - lastFrameTimeRef.current
    // Cap deltaTime to prevent huge jumps on first frame or tab switch
    if (deltaTime > 100) deltaTime = 16.67 // Cap at ~60fps equivalent
    
    // Smooth deltaTime to reduce flickering (exponential moving average)
    const smoothingFactor = 0.1 // Lower = more smoothing
    smoothedDeltaTimeRef.current = smoothedDeltaTimeRef.current * (1 - smoothingFactor) + deltaTime * smoothingFactor
    
    lastFrameTimeRef.current = now
    frameCountRef.current++
    
    // Reset frame counter every second (no logging)
    if (now - lastLogTimeRef.current >= 1000) {
      frameCountRef.current = 0
      lastLogTimeRef.current = now
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

    // Check if Luke is on-screen (within visible game bounds)
    const isOnScreen =
      lukeX >= gameBounds.minX &&
      lukeX <= gameBounds.maxX &&
      lukeY >= gameBounds.minY &&
      lukeY <= gameBounds.maxY

    // Track off-screen time (frame-rate independent)
    // Start at 100% on-screen, only decrease when off-screen
    const timeSinceLastCheck = deltaTime / 1000 // Convert to seconds
    if (!isOnScreen) {
      offScreenTimeRef.current += timeSinceLastCheck
    }
    
    // Calculate and update on-screen percentage for display
    const totalGameTimeSeconds = elapsedTime / 1000
    if (totalGameTimeSeconds > 0) {
      const offScreenPercentage = (offScreenTimeRef.current / totalGameTimeSeconds) * 100
      const onScreenPercentage = Math.max(0, 100 - offScreenPercentage)
      // Update display every second
      const roundedPercentage = Math.floor(onScreenPercentage)
      if (roundedPercentage !== onScreenTimeDisplay) {
        setOnScreenTimeDisplay(roundedPercentage)
      }
    }
    lastOnScreenCheckRef.current = now

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
        // Debug logs removed
      }
    }
    
    // Debug: Log when victory conditions are first met
    const currentAllDefeated = driversRef.current.length > 0 && driversRef.current.every((driver: Driver) => driver.defeated || driver.health <= 0)
    
    // Victory conditions check (no logging)

    // VICTORY CHECK - Luke must be in parking spot for 3 seconds AFTER all drivers are defeated
    if (inSpot && currentAllDefeated && !victoryRef.current) {
      // Start countdown sound when timer begins
      if (parkingSpotTimerRef.current === 0) {
        console.log("🔊 Starting countdown sound and pausing theme music")
        audioManager.stop("theme")
        audioManager.play("countdown")
      }
      
      // Use ref to track timer (more reliable than state in game loop)
      // Frame-rate independent: use actual deltaTime in seconds
      parkingSpotTimerRef.current += deltaTime / 1000
      const currentTimer = parkingSpotTimerRef.current
      
      // Update state for UI display
      setParkingSpotTimer(currentTimer)
      
      // No logging for parking timer
      
      if (currentTimer >= 3.0) {
        // 3 seconds elapsed - trigger victory!
        // Victory achieved (no logging)

        // Calculate time bonus (1 point per second remaining)
        const currentTime = Date.now()
        const elapsedTime = currentTime - gameStartTimeRef.current
        const timeLeftMs = Math.max(0, gameDurationRef.current - elapsedTime)
        const timeLeftSeconds = Math.floor(timeLeftMs / 1000)
        const timeBonus = timeLeftSeconds // 1 point per second

        // Calculate on-screen percentage and multiplier
        // Start at 100%, decrease based on off-screen time
        const totalGameTimeSeconds = elapsedTime / 1000
        const offScreenPercentage = totalGameTimeSeconds > 0 
          ? (offScreenTimeRef.current / totalGameTimeSeconds) * 100 
          : 0
        const onScreenPercentage = Math.max(0, 100 - offScreenPercentage)
        
        // Apply multiplier based on on-screen percentage
        // 100% = 1.25x (25% bonus), 95% = 1.20x (20% bonus), 90% = 1.15x (15% bonus), 85% = 1.10x (10% bonus), 80% = 1.05x (5% bonus), <80% = 1.0x
        let onScreenMultiplier = 1.0
        if (onScreenPercentage >= 100) {
          onScreenMultiplier = 1.25
        } else if (onScreenPercentage >= 95) {
          onScreenMultiplier = 1.20
        } else if (onScreenPercentage >= 90) {
          onScreenMultiplier = 1.15
        } else if (onScreenPercentage >= 85) {
          onScreenMultiplier = 1.10
        } else if (onScreenPercentage >= 80) {
          onScreenMultiplier = 1.05
        }

        // Calculate final score: (base score + time bonus) * multiplier
        setScore((prev) => {
          const scoreBeforeMultiplier = prev + timeBonus
          const finalScore = Math.floor(scoreBeforeMultiplier * onScreenMultiplier)
          const bonusPoints = finalScore - scoreBeforeMultiplier
          // Victory bonuses calculated (no logging)
          return finalScore
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

        // Track Victory event with time spent
        const timeSpentMinutes = gameStartTimeRef.current > 0 
          ? ((Date.now() - gameStartTimeRef.current) / 1000 / 60).toFixed(2)
          : 0
        
        async function trackVictory() {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
              mixpanel.identify(session.user.id)
              mixpanel.track('Victory', {
                user_id: session.user.id,
                time_spent_minutes: parseFloat(timeSpentMinutes),
                score: score,
                vehicle_type: selectedVehicle?.id || null,
              })
            }
          } catch (error) {
            console.error("Error tracking victory:", error)
          }
        }
        trackVictory()

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
          // Driver status check (no logging)
        }
        parkingSpotTimerRef.current = 0
        setParkingSpotTimer(0)
        // Stop countdown sound when timer is reset
        audioManager.stop("countdown")
      }
    }

    // Update drivers with dynamic movement
    // DOM updates happen every frame for smooth movement
    // React state is updated every frame but DOM takes precedence (no visual stutter)
    // Compute updated drivers (always happens for game logic)
    const updatedDrivers = driversRef.current.map((driver) => {
        if (driver.defeated) return driver

        // Calculate new position based on direction and speed - frame-rate independent
        // Use smoothed deltaTime for driver movement to reduce flickering
        const smoothedDeltaTimeSeconds = smoothedDeltaTimeRef.current / 1000
        const newX = driver.position.x + driver.direction.x * driver.speed * smoothedDeltaTimeSeconds
        const newY = driver.position.y + driver.direction.y * driver.speed * smoothedDeltaTimeSeconds

        // Check if driver is going out of bounds
        const isOutOfBounds =
          newX < gameBounds.minX || newX > gameBounds.maxX || newY < gameBounds.minY || newY > gameBounds.maxY

        // Initialize new direction variables
        let newDirX = driver.direction.x
        let newDirY = driver.direction.y
        let posX = newX
        let posY = newY
        // Timer is in seconds, so convert smoothedDeltaTime from ms to seconds
        let newDirectionChangeTimer = driver.directionChangeTimer - (smoothedDeltaTimeRef.current / 1000)

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
          posY = Math.max(gameBounds.minY, Math.min(gameBounds.maxY, posY))

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
          
          // Prevent rapid direction flips (180-degree turns)
          // Check if new direction is opposite to current direction (dot product < -0.5 means >90 degrees)
          const dotProduct = driver.direction.x * newDirX + driver.direction.y * newDirY
          if (dotProduct < -0.3) {
            // New direction is too close to opposite, blend with current direction to smooth the change
            newDirX = driver.direction.x * 0.5 + newDirX * 0.5
            newDirY = driver.direction.y * 0.5 + newDirY * 0.5
            // Re-normalize
            const renormalized = normalizeDirection(newDirX, newDirY)
            newDirX = renormalized.x
            newDirY = renormalized.y
          }

          // Reset timer (1-3 seconds for more dynamic movement)
          newDirectionChangeTimer = Math.random() * 2 + 1
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

        // Random chance to attack - pass deltaTime for frame-rate independent attacks
        enemyAttack(driver, deltaTime)

        // Return updated driver
        return {
          ...driver,
          position: { x: posX, y: posY },
          direction: { x: newDirX, y: newDirY },
          directionChangeTimer: newDirectionChangeTimer,
        }
      })
    
    // Always update driversRef for game logic
    driversRef.current = updatedDrivers
    
    // Update React state every frame (DOM updates happen directly, so React re-renders don't cause stutter)
    setDrivers(updatedDrivers)

      // Move hotdogs
      hotdogsRef.current.forEach((hotdog, index) => {
        const currentLeft = Number.parseInt(hotdog.style.left || "0")
        const currentTop = Number.parseInt(hotdog.style.top || "0")
        
        // Frame-rate independent movement
        // Speed was 10 px/frame at 60fps (16.67ms per frame)
        // Convert to px/ms: 10 px / 16.67ms = 0.6 px/ms
        const speedPxPerMs = 0.6
        const movement = speedPxPerMs * deltaTime

        let hotdogRemoved = false

        // Move based on direction
        if (hotdog.dataset.direction === "left") {
          hotdog.style.left = `${currentLeft - movement}px`
          // Remove if out of bounds
          if (currentLeft < -50) {
            hotdog.remove()
            hotdogsRef.current.splice(index, 1)
            hotdogRemoved = true
          }
        } else if (hotdog.dataset.direction === "right") {
          hotdog.style.left = `${currentLeft + movement}px`
          // Remove if out of bounds
          if (currentLeft > 1200) {
            hotdog.remove()
            hotdogsRef.current.splice(index, 1)
            hotdogRemoved = true
          }
        } else if (hotdog.dataset.direction === "up") {
          hotdog.style.top = `${currentTop - movement}px`
          // Remove if out of bounds
          if (currentTop < -50) {
            hotdog.remove()
            hotdogsRef.current.splice(index, 1)
            hotdogRemoved = true
          }
        } else if (hotdog.dataset.direction === "down") {
          hotdog.style.top = `${currentTop + movement}px`
          // Remove if out of bounds
          if (currentTop > 800) {
            hotdog.remove()
            hotdogsRef.current.splice(index, 1)
            hotdogRemoved = true
          }
        }

        // If hotdog went out of bounds without hitting, reset combo
        if (hotdogRemoved) {
          const previousCombo = comboCountRef.current
          if (previousCombo > 0) {
            console.log(`❌ HOTDOG MISSED: Resetting combo streak (was at ${previousCombo} hits)`)
            comboCountRef.current = 0
            reachedMilestonesRef.current = new Set()
            if (comboTimeoutRef.current) {
              clearTimeout(comboTimeoutRef.current)
              comboTimeoutRef.current = null
            }
            console.log(`✅ COMBO RESET CONFIRMED: comboCountRef.current = ${comboCountRef.current}`)
          }
          return // Skip collision check since hotdog was removed
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
                // Apply impact multiplier from selected vehicle
                const baseDamage = 20
                const vehicle = selectedVehicleRef.current
                const impactMultiplier = vehicle ? getImpactMultiplier(vehicle.impact) : 1.0
                const damage = Math.floor(baseDamage * impactMultiplier)
                
                // Vehicle Stats Tracking: IMPACT
                console.log('🚗 VEHICLE STATS - IMPACT:', {
                  vehicle: vehicle?.name || 'None',
                  impact: vehicle?.impact || 'N/A',
                  target: driver.name,
                  baseDamage: baseDamage,
                  impactMultiplier: impactMultiplier.toFixed(2),
                  actualDamage: damage,
                  healthBefore: d.health,
                  healthAfter: Math.max(0, d.health - damage),
                })
                
                const newHealth = Math.max(0, d.health - damage) // Ensure health doesn't go below 0
                const isNowDefeated = newHealth <= 0 && !d.defeated
                
                // If driver just got defeated, trigger explosion and play sound
                if (isNowDefeated) {
                  // Driver defeated - no logging
                  
                  // Track Driver Defeated event
                  async function trackDriverDefeated() {
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (session?.user) {
                        mixpanel.identify(session.user.id)
                        mixpanel.track('Driver Defeated', {
                          user_id: session.user.id,
                          driver_name: driver.name,
                          driver_type: driver.type,
                        })
                      }
                    } catch (error) {
                      console.error("Error tracking driver defeated:", error)
                    }
                  }
                  trackDriverDefeated()
                  
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

          // Combo system: Only count combos when Luke is on-screen
          const lukeX = lukePositionRef.current.x
          const lukeY = lukePositionRef.current.y
          const isOnScreen = 
            lukeX >= gameBounds.minX &&
            lukeX <= gameBounds.maxX &&
            lukeY >= gameBounds.minY &&
            lukeY <= gameBounds.maxY
          
          if (!isOnScreen) {
            console.log(`🚫 COMBO BLOCKED: Luke is off-screen at (${lukeX}, ${lukeY})`)
            // Still add regular hit points, but don't count for combo
          } else {
            // Combo system: Increment combo count
            const now = Date.now()
            const timeSinceLastHit = now - lastHitTimeRef.current
            
            // Reset combo if more than 2 seconds since last hit (made harder)
            if (timeSinceLastHit > 2000) {
              console.log(`🔥 COMBO RESET: Timeout (>2s since last hit, was ${timeSinceLastHit}ms)`)
              comboCountRef.current = 0
              reachedMilestonesRef.current = new Set()
            }
            
            // Increment combo
            comboCountRef.current += 1
            lastHitTimeRef.current = now
            const currentCombo = comboCountRef.current
            totalHitsRef.current += 1 // Track total hits
            maxComboRef.current = Math.max(maxComboRef.current, currentCombo) // Track max combo
            
            console.log(`🔥 COMBO: Hit #${currentCombo} on ${driver.name} (time since last: ${timeSinceLastHit}ms, Luke at ${lukeX}, ${lukeY})`)
            
            // Clear existing combo timeout
            if (comboTimeoutRef.current) {
              clearTimeout(comboTimeoutRef.current)
              comboTimeoutRef.current = null
            }
            
            // Set combo timeout (2 seconds to reset combo - made harder)
            comboTimeoutRef.current = setTimeout(() => {
              const currentComboOnTimeout = comboCountRef.current
              console.log(`🔥 COMBO RESET: Timeout (2s elapsed, was at ${currentComboOnTimeout} hits)`)
              comboCountRef.current = 0
              reachedMilestonesRef.current = new Set()
              comboTimeoutRef.current = null
              console.log(`✅ COMBO RESET CONFIRMED: comboCountRef.current = ${comboCountRef.current}`)
            }, 2000)

            // Check for combo milestones (only if not already reached in this streak)
            const milestone = comboMilestones.find(m => m.hits === currentCombo)
            if (milestone && !reachedMilestonesRef.current.has(milestone.hits)) {
              console.log(`🎯 COMBO MILESTONE REACHED: ${milestone.hits} hits = ${milestone.points} bonus points!`)
              reachedMilestonesRef.current.add(milestone.hits)
              // Add bonus points for milestone
              setScore((prev) => prev + milestone.points)
              scoreEffect(milestone.points, driver.position.x, driver.position.y)
              // Show combo badge at Luke's position
              handleComboMilestone(milestone.hits, milestone.points, milestone.image, lukeX, lukeY)
            } else if (milestone && reachedMilestonesRef.current.has(milestone.hits)) {
              console.log(`⚠️ COMBO MILESTONE ALREADY REACHED: ${milestone.hits} hits (skipping duplicate)`)
            }
          }

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

      // Move projectile towards Luke - frame-rate independent
      // Speed was 3 px/frame at 60fps (16.67ms per frame)
      // Convert to px/ms: 3 px / 16.67ms = 0.18 px/ms
      const speedPxPerMs = 0.18
      const movement = speedPxPerMs * deltaTime
      // Log first projectile movement to verify fix is active
      if (index === 0 && Math.random() < 0.01) { // Log 1% of frames for first projectile
        // Projectile movement - no logging
      }
      projectile.style.left = `${currentLeft + dirX * movement}px`
      projectile.style.top = `${currentTop + dirY * movement}px`

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
          // Hit Luke - RESET COMBO
          const previousCombo = comboCountRef.current
          console.log(`💥 LUKE HIT: Resetting combo streak (was at ${previousCombo} hits)`)
          comboCountRef.current = 0
          reachedMilestonesRef.current = new Set()
          if (comboTimeoutRef.current) {
            clearTimeout(comboTimeoutRef.current)
            comboTimeoutRef.current = null
          }
          console.log(`✅ COMBO RESET CONFIRMED: comboCountRef.current = ${comboCountRef.current}`)
          
          setLukeHealth((prev) => {
            // Apply armor multiplier from selected vehicle
            const baseDamage = 4
            const vehicle = selectedVehicleRef.current
            const armorMultiplier = vehicle ? getArmorMultiplier(vehicle.armor) : 1.0
            const damage = Math.ceil(baseDamage * armorMultiplier)
            const newHealth = prev - damage
            // Calculate actual projectile speed for logging (0.18 px/ms)
            const projectileSpeedPxPerMs = 0.18
            const actualSpeed = projectileSpeedPxPerMs * deltaTime
            // Vehicle Stats Tracking: ARMOR
            console.log('🚗 VEHICLE STATS - ARMOR:', {
              vehicle: vehicle?.name || 'None',
              armor: vehicle?.armor || 'N/A',
              baseDamage: baseDamage,
              armorMultiplier: armorMultiplier.toFixed(2),
              actualDamage: damage,
              healthBefore: prev,
              healthAfter: newHealth,
            })
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

    // Clear countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    gameReadyRef.current = false
    setCountdown(null)

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

    // Stop countdown sound specifically
    audioManager.stop("3-2-1")

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
      
      // Calculate on-screen percentage and multiplier
      // Start at 100%, decrease based on off-screen time
      const totalGameTimeSeconds = elapsedTime / 1000
      const offScreenPercentage = totalGameTimeSeconds > 0 
        ? (offScreenTimeRef.current / totalGameTimeSeconds) * 100 
        : 0
      const onScreenPercentage = Math.max(0, 100 - offScreenPercentage)
      
      // Apply multiplier based on on-screen percentage
      // 100% = 1.25x (25% bonus), 95% = 1.20x (20% bonus), 90% = 1.15x (15% bonus), 85% = 1.10x (10% bonus), 80% = 1.05x (5% bonus), <80% = 1.0x
      let onScreenMultiplier = 1.0
      if (onScreenPercentage >= 100) {
        onScreenMultiplier = 1.25
      } else if (onScreenPercentage >= 95) {
        onScreenMultiplier = 1.20
      } else if (onScreenPercentage >= 90) {
        onScreenMultiplier = 1.15
      } else if (onScreenPercentage >= 85) {
        onScreenMultiplier = 1.10
      } else if (onScreenPercentage >= 80) {
        onScreenMultiplier = 1.05
      }
      
      // Calculate final score: (base score + time bonus) * multiplier
      setScore((prev) => {
        const scoreBeforeMultiplier = prev + timeBonus
        const finalScore = Math.floor(scoreBeforeMultiplier * onScreenMultiplier)
        const bonusPoints = finalScore - scoreBeforeMultiplier
        // Victory bonuses calculated (no logging)
        return finalScore
      })

      // Stop theme music
      audioManager.stop("theme")
      
      // Don't play anthem here - victory-screen will handle it
      // audioManager.play("anthem") // Removed - victory-screen will handle this
    } else {
      // Play defeat sound
      audioManager.play("no")
    }

    // Track game end events (victory or defeat) with time spent
    const timeSpentMinutes = gameStartTimeRef.current > 0 
      ? ((Date.now() - gameStartTimeRef.current) / 1000 / 60).toFixed(2)
      : 0
    
    async function trackGameEnd() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          mixpanel.identify(session.user.id)
          if (victory) {
            mixpanel.track('Victory', {
              user_id: session.user.id,
              time_spent_minutes: parseFloat(timeSpentMinutes),
              score: score,
              vehicle_type: selectedVehicle?.id || null,
            })

            // Check and award achievements on victory
            const elapsedTimeSeconds = gameStartTimeRef.current > 0 
              ? (Date.now() - gameStartTimeRef.current) / 1000
              : 0
            
            await checkAndAwardAchievements(
              session.user.email!,
              {
                perfectParking: lukeHealth === 100,
                speedDemon: elapsedTimeSeconds < 20, // Under 20 seconds
                tankCommander: lukeHealth <= 10,
                comboMaster: maxComboRef.current >= 50,
                gameSessionId: gameSessionIdRef.current || undefined,
              }
            )
          } else {
            mixpanel.track('Defeat', {
              user_id: session.user.id,
              time_spent_minutes: parseFloat(timeSpentMinutes),
              final_health: lukeHealth,
              vehicle_type: selectedVehicle?.id || null,
            })
          }
        }
      } catch (error) {
        console.error("Error tracking game end:", error)
      }
    }
    trackGameEnd()
    
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

  // Function to check and award achievements
  async function checkAndAwardAchievements(
    userEmail: string,
    conditions: {
      perfectParking: boolean
      speedDemon: boolean
      tankCommander: boolean
      comboMaster: boolean
      gameSessionId?: string
    }
  ) {
    try {
      const achievementsToAward: string[] = []

      if (conditions.perfectParking) {
        achievementsToAward.push(ACHIEVEMENT_CODES.PERFECT_PARKING)
      }
      if (conditions.speedDemon) {
        achievementsToAward.push(ACHIEVEMENT_CODES.SPEED_DEMON)
      }
      if (conditions.tankCommander) {
        achievementsToAward.push(ACHIEVEMENT_CODES.TANK_COMMANDER)
      }
      if (conditions.comboMaster) {
        achievementsToAward.push(ACHIEVEMENT_CODES.COMBO_MASTER)
      }

      // Award achievements
      for (const achievementCode of achievementsToAward) {
        try {
          const response = await fetch('/api/award-achievement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail,
              achievementCode,
              gameSessionId: conditions.gameSessionId,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && !data.alreadyUnlocked) {
              console.log(`🎉 Achievement unlocked: ${achievementCode}`)
            }
          }
        } catch (error) {
          console.error(`Error awarding achievement ${achievementCode}:`, error)
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error)
    }
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
      // Don't capture keys if username modal is open (allow typing in input)
      if (showUsernameModal) {
        return
      }

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
      // Don't capture keys if username modal is open (allow typing in input)
      if (showUsernameModal) {
        return
      }

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
  }, [gameState, showUsernameModal])

  // Render start screen
  const onInitializeAudio = () => {
    // This will be called when the user clicks "Enable Sound"
    audioManager.initialize()
  }

  // Debug: Log gameState changes
  useEffect(() => {
    console.log("Game state changed to:", gameState)
    
    // Track Page View
    if (typeof window !== 'undefined') {
      mixpanel.track('Page View', {
        page_url: window.location.href,
        page_title: document.title,
        user_id: null, // Will be set when authenticated
      })
    }
  }, [gameState])
  
  // Track Page View on mount and identify user if authenticated
  useEffect(() => {
    async function trackInitialPageView() {
      if (typeof window === 'undefined') return
      
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        mixpanel.identify(session.user.id)
        mixpanel.people.set({
          '$name': session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Unknown',
          '$email': session.user.email || '',
        })
        
        mixpanel.track('Page View', {
          page_url: window.location.href,
          page_title: document.title,
          user_id: session.user.id,
        })
      } else {
        mixpanel.track('Page View', {
          page_url: window.location.href,
          page_title: document.title,
          user_id: null,
        })
      }
    }
    
    trackInitialPageView()
  }, [])

  // Play menu theme music when on start screen or vehicle selection (after user interaction from intro screen)
  useEffect(() => {
    if (gameState === "start" || gameState === "vehicle-selection") {
      // Reset the stopped flag when returning to start/vehicle-selection screen
      menuThemeStoppedRef.current = false
      
      // Initialize audio if not already done
      if (!audioManager.initialized) {
        audioManager.initialize()
      }
      
      // Start menu theme immediately (user has already interacted by clicking intro button)
      if (gameState === "start") {
        console.log("Starting menu theme music...")
        audioManager.play("menuTheme")
      }
      // Keep playing if transitioning to vehicle-selection
    } else if (gameState === "playing") {
      // Stop menu theme when starting the game (countdown begins)
      if (!menuThemeStoppedRef.current) {
        console.log("Stopping menu theme music...")
        audioManager.stop("menuTheme")
        menuThemeStoppedRef.current = true
      }
    }
  }, [gameState, audioManager]) // Include audioManager to ensure it's available

  // Check for username after authentication
  useEffect(() => {
    async function checkUsername() {
      if (gameState === "auth" || isDevMode) return
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          // Identify user in Mixpanel
          mixpanel.identify(session.user.id)
          mixpanel.people.set({
            '$name': session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Unknown',
            '$email': session.user.email || '',
          })
          
          // Check if user has a username
          const { data: usernameData } = await supabase
            .from('usernames')
            .select('username, created_at')
            .eq('user_email', session.user.email)
            .maybeSingle()
          
          // Note: Sign Up events are now tracked via Supabase webhook (app/api/webhooks/supabase-auth/route.ts)
          // This ensures we only track actual new user creations, not returning users
          
          if (usernameData?.username) {
            setUsername(usernameData.username)
            setHasUsername(true)
          } else {
            setHasUsername(false)
            setShowUsernameModal(true)
          }
        }
      } catch (error) {
        console.error("Error checking username:", error)
        // Track Error event
        if (typeof window !== 'undefined') {
          mixpanel.track('Error', {
            error_type: 'authentication',
            error_message: error instanceof Error ? error.message : String(error),
            page_url: window.location.href,
            user_id: null,
          })
        }
      }
    }
    
    if (gameState !== "auth") {
      checkUsername()
    }
  }, [gameState, isDevMode])

  // Handle logout
  const handleLogout = () => {
    setGameState("auth")
    setHasUsername(false)
    setUsername(null)
    setIsSimulatorMode(false)
  }

  // Handle victory simulator
  const handleVictorySimulator = () => {
    console.log("Victory Simulator button clicked!")
    // Stop menu theme music before showing victory screen
    console.log("Stopping menu theme music before victory simulator...")
    audioManager.stop("menuTheme")
    menuThemeStoppedRef.current = true // Mark as stopped
    setIsSimulatorMode(true)
    setHasWon(true)
    setScore(0) // Set score to 0 for simulator
    // Ensure game state allows victory screen to show
    setGameState("victory")
  }

  // Handle username saved
  const handleUsernameSaved = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        const { data: usernameData } = await supabase
          .from('usernames')
          .select('username')
          .eq('user_email', session.user.email)
          .maybeSingle()
        
        if (usernameData?.username) {
          setUsername(usernameData.username)
          setHasUsername(true)
        }
      }
    } catch (error) {
      console.error("Error fetching username after save:", error)
    }
  }

  // Render login screen
  if (gameState === "auth") {
    return <LoginScreen onAuthenticated={() => setGameState("intro")} />
  }

  // Render intro/splash screen
  if (gameState === "intro") {
    return (
      <>
        {showUsernameModal && (
          <UsernameModal
            isOpen={showUsernameModal}
            onClose={() => {
              // Allow closing - the modal will handle preventing close during save
              setShowUsernameModal(false)
            }}
            onSave={handleUsernameSaved}
          />
        )}
        <div className="relative">
          <div className="fixed top-4 right-4 z-50">
            <ProfileMenu onLogout={handleLogout} onEditUsername={() => setShowUsernameModal(true)} />
          </div>
        <div 
          className="flex min-h-screen flex-col items-center justify-center p-4 font-quicksand cursor-pointer"
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
              <img src="/logos/logo.png" alt="Tracksuit" className="w-[300px] mx-auto" />
            </div>
            <h1 className="text-6xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 via-tracksuit-purple-700 to-tracksuit-purple-600 mb-4" style={{ padding: '10px' }}>Parking Simulator</h1>
            <p className="text-2xl text-tracksuit-purple-700 mb-8 font-quicksand">Click anywhere to begin</p>
          </div>
        </div>
      </div>
      </>
    )
  }

  if (gameState === "start") {
    return (
      <>
        {showUsernameModal && (
          <UsernameModal
            isOpen={showUsernameModal}
            onClose={() => setShowUsernameModal(false)}
            onSave={handleUsernameSaved}
          />
        )}
        <StartScreen 
          onStart={() => setGameState("vehicle-selection")} 
          onInitializeAudio={onInitializeAudio} 
          onLogout={handleLogout}
          username={username}
          onEditUsername={() => setShowUsernameModal(true)}
          onVictorySimulator={handleVictorySimulator}
          onViewProfile={() => setGameState("profile")}
          onViewDLCStore={() => setGameState("dlc-store")}
        />
      </>
    )
  }

  // Render profile page
  if (gameState === "profile") {
    return (
      <>
        {showUsernameModal && (
          <UsernameModal
            isOpen={showUsernameModal}
            onClose={() => setShowUsernameModal(false)}
            onSave={handleUsernameSaved}
          />
        )}
        <ProfilePage onBack={() => setGameState("start")} />
      </>
    )
  }

  // Render DLC store
  if (gameState === "dlc-store") {
    return (
      <>
        {showUsernameModal && (
          <UsernameModal
            isOpen={showUsernameModal}
            onClose={() => setShowUsernameModal(false)}
            onSave={handleUsernameSaved}
          />
        )}
        <DLCStore onBack={() => setGameState("start")} />
      </>
    )
  }

  // Render vehicle selection screen
  if (gameState === "vehicle-selection") {
    return (
      <>
        {showUsernameModal && (
          <UsernameModal
            isOpen={showUsernameModal}
            onClose={() => setShowUsernameModal(false)}
            onSave={handleUsernameSaved}
          />
        )}
        <VehicleSelection
          onBack={() => setGameState("start")}
          onVehicleSelected={async (vehicle) => {
            setSelectedVehicle(vehicle)
            selectedVehicleRef.current = vehicle // Also update ref for game loop access
            // Track vehicle selection
            try {
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user) {
                mixpanel.identify(session.user.id)
                mixpanel.track('Vehicle Selected', {
                  user_id: session.user.id,
                  vehicle_type: vehicle.id,
                  vehicle_name: vehicle.name,
                  pace: vehicle.pace,
                  armor: vehicle.armor,
                  impact: vehicle.impact,
                })
              }
            } catch (error) {
              console.error("Error tracking vehicle selection:", error)
            }
            // Start the game with selected vehicle
            startGame()
          }}
          onLogout={handleLogout}
          onEditUsername={() => setShowUsernameModal(true)}
          onVictorySimulator={handleVictorySimulator}
          username={username}
        />
      </>
    )
  }

  // Render defeat screen
  if (gameState === "defeat") {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50">
          <ProfileMenu onLogout={handleLogout} />
        </div>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white font-quicksand">
          <DefeatScreen onRestart={startGame} />
        </div>
      </div>
    )
  }

  // Replace the entire inline victory screen block:
  if (hasWon) {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50">
          <ProfileMenu onLogout={handleLogout} />
        </div>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white font-quicksand">
          <VictoryScreen 
            onRestart={startGame} 
            score={score} 
            isSimulator={isSimulatorMode}
            vehicle={selectedVehicle?.id || null}
          />
        </div>
      </div>
    )
  }

  // Render game screen
  return (
    <div className="relative">
      <div className="fixed top-4 right-4 z-50">
        <ProfileMenu onLogout={handleLogout} />
      </div>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white font-quicksand">
      <div
        ref={gameContainerRef}
        className="relative w-full max-w-4xl h-[800px] overflow-hidden focus:outline-none"
        tabIndex={0}
      >
        {/* Game background image */}
        <img 
          src="/images/game-background.png" 
          alt="Game Background" 
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        
        {/* Invisible parking spot detection area (for gameplay logic) */}
        <div
          ref={parkingSpotRef}
          className="absolute z-0 pointer-events-none"
          id="winning-spot"
          style={{
            left: `${PARKING_SPOT_AREA.left}px`,
            top: `${PARKING_SPOT_AREA.top}px`,
            width: `${PARKING_SPOT_AREA.right - PARKING_SPOT_AREA.left}px`,
            height: `${PARKING_SPOT_AREA.bottom - PARKING_SPOT_AREA.top}px`,
          }}
        />
        {debug && (
          <div
            className="absolute border-4 border-yellow-500 z-40 pointer-events-none"
            style={{
              left: `${PARKING_SPOT_AREA.left}px`,
              top: `${PARKING_SPOT_AREA.top}px`,
              width: `${PARKING_SPOT_AREA.right - PARKING_SPOT_AREA.left}px`,
              height: `${PARKING_SPOT_AREA.bottom - PARKING_SPOT_AREA.top}px`,
              opacity: 0.5,
            }}
          >
            <div className="absolute inset-0 bg-yellow-300 opacity-30"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black font-bold">
              Parking Detection Area
            </div>
          </div>
        )}
        {/* Combo Badge Overlay */}
        {comboBadge && (
          <div
            key={comboBadge.key}
            className="absolute z-[90] combo-badge-container"
            style={{
              left: `${comboBadge.x}px`,
              top: `${comboBadge.y}px`,
              transform: 'translate(-50%, -50%)',
              animation: 'comboBadgeAnimation 2s ease-out forwards',
            }}
          >
            <img
              src={comboBadge.image}
              alt={`${comboBadge.points} combo`}
              className="max-w-[150px] h-auto object-contain"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))',
              }}
            />
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-9xl font-bold font-chapeau text-white drop-shadow-2xl animate-pulse">
              {countdown === 0 ? "GO!" : countdown}
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
          <img 
            src={selectedVehicle?.image || "/images/minivan.png"} 
            alt={selectedVehicle?.name || "Luke's Car"} 
            className="w-full h-full object-contain" 
          />
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
          
          {/* Kim's Slack message - appears when Slack notification plays */}
          {showSlackMessage && (
            <div 
              className="absolute z-50 animate-fadeIn"
              style={{
                left: "150px", // Position to the right of Luke's car
                top: "-20px",
                width: "240px", // Doubled from 120px
                height: "auto",
              }}
            >
              <img 
                src="/images/kim-message.png" 
                alt="Kim's message" 
                className="w-full h-auto drop-shadow-lg"
              />
            </div>
          )}
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
    </div>
  )
}
