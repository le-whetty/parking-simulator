"use client"

import { useEffect, useRef, useState } from "react"

export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    try {
      const audio = new Audio()

      // Add event listeners
      audio.addEventListener("canplaythrough", () => {
        setIsLoaded(true)
        console.log(`Sound loaded: ${src}`)
      })

      audio.addEventListener("error", (e) => {
        console.error(`Could not load sound: ${src}`, e)
        setError(true)
      })

      // Set source and load
      audio.src = src
      audio.load()

      audioRef.current = audio

      return () => {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }
      }
    } catch (err) {
      console.error("Error setting up audio:", err)
      setError(true)
    }
  }, [src])

  const play = () => {
    if (audioRef.current && isLoaded && !error) {
      // Reset the audio to the beginning
      audioRef.current.currentTime = 0

      // Set volume
      audioRef.current.volume = 0.5

      console.log(`Playing sound: ${src}`)

      // Play with promise handling for better error reporting
      const playPromise = audioRef.current.play()

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error(`Error playing sound ${src}:`, err.message)
          setError(true)
        })
      }
    } else {
      // If sound can't be played, log the reason
      if (!audioRef.current) {
        console.error(`Sound not available (no audio ref): ${src}`)
      } else if (!isLoaded) {
        console.error(`Sound not loaded yet: ${src}`)
      } else if (error) {
        console.error(`Sound has error: ${src}`)
      }
    }
  }

  const stop = () => {
    if (audioRef.current && isLoaded && !error) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  return { play, stop, isLoaded, error }
}
