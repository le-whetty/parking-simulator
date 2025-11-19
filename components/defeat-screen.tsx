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
    <div className="fixed inset-0 z-50 bg-[#faf7f0]/95 backdrop-blur-sm flex items-center justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 animate-fadeIn border border-tracksuit-purple-200/50 relative overflow-hidden my-auto">
        {/* Magic card border effect */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-r from-tracksuit-purple-500 via-tracksuit-purple-600 to-tracksuit-purple-500 bg-[length:300%_300%] animate-[shine_3s_linear_infinite]"></div>
        </div>

        <div className="flex flex-col items-center justify-center gap-8 text-center relative z-10">
          <div className="w-[200px] mx-auto">
            <img src="/logos/logo.png" alt="Tracksuit" className="w-full h-auto" />
          </div>

          <h1 className="text-5xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-700 to-red-600">
            DEFEAT!
          </h1>

          <div className="relative w-[200px] h-[200px] mx-auto bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center border-4 border-red-300/50 shadow-lg">
            <div className="text-6xl">😭</div>
            <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">❌</div>
          </div>

          <div className="space-y-4">
            <p className="text-2xl font-bold font-chapeau text-tracksuit-purple-800">Luke has lost the parking battle!</p>

            <p className="text-tracksuit-purple-700 font-quicksand">
              The alpha has been dethroned. Luke will have to park in the far lot today and walk the extra distance to the
              office. He will be late for his 8:30 AM. His day will be ruined.
            </p>
          </div>

          <Button 
            size="lg" 
            onClick={handleRestart} 
            className="bg-tracksuit-purple-700 hover:bg-tracksuit-purple-800 text-tracksuit-purple-100 font-chapeau transition-colors shadow-lg px-8"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}
