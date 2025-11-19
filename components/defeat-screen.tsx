"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAudioManager } from "@/hooks/use-audio-manager"

interface DefeatScreenProps {
  onRestart: () => void
}

export default function DefeatScreen({ onRestart }: DefeatScreenProps) {
  const audioManager = useAudioManager()

  // Add useEffect to handle audio when defeat screen is shown
  useEffect(() => {
    console.log("DefeatScreen mounted - stopping theme music and playing defeat sound")

    // Stop all other sounds
    audioManager.stopAll()

    // Play defeat sound
    audioManager.play("no")
  }, [audioManager])

  // Handle restart with page refresh
  const handleRestart = () => {
    // Stop all sounds
    audioManager.stopAll()

    // Refresh the page instead of calling onRestart
    window.location.reload()
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8 max-w-2xl text-center font-quicksand">
      <div className="w-[300px] mx-auto mb-6">
        <img src="/logos/logo.png" alt="Tracksuit" className="w-full h-auto" />
      </div>

      <h1 className="text-4xl font-bold text-ts-pink-600">DEFEAT!</h1>

      <div className="relative w-[200px] h-[200px] mx-auto bg-ts-pink-100 rounded-full flex items-center justify-center">
        <div className="text-6xl">😭</div>
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-50">❌</div>
      </div>

      <div className="space-y-4">
        <p className="text-2xl font-bold text-ts-pink-700">Luke has lost the parking battle!</p>

        <p className="text-ts-pink-600">
          The alpha has been dethroned. Luke will have to park in the far lot today and walk the extra distance to the
          office. He will be late for his 8:30 AM. His day will be ruined.
        </p>
      </div>

      <Button 
        size="lg" 
        onClick={handleRestart} 
        className="bg-[#7066a3] hover:bg-[#5d5288] text-white font-bold px-8 py-6 text-lg shadow-lg transition-all duration-200"
      >
        Try Again
      </Button>
    </div>
  )
}
