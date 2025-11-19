"use client"

import { useEffect, useState } from "react"
import VictoryScreen from "./victory-screen"

interface VictoryDetectorProps {
  isInParkingSpot: boolean
  allDriversDefeated: boolean
  onRestart: () => void
  score: number // Add score prop
}

export default function VictoryDetector({
  isInParkingSpot,
  allDriversDefeated,
  onRestart,
  score,
}: VictoryDetectorProps) {
  const [showVictory, setShowVictory] = useState(false)

  // Check for victory condition
  useEffect(() => {
    if (isInParkingSpot && allDriversDefeated && !showVictory) {
      console.log("VICTORY DETECTOR: Victory conditions met!")

      // Pause any existing theme music - more aggressive approach
      const pauseAllAudio = () => {
        // Find all audio elements and pause them
        const audioElements = document.querySelectorAll("audio")
        audioElements.forEach((audio) => {
          console.log("Pausing audio:", audio.src)
          audio.pause()
        })

        // Also try to find any audio that might be playing from the theme
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
      }

      // Pause existing audio
      pauseAllAudio()

      // Show victory screen after a short delay
      setTimeout(() => {
        console.log("VICTORY DETECTOR: Showing victory screen")
        setShowVictory(true)
      }, 1000)
    }
  }, [isInParkingSpot, allDriversDefeated, showVictory])

  // Render victory screen if conditions are met
  if (showVictory) {
    console.log("VICTORY DETECTOR: Rendering victory screen")
    return <VictoryScreen onRestart={onRestart} score={score} />
  }

  // Otherwise render nothing
  return null
}
