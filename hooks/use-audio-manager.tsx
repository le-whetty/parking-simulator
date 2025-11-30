"use client"

import { useState, useRef } from "react"

// Define the sound types we'll use in the game
export type SoundType = "throw" | "babyCry" | "ouch" | "no" | "anthem" | "theme" | "slack" | "menuTheme" | "explosion" | "countdown" | "3-2-1"

// Create a simple audio manager hook
export function useAudioManager() {
  const [initialized, setInitialized] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const soundsRef = useRef<Map<SoundType, HTMLAudioElement>>(new Map())

  // Initialize all sounds at once after user interaction
  const initialize = () => {
    // Don't reinitialize if already initialized - just return
    if (initialized) {
      console.log("Audio manager already initialized, skipping reinitialization")
      return
    }

    try {
      // Stop all existing audio before creating new ones
      if (soundsRef.current.size > 0) {
        console.log("Stopping all existing audio before reinitializing...")
        soundsRef.current.forEach((sound, type) => {
          try {
            sound.pause()
            sound.currentTime = 0
            sound.loop = false
            sound.onended = null
            sound.onplay = null
            // Remove from DOM if it was added
            if (sound.parentNode) {
              sound.parentNode.removeChild(sound)
            }
          } catch (e) {
            console.log(`Error stopping existing ${type} audio:`, e)
          }
        })
        soundsRef.current.clear()
      }

      // Create and resume audio context to help with browser autoplay policies
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const audioContext = new AudioContext()
        console.log("Audio context created, state:", audioContext.state)
        if (audioContext.state === "suspended") {
          audioContext.resume().then(() => {
            console.log("Audio context resumed successfully")
          }).catch((e) => {
            console.error("Could not resume audio context:", e)
          })
        } else {
          console.log("Audio context already active")
        }
      }

      // Define all the sounds we'll use - now using local files
      const sounds: [SoundType, string][] = [
        ["throw", "/music/throw.mp3"],
        ["babyCry", "/music/baby-cry.mp3"],
        ["ouch", "/music/ouch.mp3"],
        ["no", "/music/no.mp3"],
        ["anthem", "/music/anthem.mp3"],
        ["theme", "/music/theme.mp3"],
        ["slack", "/music/slack.mp3"],
        ["menuTheme", "/music/menu-theme.mp3"],
        ["explosion", "/music/explosion.mp3"],
        ["countdown", "/music/countdown.mp3"],
        ["3-2-1", "/music/3-2-1.mp3"],
      ]

      // Pre-load all sounds
      sounds.forEach(([type, src]) => {
        const audio = new Audio(src)
        audio.preload = "auto"
        
        // Add error handling for loading
        audio.addEventListener("error", (e) => {
          console.error(`Error loading ${type} sound from ${src}:`, e)
        })
        
        audio.addEventListener("canplaythrough", () => {
          console.log(`Sound ${type} loaded successfully`)
        })

        // Store special IDs for theme music for easier access
        if (type === "theme") {
          audio.id = "theme-audio"
          audio.loop = true // Enable looping for theme music
          // Also store on window for easier access
          const anyWindow = window as any
          anyWindow.themeAudio = audio
          console.log("Theme audio element created:", audio.src)
        }
        
        // Enable looping for menu theme
        if (type === "menuTheme") {
          audio.loop = true
          console.log("Menu theme audio element created:", audio.src)
        }

        // Store in our map
        soundsRef.current.set(type, audio)
      })

      setInitialized(true)
      setEnabled(true)
      console.log("Audio manager initialized successfully")
    } catch (e) {
      console.error("Error initializing audio manager:", e)
      // Still mark as initialized so the game can continue
      setInitialized(true)
    }
  }

  // Play a sound by type
  const play = (type: SoundType) => {
    // Check if sound exists in map instead of relying on initialized state
    // (state updates are async, but refs are synchronous)
    const sound = soundsRef.current.get(type)
    if (!sound) {
      console.log(`Sound ${type} not found in map - audio may not be initialized yet`)
      // Try to initialize if not already done
      if (!initialized) {
        console.log("Initializing audio manager on demand...")
        initialize()
        // Wait a bit and retry
        setTimeout(() => {
          const retrySound = soundsRef.current.get(type)
          if (retrySound) {
            console.log(`Retrying to play ${type} after initialization`)
            play(type)
          }
        }, 100)
      }
      return
    }

    try {

      // Clone the audio to allow overlapping sounds
      if (type === "throw") {
        const clone = new Audio(sound.src)
        clone.volume = 0.5
        clone.play().catch((e) => {
          console.log(`Error playing ${type} sound:`, e)
        })
      } else if (type === "theme") {
        // For theme music, ensure it loops and plays
        console.log(`🎵 Attempting to play theme music`)
        console.log(`  - src: ${sound.src}`)
        console.log(`  - readyState: ${sound.readyState} (0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)`)
        console.log(`  - networkState: ${sound.networkState}`)
        console.log(`  - error:`, sound.error)
        console.log(`  - paused:`, sound.paused)
        
        // Ensure audio context is active
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContext) {
          const audioContext = new AudioContext()
          if (audioContext.state === "suspended") {
            console.log("Audio context suspended, resuming...")
            audioContext.resume().then(() => {
              console.log("Audio context resumed, now playing theme")
              playThemeMusic(sound)
            }).catch((e) => {
              console.error("Failed to resume audio context:", e)
            })
            return
          }
        }
        
        playThemeMusic(sound)
      } else if (type === "menuTheme") {
        // For menu theme, ensure it loops and plays
        console.log(`🎵 Attempting to play menu theme music`)
        sound.currentTime = 0
        sound.volume = 0.5
        sound.loop = true
        const playPromise = sound.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("✅ Menu theme music started playing successfully!")
            })
            .catch((e) => {
              console.error(`❌ Error playing menu theme:`, e)
            })
        }
      } else if (type === "ouch") {
        // For ouch sound, play at higher volume
        sound.currentTime = 0
        sound.volume = 0.9 // Increased from 0.5 to 0.9 for better audibility
        sound.play().catch((e) => {
          console.log(`Error playing ${type} sound:`, e)
        })
      } else {
        // For other sounds, just reset and play the original
        sound.currentTime = 0
        sound.volume = 0.5
        sound.play().catch((e) => {
          console.log(`Error playing ${type} sound:`, e)
        })
      }
    } catch (e) {
      console.log(`Error playing ${type} sound:`, e)
    }
  }

  // Stop a specific sound
  const stop = (type: SoundType) => {
    try {
      const sound = soundsRef.current.get(type)
      if (sound) {
        console.log(`Stopping ${type} sound - paused: ${sound.paused}, currentTime: ${sound.currentTime}, src: ${sound.src}`)
        // Aggressively stop the audio
        sound.pause()
        sound.currentTime = 0
        sound.loop = false
        // Remove any event listeners that might restart it
        sound.onended = null
        sound.onplay = null
        sound.oncanplay = null
        sound.oncanplaythrough = null
        // Remove all event listeners by cloning the node (removes all listeners)
        const newSound = sound.cloneNode(false) as HTMLAudioElement
        newSound.src = sound.src
        newSound.preload = sound.preload
        // Replace the old sound with the new one (which has no event listeners)
        soundsRef.current.set(type, newSound)
        console.log(`Stopped ${type} sound successfully - replaced with clean instance`)
      } else {
        console.log(`Sound ${type} not found in map when trying to stop`)
      }
    } catch (e) {
      console.log(`Error stopping ${type} sound:`, e)
    }
  }

  // Helper function to play theme music
  const playThemeMusic = (sound: HTMLAudioElement) => {
    // Wait for audio to be ready if needed
    if (sound.readyState < 2) {
      console.log("Theme audio not ready yet, waiting for canplay event...")
      const playWhenReady = () => {
        console.log("Theme audio can now play, attempting playback...")
        sound.currentTime = 0
        sound.volume = 0.5
        sound.loop = true
        sound.play().then(() => {
          console.log("✅ Theme music started playing successfully!")
        }).catch((e) => {
          console.error("❌ Error playing theme after canplay:", e)
        })
      }
      
      sound.addEventListener("canplay", playWhenReady, { once: true })
      sound.addEventListener("canplaythrough", playWhenReady, { once: true })
      
      // Also try to load it explicitly
      sound.load()
      return
    }
    
    sound.currentTime = 0
    sound.volume = 0.5
    sound.loop = true
    const playPromise = sound.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("✅ Theme music started playing successfully!")
        })
        .catch((e) => {
          console.error(`❌ Error playing theme sound:`, e)
          console.error(`   Error details:`, {
            name: e.name,
            message: e.message
          })
        })
    }
  }

  // Stop all sounds
  const stopAll = () => {
    // Check if sounds exist in map instead of initialized state
    if (soundsRef.current.size === 0) return

    try {
      soundsRef.current.forEach((sound) => {
        sound.pause()
        sound.currentTime = 0
      })
    } catch (e) {
      console.log("Error stopping all sounds:", e)
    }
  }

  return {
    initialized,
    enabled,
    initialize,
    play,
    stop,
    stopAll,
  }
}
