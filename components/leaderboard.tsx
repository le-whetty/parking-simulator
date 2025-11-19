"use client"

import { useEffect, useState } from "react"
import { LeaderboardEntry } from "@/lib/scores"

interface LeaderboardProps {
  userEmail?: string
  userScore?: number
  userRank?: number
}

export default function Leaderboard({ userEmail, userScore, userRank }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch("/api/leaderboard")
        if (response.ok) {
          const data = await response.json()
          console.log("Leaderboard data received:", data)
          setLeaderboard(data)
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error("Error fetching leaderboard:", response.status, errorData)
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 max-w-4xl w-full mx-auto border border-gray-700/50">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-green-500 via-tracksuit-green-600 to-tracksuit-green-700 mb-2">
          Leaderboard
        </h2>
        <div className="h-1 w-24 bg-gradient-to-r from-tracksuit-green-500 to-tracksuit-green-600 mx-auto rounded-full"></div>
      </div>

      {userEmail && userScore !== undefined && userRank !== undefined && (
        <div className="mb-8 p-6 bg-gradient-to-r from-tracksuit-purple-700/60 via-tracksuit-purple-600/60 to-tracksuit-purple-700/60 rounded-xl border-2 border-tracksuit-purple-500/50 shadow-lg backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm uppercase tracking-wider text-tracksuit-purple-200 mb-2 font-semibold font-chapeau">Your Score</p>
            <p className="text-4xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-300 to-tracksuit-purple-200 mb-2">
              {userScore.toLocaleString()} dawgs
            </p>
            <div className="flex items-center justify-center gap-3 text-sm text-tracksuit-purple-200 font-quicksand">
              <span className="px-3 py-1 bg-tracksuit-purple-700/50 rounded-full font-semibold">Rank #{userRank}</span>
              <span className="text-tracksuit-purple-300">•</span>
              <span className="truncate max-w-xs">{userEmail}</span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tracksuit-green-500 mb-3"></div>
          <p className="font-quicksand">Loading leaderboard...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-xl text-gray-400 mb-2 font-chapeau">No scores yet</p>
          <p className="text-sm text-gray-500 font-quicksand">Be the first to claim the top spot!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b-2 border-gray-700/50 font-chapeau">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-3 text-right">Score</div>
            <div className="col-span-4 text-right">Date</div>
          </div>
          
          {/* Leaderboard entries */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-700/30 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-tracksuit-green-500/50 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-tracksuit-green-500/70">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = userEmail && entry.user_email === userEmail
              const isTopThree = entry.rank <= 3
              
              return (
                <div
                  key={`${entry.user_email}-${entry.created_at}`}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 rounded-xl transition-all duration-200 ${
                    isCurrentUser
                      ? "bg-gradient-to-r from-tracksuit-purple-700/40 via-tracksuit-purple-600/40 to-tracksuit-purple-700/40 border-2 border-tracksuit-purple-500/70 shadow-lg scale-[1.02]"
                      : isTopThree
                      ? "bg-gradient-to-r from-tracksuit-green-800/20 via-tracksuit-green-700/20 to-tracksuit-green-800/20 border border-tracksuit-green-600/30 hover:border-tracksuit-green-500/50"
                      : "bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 hover:border-gray-500/50"
                  }`}
                >
                  {/* Rank */}
                  <div className={`col-span-1 flex items-center justify-center ${
                    entry.rank === 1 ? "text-tracksuit-green-500" : 
                    entry.rank === 2 ? "text-gray-300" : 
                    entry.rank === 3 ? "text-tracksuit-purple-400" : 
                    "text-gray-400"
                  } font-bold text-lg font-chapeau`}>
                    {entry.rank === 1 && "🥇"}
                    {entry.rank === 2 && "🥈"}
                    {entry.rank === 3 && "🥉"}
                    {entry.rank > 3 && `#${entry.rank}`}
                  </div>
                  
                  {/* Player Email */}
                  <div className={`col-span-4 flex items-center ${
                    isCurrentUser ? "text-tracksuit-purple-300 font-semibold" : "text-gray-300"
                  } font-quicksand`}>
                    <span className="truncate">{entry.user_email}</span>
                    {isCurrentUser && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-tracksuit-purple-600/50 rounded-full font-chapeau">You</span>
                    )}
                  </div>
                  
                  {/* Score */}
                  <div className="col-span-3 text-right flex items-center justify-end">
                    <span className="font-bold text-tracksuit-green-500 text-lg font-chapeau">
                      {entry.score.toLocaleString()}
                    </span>
                    <span className="ml-1 text-xs text-gray-500 font-quicksand">dawgs</span>
                  </div>
                  
                  {/* Date */}
                  <div className="col-span-4 text-right text-sm text-gray-400 flex items-center justify-end font-quicksand">
                    {entry.created_at ? formatDate(entry.created_at) : 'N/A'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

