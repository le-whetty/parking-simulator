"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { vehicles, Vehicle, VehicleType } from "@/lib/vehicles"
import { hasDLCUnlocked } from "@/lib/dlc"
import { supabase } from "@/lib/supabase"
import Menu from "./menu"

interface VehicleSelectionProps {
  onVehicleSelected: (vehicle: Vehicle) => void
  onBack?: () => void
  onLogout?: () => void
  onEditUsername?: () => void
  onVictorySimulator?: () => void
  onViewDLCStore?: () => void
  username?: string | null
}

// Mapping of vehicle IDs to their sound and image files
const vehicleMediaMap: Record<VehicleType, { sound: string; image: string }> = {
  corolla: { sound: '/music/fargo.mp3', image: '/images/fargo.png' },
  sedona: { sound: '/music/matilda.mp3', image: '/images/matilda.png' },
  impala: { sound: '/music/deniro.mp3', image: '/images/deniro.png' },
}

export default function VehicleSelection({ 
  onVehicleSelected, 
  onBack,
  onLogout, 
  onEditUsername, 
  onVictorySimulator,
  onViewDLCStore,
  username 
}: VehicleSelectionProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null)
  const [showOverlay, setShowOverlay] = useState<{ vehicleId: VehicleType; image: string } | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [unlockedDLCs, setUnlockedDLCs] = useState<Set<string>>(new Set())
  const [scrollPosition, setScrollPosition] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const imagesPreloadedRef = useRef(false)

  // Load user email and DLC unlocks
  useEffect(() => {
    async function loadUserAndDLC() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          setUserEmail(session.user.email)
          
          // Check which DLCs are unlocked
          const dlcCodes = ['DLC_VEHICLES'] // Add more as needed
          const unlocked = new Set<string>()
          for (const code of dlcCodes) {
            const hasUnlocked = await hasDLCUnlocked(session.user.email, code)
            if (hasUnlocked) {
              unlocked.add(code)
            }
          }
          setUnlockedDLCs(unlocked)
        }
      } catch (error) {
        console.error("Error loading user DLC:", error)
      }
    }
    loadUserAndDLC()
  }, [])

  // Preload all overlay images when component mounts
  useEffect(() => {
    if (imagesPreloadedRef.current) return
    
    const preloadImages = () => {
      Object.values(vehicleMediaMap).forEach((media) => {
        const img = new Image()
        img.src = media.image
      })
      imagesPreloadedRef.current = true
    }
    
    preloadImages()
  }, [])

  const handleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle.id)
    
    // Get the media for this vehicle
    const media = vehicleMediaMap[vehicle.id]
    if (!media) return
    
    // Stop any currently playing audio and clear any existing overlay/timeouts
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setShowOverlay(null) // Clear any existing overlay first
    
    // Small delay to ensure state clears before showing new overlay
    setTimeout(() => {
      const startTime = Date.now()
      
      // Show the animated overlay
      setShowOverlay({ vehicleId: vehicle.id, image: media.image })
      
      // Play the sound
      const audio = new Audio(media.sound)
      audio.volume = 0.7
      audioRef.current = audio
      
      const hideOverlay = () => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
          hideTimeoutRef.current = null
        }
        setShowOverlay(null)
      }
      
      // Hide overlay when audio finishes playing, but ensure minimum 3 seconds
      audio.addEventListener('ended', () => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, 3000 - elapsed)
        hideTimeoutRef.current = setTimeout(hideOverlay, remaining)
      })
      
      // Fallback: ensure overlay stays visible for at least 3 seconds
      hideTimeoutRef.current = setTimeout(() => {
        // Only hide if audio has ended
        if (audio.ended) {
          hideOverlay()
        } else {
          // Audio still playing, wait for ended event (which will handle hiding)
          audio.addEventListener('ended', hideOverlay, { once: true })
        }
      }, 3000)
      
      // Also hide overlay if audio fails to load/play (fallback)
      audio.addEventListener('error', () => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = setTimeout(hideOverlay, 1000)
      })
      
      audio.play().catch((error) => {
        // Silently handle audio errors (file might not be loaded yet or browser autoplay restrictions)
        // Only log if it's not a common autoplay/loading issue
        if (error.name !== 'NotAllowedError' && error.name !== 'NotSupportedError') {
          console.warn('Could not play vehicle selection sound:', error)
        }
        // Hide overlay if audio fails to play
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = setTimeout(hideOverlay, 1000)
      })
    }, 50) // Small delay to ensure state update
  }

  const handleStart = () => {
    if (selectedVehicle) {
      const vehicle = vehicles.find(v => v.id === selectedVehicle)
      if (vehicle) {
        onVehicleSelected(vehicle)
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-6xl mx-auto pt-24">
      <Menu onLogout={onLogout} onEditUsername={onEditUsername} onVictorySimulator={onVictorySimulator} />

      {/* Back Button */}
      {onBack && (
        <div className="w-full mb-4 flex justify-start">
          <Button
            onClick={onBack}
            variant="outline"
            className="font-chapeau border-tracksuit-purple-300 text-tracksuit-purple-700 hover:bg-tracksuit-purple-50"
          >
            ← Back
          </Button>
        </div>
      )}

      {/* Username Greeting */}
      {username && (
        <div className="w-full mb-6 text-center">
          <p className="text-2xl font-bold font-chapeau text-tracksuit-purple-800">
            Hey, @{username} 👋
          </p>
        </div>
      )}

      {/* Title */}
      <div className="w-full mb-8 text-center">
        <h1 className="text-4xl font-bold font-chapeau mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 to-tracksuit-purple-700">
            Choose Your Ride
          </span>
          <span className="ml-2">🚗</span>
        </h1>
        <p className="text-tracksuit-purple-700 font-quicksand">
          Select your vehicle and hit the road!
        </p>
      </div>

      {/* Vehicle Cards Horizontal Scroll */}
      <div className="w-full mb-8 relative">
        {/* Left Arrow */}
        <button
          onClick={() => {
            if (scrollContainerRef.current) {
              const scrollAmount = scrollContainerRef.current.clientWidth * 0.8
              scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
            }
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg border-2 border-tracksuit-purple-200 hover:border-tracksuit-purple-400 transition-all"
          aria-label="Scroll left"
        >
          <svg className="w-6 h-6 text-tracksuit-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => {
            if (scrollContainerRef.current) {
              const scrollAmount = scrollContainerRef.current.clientWidth * 0.8
              scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
            }
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg border-2 border-tracksuit-purple-200 hover:border-tracksuit-purple-400 transition-all"
          aria-label="Scroll right"
        >
          <svg className="w-6 h-6 text-tracksuit-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 px-12"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {vehicles.map((vehicle) => {
            const isSelected = selectedVehicle === vehicle.id
            const isLocked = vehicle.isDLC && vehicle.dlcCode && !unlockedDLCs.has(vehicle.dlcCode)
            
            return (
              <div
                key={vehicle.id}
                onClick={() => !isLocked && handleSelect(vehicle)}
                className={`bg-white/80 backdrop-blur-sm rounded-xl border-2 shadow-lg transition-all duration-200 flex-shrink-0 w-80 ${
                  isLocked
                    ? 'border-tracksuit-purple-200/30 opacity-60 cursor-not-allowed relative'
                    : isSelected
                    ? 'border-tracksuit-purple-500 shadow-xl scale-105 cursor-pointer'
                    : 'border-tracksuit-purple-200/50 hover:border-tracksuit-purple-300 hover:shadow-xl cursor-pointer'
                }`}
              >
                {isLocked && (
                  <div className="absolute top-2 right-2 bg-tracksuit-purple-600 text-white text-xs px-2 py-1 rounded-full font-chapeau font-semibold z-10">
                    🔒 DLC
                  </div>
                )}
              <div className="p-6 flex flex-col items-center space-y-4">
                {/* Vehicle Image */}
                <div className="relative w-full h-32 flex items-center justify-center">
                  <img
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="max-w-full max-h-full object-contain"
                  />
                  {/* Animated Overlay Image */}
                  {showOverlay?.vehicleId === vehicle.id && (
                    <img
                      key={`overlay-${vehicle.id}-${Date.now()}`}
                      src={showOverlay.image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain z-10 vehicle-overlay-image"
                      style={{
                        animation: 'vehiclePopup 0.5s ease-out forwards',
                      }}
                    />
                  )}
                </div>

                {/* Vehicle Name */}
                <div className="text-center">
                  <h3 className="text-lg font-bold font-chapeau text-tracksuit-purple-800">
                    {vehicle.name}
                  </h3>
                </div>

                {/* Stats */}
                <div className="w-full space-y-2">
                  {/* Speed (formerly Pace) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-tracksuit-purple-700">Speed</span>
                      <span className="text-xs text-tracksuit-purple-600">{vehicle.pace}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${(vehicle.pace / 10) * 100}%`,
                          backgroundColor: '#e4dcf8' // Purple100
                        }}
                      />
                    </div>
                  </div>

                  {/* Armor */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-tracksuit-purple-700">Armor</span>
                      <span className="text-xs text-tracksuit-purple-600">{vehicle.armor}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${(vehicle.armor / 10) * 100}%`,
                          backgroundColor: '#c3e99c' // Green100
                        }}
                      />
                    </div>
                  </div>

                  {/* Damage (formerly Impact) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-tracksuit-purple-700">Damage</span>
                      <span className="text-xs text-tracksuit-purple-600">{vehicle.impact}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${(vehicle.impact / 10) * 100}%`,
                          backgroundColor: '#ffcada' // Pink100
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-tracksuit-purple-700 font-quicksand text-center leading-relaxed">
                  {vehicle.description}
                </p>

                {/* Select Button or Locked State */}
                {isLocked ? (
                  <div className="w-full text-center py-2 px-4 bg-gray-200 text-gray-500 rounded-lg font-chapeau cursor-not-allowed">
                    🔒 DLC Required
                  </div>
                ) : (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(vehicle)
                    }}
                    className={`w-full ${
                      isSelected
                        ? 'bg-tracksuit-purple-600 hover:bg-tracksuit-purple-700 text-white'
                        : 'bg-tracksuit-purple-200 hover:bg-tracksuit-purple-300 text-tracksuit-purple-800'
                    } font-chapeau`}
                  >
                    {isSelected ? '✓ Selected' : 'Select'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Start Game Button */}
      <div className="w-full flex justify-center">
        <Button
          size="lg"
          onClick={handleStart}
          disabled={!selectedVehicle}
          className="font-chapeau shadow-lg px-8"
          style={{ 
            backgroundColor: selectedVehicle ? '#8f80cc' : '#cccccc', 
            color: selectedVehicle ? '#f8f3ff' : '#666666',
            cursor: selectedVehicle ? 'pointer' : 'not-allowed'
          }}
          onMouseEnter={(e) => {
            if (selectedVehicle) {
              e.currentTarget.style.backgroundColor = '#7f70bc'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedVehicle) {
              e.currentTarget.style.backgroundColor = '#8f80cc'
            }
          }}
        >
          🎮 Start Game
        </Button>
      </div>
    </div>
  )
}

