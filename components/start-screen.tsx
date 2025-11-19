"use client"

import { Button } from "@/components/ui/button"
import { useAudioManager } from "@/hooks/use-audio-manager"
import Menu from "./menu"

interface StartScreenProps {
  onStart: () => void
  onInitializeAudio?: () => void
}

export default function StartScreen({ onStart, onInitializeAudio }: StartScreenProps) {
  const audioManager = useAudioManager()

  // Handle start game
  const handleStart = () => {
    // Initialize audio if not already done
    if (!audioManager.initialized) {
      audioManager.initialize()
    }
    
    // Call the parent's audio initialization function if provided
    if (onInitializeAudio) {
      onInitializeAudio()
    }

    // Start the game
    onStart()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-5xl mx-auto pt-24">
      <Menu />

      {/* Main content area - two column layout */}
      <div className="grid md:grid-cols-2 gap-6 w-full mb-6">
        {/* Left column - Luke image and description */}
        <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border-2 border-tracksuit-purple-200/50 shadow-lg flex flex-col items-center justify-start space-y-4">
          <div className="relative w-32 h-32">
            <img src="/images/luke.png" alt="Luke Amundson" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-3 text-left w-full">
            <p className="text-sm font-quicksand text-tracksuit-purple-700 leading-relaxed">
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
              <span>Use WASD keys to move Luke's car</span>
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

      {/* Start Game button - always visible */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full">
        <Button 
          size="lg" 
          onClick={handleStart} 
          className="bg-tracksuit-purple-600 hover:bg-tracksuit-purple-700 text-white font-chapeau shadow-lg px-8"
        >
          Start Game
        </Button>
      </div>
    </div>
  )
}
