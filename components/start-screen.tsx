"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAudioManager } from "@/hooks/use-audio-manager"
import Menu from "./menu"

interface StartScreenProps {
  onStart: () => void
  onInitializeAudio?: () => void
}

export default function StartScreen({ onStart, onInitializeAudio }: StartScreenProps) {
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [isCheckingAudio, setIsCheckingAudio] = useState(false)
  const audioManager = useAudioManager()

  // Initialize audio when the button is clicked
  const initializeAudio = () => {
    setIsCheckingAudio(true)

    // Initialize our audio manager
    audioManager.initialize()

    // Call the parent's audio initialization function if provided
    if (onInitializeAudio) {
      onInitializeAudio()
    }

    // Mark as initialized after a short delay
    setTimeout(() => {
      setAudioInitialized(true)
      setIsCheckingAudio(false)
    }, 500)
  }

  // Handle start game with audio
  const handleStart = () => {
    // Play a sound to confirm audio is working
    if (audioInitialized) {
      audioManager.play("theme")
    }

    // Start the game
    onStart()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-5xl mx-auto pt-24">
      <Menu onStartGame={handleStart} />

      {/* Main content area - two column layout */}
      <div className="grid md:grid-cols-2 gap-6 w-full mb-6">
        {/* Left column - Luke image and description */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-32 h-32">
            <img src="/images/luke.png" alt="Luke Amundson" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-sm font-quicksand text-tracksuit-purple-800 leading-relaxed">
              Play as Luke Amundson, Head of Sales ANZ at Tracksuit, in his daily battle for the priority parking space - normally reserved for expectant parents and the temporarily injured!
            </p>
            <p className="text-sm font-quicksand text-tracksuit-purple-700 leading-relaxed">
              Your first meeting is at 8:30 AM, but it's 8:28 AM and there's only one spot left. Defeat your colleagues by throwing Kirkland™ hot dogs at their cars before they take your spot!
            </p>
          </div>
        </div>

        {/* Right column - How to Play */}
        <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border-2 border-tracksuit-purple-200/50 shadow-lg">
          <h3 className="font-bold mb-3 text-tracksuit-purple-800 font-chapeau text-center">How to Play</h3>
          <ul className="text-sm space-y-1.5 font-quicksand text-tracksuit-purple-700">
            <li className="flex items-start gap-2">
              <span className="text-tracksuit-purple-500 mt-0.5">•</span>
              <span>Use Arrow keys to move Luke's car</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-tracksuit-purple-500 mt-0.5">•</span>
              <span>Press SPACE to throw hot dogs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-tracksuit-purple-500 mt-0.5">•</span>
              <span>Defeat all drivers AND park in the green spot</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-tracksuit-purple-500 mt-0.5">•</span>
              <span>Don't let your health reach zero!</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-tracksuit-purple-500 mt-0.5">•</span>
              <span>Land the alpha parking spot before 8:30 AM!</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Action buttons - always visible */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full">
        <Button
          onClick={initializeAudio}
          className="bg-tracksuit-purple-200 hover:bg-tracksuit-purple-300 text-tracksuit-purple-800 font-chapeau text-sm px-6"
          disabled={audioInitialized || isCheckingAudio}
        >
          {isCheckingAudio ? "Initializing..." : audioInitialized ? "Sound Enabled ✓" : "Enable Sound"}
        </Button>
      </div>

      {!audioInitialized && (
        <p className="text-xs text-tracksuit-purple-500 mt-2 font-quicksand text-center">
          Note: Click "Enable Sound" first for the full game experience
        </p>
      )}
    </div>
  )
}
