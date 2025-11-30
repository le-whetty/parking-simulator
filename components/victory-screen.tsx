"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useAudioManager } from "@/hooks/use-audio-manager"
import { supabase } from "@/lib/supabase"
import Leaderboard from "./leaderboard"
import confetti from "canvas-confetti"

interface VictoryScreenProps {
  onRestart: () => void
  score?: number // Add optional score prop
}

export default function VictoryScreen({ onRestart, score = 0 }: VictoryScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioManager = useAudioManager()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [scoreSaved, setScoreSaved] = useState(false)
  const [murcaSongs, setMurcaSongs] = useState<string[]>([])
  const currentMurcaAudioRef = useRef<HTMLAudioElement | null>(null)
  const playedSongsRef = useRef<string[]>([]) // Track which songs have been played
  const shuffledQueueRef = useRef<string[]>([]) // Current shuffle queue
  const initialSongPlayedRef = useRef<boolean>(false) // Track if initial song has been played
  const [currentSongInfo, setCurrentSongInfo] = useState<{ artist: string; title: string } | null>(null)

  // Check authentication and save score
  useEffect(() => {
    async function checkAuthAndSaveScore() {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.email) {
          setUserEmail(session.user.email)
          
          // Fetch username
          const { data: usernameData } = await supabase
            .from('usernames')
            .select('username')
            .eq('user_email', session.user.email)
            .maybeSingle()
          
          if (usernameData?.username) {
            setUsername(usernameData.username)
          }
          
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


  // Fetch murca songs on mount
  useEffect(() => {
    async function fetchMurcaSongs() {
      try {
        const response = await fetch("/api/murca-songs")
        const data = await response.json()
        if (data.songs && data.songs.length > 0) {
          setMurcaSongs(data.songs)
          // Initialize shuffle queue with all songs
          shuffledQueueRef.current = [...data.songs]
          // Shuffle the queue
          for (let i = shuffledQueueRef.current.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQueueRef.current[i], shuffledQueueRef.current[j]] = [shuffledQueueRef.current[j], shuffledQueueRef.current[i]]
          }
          playedSongsRef.current = []
        } else {
          // No murca songs found - leave empty, will wait for API
          console.warn("No murca songs found")
        }
      } catch (error) {
        console.error("Error fetching murca songs:", error)
        // Error fetching - leave empty, will retry or wait
      }
    }
    fetchMurcaSongs()
  }, [])

  // Parse song filename to extract artist and title
  const parseSongFilename = useCallback((filename: string): { artist: string; title: string } => {
    // Remove .mp3 extension and path
    const basename = filename.split('/').pop()?.replace('.mp3', '') || filename.replace('.mp3', '')
    const parts = basename.split('-')
    
    if (parts.length < 3) {
      // Fallback if format is unexpected
      return { artist: 'Unknown Artist', title: basename.replace(/-/g, ' ') }
    }
    
    // First two parts are firstname-lastname (artist)
    const artist = `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)}`
    
    // Rest is song title (join with spaces and capitalize words)
    const titleParts = parts.slice(2)
    const title = titleParts
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    return { artist, title }
  }, [])

  // Play a random murca song with Spotify-style shuffle
  const playRandomMurcaSong = useCallback(() => {
    if (murcaSongs.length === 0) return

    // Stop current murca song if playing
    if (currentMurcaAudioRef.current) {
      currentMurcaAudioRef.current.pause()
      currentMurcaAudioRef.current.currentTime = 0
      // Remove any existing event listeners
      currentMurcaAudioRef.current.onended = null
    }

    // If queue is empty, reshuffle all songs
    if (shuffledQueueRef.current.length === 0) {
      shuffledQueueRef.current = [...murcaSongs]
      // Shuffle the queue
      for (let i = shuffledQueueRef.current.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQueueRef.current[i], shuffledQueueRef.current[j]] = [shuffledQueueRef.current[j], shuffledQueueRef.current[i]]
      }
      playedSongsRef.current = []
      console.log("🎵 Shuffle queue reset - all songs reshuffled")
    }

    // Get next song from queue
    const nextSong = shuffledQueueRef.current.shift()!
    playedSongsRef.current.push(nextSong)
    
    // Parse and update current song info
    const songInfo = parseSongFilename(nextSong)
    setCurrentSongInfo(songInfo)
    
    console.log(`🎵 Playing: ${nextSong} (${playedSongsRef.current.length}/${murcaSongs.length} played)`)
    
    // Create and play new audio
    const audio = new Audio(nextSong)
    audio.volume = 0.5
    
    // Add event listener for when song ends - play next song
    audio.addEventListener('ended', () => {
      console.log("🎵 Song ended, playing next in queue...")
      playRandomMurcaSong()
    })
    
    audio.play().catch((e) => {
      console.error("Error playing murca song:", e)
    })
    
    currentMurcaAudioRef.current = audio
  }, [murcaSongs, parseSongFilename])

  // Trigger fireworks animation and sound (reusable function)
  const triggerFireworks = useCallback(() => {
    // Play fireworks sound
    audioManager.play("fireworks")

    // Trigger fireworks confetti animation
    const duration = 5 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    }, 250)

    // Clean up interval after duration
    setTimeout(() => {
      clearInterval(interval)
    }, duration)
  }, [audioManager])

  // Handle initial song playback when murcaSongs are loaded
  useEffect(() => {
    // Stop theme music immediately
    audioManager.stop("theme")
    audioManager.stopAll()

    // Only play initial song once when songs become available (don't use anthem fallback)
    if (!initialSongPlayedRef.current && murcaSongs.length > 0) {
      console.log("VictoryScreen - murca songs loaded, playing initial song")
      playRandomMurcaSong()
      initialSongPlayedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [murcaSongs])

  // Trigger fireworks when victory screen loads (only once)
  useEffect(() => {
    triggerFireworks()
  }, [triggerFireworks])

  useEffect(() => {
    // Stop theme music when component mounts (only once)
    console.log("VictoryScreen mounted - stopping theme music")
    audioManager.stop("theme")
    audioManager.stopAll()

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
      // Only clean up on unmount - don't stop music on re-renders
      if (currentMurcaAudioRef.current) {
        currentMurcaAudioRef.current.pause()
        currentMurcaAudioRef.current.currentTime = 0
        currentMurcaAudioRef.current.onended = null
      }
      cancelAnimationFrame(animationId)
    }
    // Empty dependency array - only run once on mount, never re-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle restart with page refresh
  const handleRestart = () => {
    // Stop all sounds
    audioManager.stopAll()

    // Refresh the page instead of calling onRestart
    window.location.reload()
  }

  // Handle Increase 'murca button click - trigger fireworks and change song
  const handleIncreaseMurca = () => {
    // Play random murca song
    playRandomMurcaSong()

    // Trigger fireworks animation and sound
    triggerFireworks()
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#faf7f0]/95 backdrop-blur-sm flex items-center justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 animate-fadeIn border border-tracksuit-purple-200/50 relative overflow-hidden my-auto">
        {/* Magic card border effect */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-r from-tracksuit-purple-500 via-tracksuit-purple-600 to-tracksuit-purple-500 bg-[length:300%_300%] animate-[shine_3s_linear_infinite]"></div>
        </div>
        
        <div className="flex flex-col items-center justify-center gap-8 text-center relative z-10">
          <div className="relative w-full h-[300px]">
            <canvas ref={canvasRef} width={500} height={300} className="w-full h-full" />

            {/* Score overlay on the flag */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm px-8 py-8 rounded-lg transform rotate-[-5deg] border-2 border-tracksuit-purple-400/70 shadow-lg overflow-visible">
                <div className="text-5xl font-bold font-chapeau drop-shadow-lg flex items-baseline gap-2" style={{ lineHeight: '1.2' }}>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 to-tracksuit-purple-700">{score} dawgs</span>
                  <span className="text-5xl" style={{ lineHeight: '1' }}>🌭</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-2xl font-bold font-chapeau text-tracksuit-purple-800">Luke has secured the alpha parking spot!</p>

            <p className="text-tracksuit-purple-700 font-quicksand">
              While others may cite pregnancy, injury, or legitimate medical documentation, Luke cites only one thing: unwavering determination. The spot is his. It has always been his 🌭
            </p>
          </div>

          {/* Two-column layout above buttons */}
          <div className={`grid gap-4 w-full ${userEmail && userRank ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Left column - Rank */}
            {userEmail && userRank && (
              <div className="p-6 bg-gradient-to-r from-tracksuit-purple-50 via-tracksuit-purple-100/50 to-tracksuit-purple-50 rounded-xl border-2 border-tracksuit-purple-300/50 shadow-lg">
                <p className="text-sm uppercase tracking-wider text-tracksuit-purple-700 mb-2 font-semibold font-chapeau">Your Rank</p>
                <p className="text-4xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 to-tracksuit-purple-700">#{userRank}</p>
                <p className="text-sm text-tracksuit-purple-600 mt-2 font-quicksand truncate">
                  {username ? `@${username}` : userEmail}
                </p>
              </div>
            )}
            
            {/* Right column - Contest/Merch */}
            <div className="p-6 bg-gradient-to-r from-tracksuit-purple-50 via-tracksuit-purple-100/50 to-tracksuit-purple-50 rounded-xl border-2 border-tracksuit-purple-300/50 shadow-lg">
              <p className="text-sm uppercase tracking-wider text-tracksuit-purple-700 mb-2 font-semibold font-chapeau">Win Merch!</p>
              <p className="text-sm text-tracksuit-purple-700 font-quicksand mb-3">
                Top 3 scores by Wednesday, Nov 3 at 1pm NZT win the coveted{" "}
                <a
                  href="/images/im-parkin-here.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tracksuit-purple-600 hover:text-tracksuit-purple-800 underline font-semibold"
                >
                  "I'm parkin' here"
                </a>{" "}
                merch.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full">
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={() => setShowLeaderboard(true)}
                className="bg-tracksuit-purple-600 hover:bg-tracksuit-purple-700 text-white relative z-50 font-chapeau transition-colors shadow-lg flex-1"
              >
                View Leaderboard
              </Button>
              <Button 
                size="lg" 
                onClick={handleRestart} 
                className="bg-tracksuit-purple-700 hover:bg-tracksuit-purple-800 text-tracksuit-purple-100 relative z-50 font-chapeau transition-colors shadow-lg flex-1"
              >
                Play Again
              </Button>
            </div>
            <Button
              size="lg"
              onClick={handleIncreaseMurca}
              className="bg-gradient-to-r from-red-600 via-white to-blue-600 hover:from-red-700 hover:via-white hover:to-blue-700 relative z-50 font-chapeau transition-colors shadow-lg font-bold text-gray-900"
              style={{ 
                textShadow: '2px 2px 4px rgba(0,0,0,0.3), -1px -1px 2px rgba(255,255,255,0.5)',
                WebkitTextStroke: '0.5px rgba(0,0,0,0.2)'
              }}
            >
              Increase 'murca 🇺🇸
            </Button>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[60] bg-[#faf7f0]/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowLeaderboard(false)}
              className="absolute top-6 right-6 text-tracksuit-purple-700 hover:text-tracksuit-purple-600 text-3xl font-bold z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-lg border border-tracksuit-purple-200 transition-colors"
              aria-label="Close leaderboard"
            >
              ×
            </button>
            <Leaderboard userEmail={userEmail || undefined} userScore={score} userRank={userRank || undefined} />
          </div>
        </div>
      )}

      {/* Music Player UI - Bottom Right */}
      {currentSongInfo && (
        <div className="fixed bottom-6 right-6 z-50 bg-white/95 backdrop-blur-sm rounded-xl border-2 border-tracksuit-purple-300/50 shadow-lg p-4 max-w-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            {/* Music Icon */}
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-tracksuit-purple-500 to-tracksuit-purple-700 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            {/* Song Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold font-chapeau text-tracksuit-purple-800 truncate">
                {currentSongInfo.title}
              </p>
              <p className="text-xs font-quicksand text-tracksuit-purple-600 truncate">
                {currentSongInfo.artist}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
