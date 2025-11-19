"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAudioManager } from "@/hooks/use-audio-manager"
import { supabase } from "@/lib/supabase"
import Leaderboard from "./leaderboard"

interface VictoryScreenProps {
  onRestart: () => void
  score?: number // Add optional score prop
}

export default function VictoryScreen({ onRestart, score = 0 }: VictoryScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioManager = useAudioManager()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [scoreSaved, setScoreSaved] = useState(false)

  // Check authentication and save score
  useEffect(() => {
    async function checkAuthAndSaveScore() {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.email) {
          setUserEmail(session.user.email)
          
          // Save the score
          if (!scoreSaved) {
            // Get the access token for authentication
            const accessToken = session.access_token
            
            const response = await fetch("/api/save-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userEmail: session.user.email,
                score: score,
                accessToken: accessToken,
              }),
            })
            
            if (response.ok) {
              const data = await response.json()
              setUserRank(data.rank)
              setScoreSaved(true)
            } else {
              const errorData = await response.json().catch(() => ({}))
              console.error("Failed to save score:", errorData)
            }
          }
        }
      } catch (error) {
        console.error("Error checking auth or saving score:", error)
      }
    }

    checkAuthAndSaveScore()
  }, [score, scoreSaved])


  useEffect(() => {
    console.log("VictoryScreen mounted - stopping theme and playing anthem")

    // Stop theme music specifically
    audioManager.stop("theme")
    
    // Stop all other sounds
    audioManager.stopAll()

    // Play anthem (only once)
    audioManager.play("anthem")

    // Animate the flag
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Create a simple flag animation without relying on external images
    let frame = 0

    const animate = () => {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw US flag background (blue rectangle)
      ctx.fillStyle = "#002868"
      ctx.fillRect(0, 0, canvas.width * 0.4, canvas.height * 0.5)

      // Draw stars
      ctx.fillStyle = "white"
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 6; j++) {
          ctx.beginPath()
          const x = (canvas.width * 0.4 * (j + 0.5)) / 6
          const y = (canvas.height * 0.5 * (i + 0.5)) / 5
          const size = 5
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Draw stripes
      const stripeHeight = canvas.height / 13
      for (let i = 0; i < 13; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#BF0A30" : "white"

        // Create wave effect
        for (let x = 0; x < canvas.width; x++) {
          const xOffset = Math.sin(frame / 20 + x / 30) * 5
          const y = i * stripeHeight + xOffset

          ctx.fillRect(i < 7 ? canvas.width * 0.4 : 0, y, i < 7 ? canvas.width * 0.6 : canvas.width, stripeHeight)
        }
      }

      // Draw Luke with opacity
      ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
      ctx.fillRect(canvas.width / 2 - 50, canvas.height / 2 - 50, 100, 100)

      // Draw Luke's name
      ctx.fillStyle = "white"
      ctx.font = "20px Arial"
      ctx.textAlign = "center"
      ctx.fillText("LUKE", canvas.width / 2, canvas.height / 2 + 80)

      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)

    return () => {
      audioManager.stop("anthem")
      cancelAnimationFrame(animationId)
    }
  }, [audioManager])

  // Handle restart with page refresh
  const handleRestart = () => {
    // Stop all sounds
    audioManager.stopAll()

    // Refresh the page instead of calling onRestart
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 bg-tracksuit-neutral-black/90 flex items-center justify-center">
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 animate-fadeIn border border-gray-700/50">
        <div className="flex flex-col items-center justify-center gap-8 text-center">
          <h1 className="text-5xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-green-500 via-tracksuit-green-600 to-tracksuit-green-700">
            VICTORY!
          </h1>

          <div className="relative w-full h-[300px]">
            <canvas ref={canvasRef} width={500} height={300} className="w-full h-full" />

            {/* Score overlay on the flag */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-tracksuit-neutral-black/70 px-8 py-4 rounded-lg transform rotate-[-5deg] border-2 border-tracksuit-purple-500/50">
                <div className="text-5xl font-bold font-chapeau text-tracksuit-purple-400 drop-shadow-lg">{score} dawgs 🌭</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-2xl font-bold font-chapeau text-tracksuit-neutral-white">Luke has secured the alpha parking spot!</p>

            <p className="text-gray-300 font-quicksand">
              Another day, another victory in the dawg-eat-dawg world of office parking. The vulnerable and impaired
              colleagues have been defeated, and once again Luke's dominance is unchallenged 🌭
            </p>
          </div>

          {userEmail && userRank && (
            <div className="p-6 bg-gradient-to-r from-tracksuit-purple-700/60 via-tracksuit-purple-600/60 to-tracksuit-purple-700/60 rounded-xl border-2 border-tracksuit-purple-500/70 shadow-lg backdrop-blur-sm">
              <p className="text-sm uppercase tracking-wider text-tracksuit-purple-200 mb-2 font-semibold font-chapeau">Your Rank</p>
              <p className="text-4xl font-bold font-chapeau text-tracksuit-purple-300">#{userRank}</p>
              <p className="text-sm text-tracksuit-purple-200 mt-2 font-quicksand">{userEmail}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              size="lg"
              onClick={() => setShowLeaderboard(true)}
              className="bg-tracksuit-purple-600 hover:bg-tracksuit-purple-700 text-white relative z-50 font-chapeau transition-colors"
            >
              View Leaderboard
            </Button>
            <Button 
              size="lg" 
              onClick={handleRestart} 
              className="bg-tracksuit-green-600 hover:bg-tracksuit-green-700 text-white relative z-50 font-chapeau transition-colors"
            >
              Play Again
            </Button>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[60] bg-tracksuit-neutral-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowLeaderboard(false)}
              className="absolute top-6 right-6 text-tracksuit-neutral-white hover:text-tracksuit-purple-300 text-3xl font-bold z-10 w-10 h-10 flex items-center justify-center rounded-full bg-tracksuit-purple-800/80 hover:bg-tracksuit-purple-700/80 transition-colors"
              aria-label="Close leaderboard"
            >
              ×
            </button>
            <Leaderboard userEmail={userEmail || undefined} userScore={score} userRank={userRank || undefined} />
          </div>
        </div>
      )}
    </div>
  )
}
