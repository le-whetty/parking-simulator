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
  hasBossBattleDLC?: boolean
  isDLCLoading?: boolean
  gameMode?: 'normal' | 'boss-battle'
  onGameModeChange?: (mode: 'normal' | 'boss-battle') => void
}

export default function StartScreen({ onStart, onInitializeAudio, onLogout, username, onEditUsername, onVictorySimulator, onViewProfile, onViewDLCStore, hasBossBattleDLC, isDLCLoading = false, gameMode = 'normal', onGameModeChange }: StartScreenProps) {
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


      {/* DLC Loading Indicator */}
      {isDLCLoading && (
        <div className="w-full mb-6 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-3 bg-tracksuit-purple-50 rounded-lg border border-tracksuit-purple-200 shadow-sm">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-tracksuit-purple-600"></div>
            <span className="text-base font-semibold text-tracksuit-purple-700 font-chapeau">Checking DLC...</span>
          </div>
        </div>
      )}

      {/* Start Game buttons */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full">
        {isDLCLoading ? (
          <div className="text-tracksuit-purple-600 font-quicksand text-sm opacity-75">
            Loading game options...
          </div>
        ) : hasBossBattleDLC && onGameModeChange ? (
          <>
            <Button 
              size="lg" 
              onClick={() => {
                onGameModeChange('normal')
                handleStart()
              }}
              className="font-chapeau shadow-lg px-8"
              style={{ backgroundColor: '#8f80cc', color: '#f8f3ff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7f70bc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8f80cc'}
            >
              🎮 Start I'm Parkin' Here Game
            </Button>
            <Button 
              size="lg" 
              onClick={() => {
                onGameModeChange('boss-battle')
                handleStart()
              }}
              className="font-chapeau shadow-lg px-8"
              style={{ backgroundColor: '#8f80cc', color: '#f8f3ff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7f70bc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8f80cc'}
            >
              👔 Start Boss Battle
            </Button>
          </>
        ) : (
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
        )}
      </div>
    </div>
  )
}
