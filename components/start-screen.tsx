"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAudioManager } from "@/hooks/use-audio-manager"

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
    <div className="flex flex-col items-center justify-center gap-8 p-8 max-w-2xl text-center">
      <div className="mb-4">
        <img src="/images/tracksuit-logo-purple.png" alt="Tracksuit" className="w-[300px] mx-auto" />
      </div>
      <h1 className="text-4xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 to-tracksuit-purple-700">Parking Simulator</h1>

      <div className="relative w-[200px] h-[200px] mx-auto">
        <img src="/images/luke.png" alt="Luke Amundson" className="w-full h-full object-contain" />
      </div>

      <div className="space-y-4">
        <p className="text-xl font-quicksand text-tracksuit-purple-800">
          Play as Luke Amundson, Head of Sales ANZ at Tracksuit, in his daily battle for the priority parking space -
          normally reserved for expectant parents and the temporarily injured!
        </p>

        <p className="font-quicksand text-tracksuit-purple-700">
          Your first meeting is at 8:30 AM, but it's 8:28 AM and there's only one spot left - and it's the closest to
          the office. Defeat your pregnant and injured colleagues by throwing Kirkland™ hot dogs at their cars before
          they take your spot!
        </p>

        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border-2 border-tracksuit-purple-200/50 shadow-lg">
          <h3 className="font-bold mb-3 text-tracksuit-purple-800 font-chapeau">How to Play:</h3>
          <ul className="text-left list-disc pl-5 space-y-2 font-quicksand text-tracksuit-purple-700">
            <li>Use Arrow keys to move Luke's car</li>
            <li>Press SPACE to throw hot dogs at the approaching cars</li>
            <li>Pregnant drivers throw baby bottles, injured drivers throw crutches</li>
            <li>To win: Defeat all drivers AND park in the green spot</li>
            <li>Don't let your health reach zero!</li>
            <li>Land that sweet alpha parking spot before 8:30 AM!</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-4 items-center">
        <Button
          onClick={initializeAudio}
          className="bg-tracksuit-purple-200 hover:bg-tracksuit-purple-300 text-tracksuit-purple-800 font-chapeau"
          disabled={audioInitialized || isCheckingAudio}
        >
          {isCheckingAudio ? "Initializing..." : audioInitialized ? "Sound Enabled ✓" : "Enable Sound"}
        </Button>

        <Button size="lg" onClick={handleStart} className="bg-tracksuit-purple-600 hover:bg-tracksuit-purple-700 text-white font-chapeau shadow-lg">
          Start Game
        </Button>

        {!audioInitialized && (
          <p className="text-xs text-tracksuit-purple-500 mt-2 font-quicksand">
            Note: Click "Enable Sound" first for the full game experience with audio
          </p>
        )}
      </div>
    </div>
  )
}
