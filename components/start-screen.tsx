"use client"

import { Button } from "@/components/ui/button"
import { useAudioManager } from "@/hooks/use-audio-manager"
import Menu from "./menu"

interface StartScreenProps {
  onStart: () => void
  onInitializeAudio?: () => void
  onLogout?: () => void
  username?: string | null
  onEditUsername?: () => void
  onVictorySimulator?: () => void
  onViewProfile?: () => void
  onViewDLCStore?: () => void
  hasAudioDLC?: boolean
  selectedHorn?: 1 | 2 | 3 | 'random'
  onHornChange?: (horn: 1 | 2 | 3 | 'random') => void
}

export default function StartScreen({ onStart, onInitializeAudio, onLogout, username, onEditUsername, onVictorySimulator, onViewProfile, onViewDLCStore, hasAudioDLC, selectedHorn = 1, onHornChange }: StartScreenProps) {
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
      <Menu onLogout={onLogout} onEditUsername={onEditUsername} onVictorySimulator={onVictorySimulator} onViewProfile={onViewProfile} onViewDLCStore={onViewDLCStore} />

      {/* Username Greeting */}
      {username && (
        <div className="w-full mb-6 text-center">
          <p className="text-2xl font-bold font-chapeau text-tracksuit-purple-800">
            Hey, @{username} 👋
          </p>
        </div>
      )}

      {/* Main content area - two column layout */}
      <div className="grid md:grid-cols-2 gap-6 w-full mb-6">
        {/* Left column - Luke image and description */}
        <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border-2 border-tracksuit-purple-200/50 shadow-lg flex flex-col items-center justify-start space-y-4">
          <div className="relative w-32 h-32">
            <img src="/images/luke-rounded.png" alt="Luke Amundson" className="w-full h-full object-contain rounded-full" />
          </div>
          <div className="space-y-3 text-left w-full">
            <p className="text-sm font-quicksand text-tracksuit-purple-700 leading-relaxed">
              What a start to the day! Play as Luke Amundson, Head of Sales ANZ at Tracksuit, in his daily battle for the priority parking space - normally reserved for expectant parents 🤰 and the temporarily injured 🤕
            </p>
            <p className="text-sm font-quicksand text-tracksuit-purple-700 leading-relaxed">
              Your first meeting is at 8:30 AM, but it's 8:28 AM and there's only one spot left ⏱️ Defeat your colleagues by throwing Kirkland™ hot dogs at their cars before they take your spot 🌭
            </p>
          </div>
        </div>

        {/* Right column - How to Play */}
        <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border-2 border-tracksuit-purple-200/50 shadow-lg">
          <h3 className="font-bold mb-4 text-tracksuit-purple-800 font-chapeau text-center">How to play</h3>
          <div className="space-y-2">
            <div className="bg-white/50 border border-tracksuit-purple-100/50 hover:bg-white/80 hover:border-tracksuit-purple-200/70 hover:shadow-sm rounded-xl px-4 py-3 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-tracksuit-purple-800 text-sm font-chapeau w-20 flex-shrink-0">Drive</div>
                <div className="text-tracksuit-purple-700 text-sm font-quicksand flex-1">Use WASD keys to drive</div>
              </div>
            </div>
            <div className="bg-white/50 border border-tracksuit-purple-100/50 hover:bg-white/80 hover:border-tracksuit-purple-200/70 hover:shadow-sm rounded-xl px-4 py-3 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-tracksuit-purple-800 text-sm font-chapeau w-20 flex-shrink-0">Attack</div>
                <div className="text-tracksuit-purple-700 text-sm font-quicksand flex-1">Press SPACE to throw hot dogs</div>
              </div>
            </div>
            <div className="bg-white/50 border border-tracksuit-purple-100/50 hover:bg-white/80 hover:border-tracksuit-purple-200/70 hover:shadow-sm rounded-xl px-4 py-3 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-tracksuit-purple-800 text-sm font-chapeau w-20 flex-shrink-0">Win</div>
                <div className="text-tracksuit-purple-700 text-sm font-quicksand flex-1">Defeat all drivers AND park in the green spot</div>
              </div>
            </div>
            <div className="bg-white/50 border border-tracksuit-purple-100/50 hover:bg-white/80 hover:border-tracksuit-purple-200/70 hover:shadow-sm rounded-xl px-4 py-3 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-tracksuit-purple-800 text-sm font-chapeau w-20 flex-shrink-0">Health</div>
                <div className="text-tracksuit-purple-700 text-sm font-quicksand flex-1">Don't let your health reach zero!</div>
              </div>
            </div>
            <div className="bg-white/50 border border-tracksuit-purple-100/50 hover:bg-white/80 hover:border-tracksuit-purple-200/70 hover:shadow-sm rounded-xl px-4 py-3 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-tracksuit-purple-800 text-sm font-chapeau w-20 flex-shrink-0">Time</div>
                <div className="text-tracksuit-purple-700 text-sm font-quicksand flex-1">Don't let the time run out!</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Horn Selection (DLC) */}
      {hasAudioDLC && onHornChange && (
        <div className="w-full mb-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border-2 border-tracksuit-purple-200/50 shadow-lg">
          <h3 className="font-bold mb-3 text-tracksuit-purple-800 font-chapeau text-center">Select Car Horn 🚗</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              onClick={() => onHornChange(1)}
              className={`font-chapeau text-sm px-4 py-2 ${
                selectedHorn === 1
                  ? 'bg-tracksuit-purple-600 text-white'
                  : 'bg-tracksuit-purple-200 text-tracksuit-purple-800 hover:bg-tracksuit-purple-300'
              }`}
            >
              Horn 1
            </Button>
            <Button
              onClick={() => onHornChange(2)}
              className={`font-chapeau text-sm px-4 py-2 ${
                selectedHorn === 2
                  ? 'bg-tracksuit-purple-600 text-white'
                  : 'bg-tracksuit-purple-200 text-tracksuit-purple-800 hover:bg-tracksuit-purple-300'
              }`}
            >
              Horn 2
            </Button>
            <Button
              onClick={() => onHornChange(3)}
              className={`font-chapeau text-sm px-4 py-2 ${
                selectedHorn === 3
                  ? 'bg-tracksuit-purple-600 text-white'
                  : 'bg-tracksuit-purple-200 text-tracksuit-purple-800 hover:bg-tracksuit-purple-300'
              }`}
            >
              Horn 3
            </Button>
            <Button
              onClick={() => onHornChange('random')}
              className={`font-chapeau text-sm px-4 py-2 ${
                selectedHorn === 'random'
                  ? 'bg-tracksuit-purple-600 text-white'
                  : 'bg-tracksuit-purple-200 text-tracksuit-purple-800 hover:bg-tracksuit-purple-300'
              }`}
            >
              🎲 Random
            </Button>
          </div>
          <p className="text-xs text-tracksuit-purple-600 text-center mt-2 font-quicksand">
            Press H during gameplay to honk your horn
          </p>
        </div>
      )}

      {/* Start Game button - always visible */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full">
        <Button 
          size="lg" 
          onClick={handleStart} 
          className="font-chapeau shadow-lg px-8"
          style={{ backgroundColor: '#8f80cc', color: '#f8f3ff' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7f70bc'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8f80cc'}
        >
          🎮 Start Game
        </Button>
      </div>
    </div>
  )
}
