"use client"

import { useEffect, useState } from "react"
import { LeaderboardEntry } from "@/lib/scores"
import { supabase } from "@/lib/supabase"

interface LeaderboardProps {
  userEmail?: string
  userScore?: number
  userRank?: number
}

export default function Leaderboard({ userEmail, userScore, userRank }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch("/api/leaderboard")
        if (response.ok) {
          const data = await response.json()
          console.log("Leaderboard data received:", data)
          setLeaderboard(data)
          
          // Fetch profile pictures for each user
          const pics: Record<string, string | null> = {}
          for (const entry of data) {
            try {
              // Get user's auth data to access profile picture
              // We'll use the admin API approach or get from user metadata
              // For now, let's try to get it from the current session if available
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user?.email === entry.user_email) {
                pics[entry.user_email] = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
              } else {
                // For other users, we'd need admin access or store pics in usernames table
                // For now, we'll leave it null and they can be fetched client-side if needed
                pics[entry.user_email] = null
              }
            } catch (err) {
              pics[entry.user_email] = null
            }
          }
          setProfilePics(pics)
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
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl w-full mx-auto border border-gray-200/50 relative overflow-hidden">
      {/* Magic card border effect */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-r from-tracksuit-purple-500 via-tracksuit-purple-600 to-tracksuit-purple-500 bg-[length:300%_300%] animate-[shine_3s_linear_infinite]"></div>
      </div>
      
      <div className="text-center mb-8 relative z-10">
        <h2 className="text-4xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 via-tracksuit-purple-700 to-tracksuit-purple-600 mb-2">
          Leaderboard
        </h2>
        <div className="h-1 w-24 bg-gradient-to-r from-tracksuit-purple-500 to-tracksuit-purple-600 mx-auto rounded-full"></div>
      </div>

      {userEmail && userScore !== undefined && userRank !== undefined && (
        <div className="mb-8 p-6 bg-gradient-to-r from-tracksuit-purple-50 via-tracksuit-purple-100/50 to-tracksuit-purple-50 rounded-xl border-2 border-tracksuit-purple-300/50 shadow-lg relative z-10">
          <div className="text-center">
            <p className="text-sm uppercase tracking-wider text-tracksuit-purple-700 mb-2 font-semibold font-chapeau">Your Score</p>
            <p className="text-4xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 to-tracksuit-purple-700 mb-2">
              {userScore.toLocaleString()} dawgs
            </p>
            <div className="flex items-center justify-center gap-3 text-sm text-tracksuit-purple-700 font-quicksand">
              <span className="px-3 py-1 bg-tracksuit-purple-200 rounded-full font-semibold">Rank #{userRank}</span>
              <span className="text-tracksuit-purple-400">•</span>
              <span className="truncate max-w-xs">{username ? `@${username}` : userEmail}</span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-tracksuit-purple-600 relative z-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tracksuit-purple-500 mb-3"></div>
          <p className="font-quicksand">Loading leaderboard...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12 relative z-10">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-xl text-tracksuit-purple-600 mb-2 font-chapeau">No scores yet</p>
          <p className="text-sm text-tracksuit-purple-500 font-quicksand">Be the first to claim the top spot!</p>
        </div>
      ) : (
        <div className="space-y-3 relative z-10">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-bold uppercase tracking-wider text-tracksuit-purple-600 border-b-2 border-tracksuit-purple-200 font-chapeau">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-4 text-right">Date</div>
          </div>
          
          {/* Leaderboard entries */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-tracksuit-purple-100/30 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-tracksuit-purple-400/50 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-tracksuit-purple-500/70">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = userEmail && entry.user_email === userEmail
              const isTopThree = entry.rank <= 3
              
              return (
                <div
                  key={`${entry.user_email}-${entry.created_at}`}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 rounded-xl transition-all duration-200 ${
                    isCurrentUser
                      ? "bg-gradient-to-r from-tracksuit-purple-100 via-tracksuit-purple-50 to-tracksuit-purple-100 border-2 border-tracksuit-purple-400/70 shadow-lg scale-[1.02]"
                      : isTopThree
                      ? "bg-gradient-to-r from-tracksuit-green-50/50 via-tracksuit-green-100/30 to-tracksuit-green-50/50 border border-tracksuit-green-300/50 hover:border-tracksuit-green-400/70 hover:shadow-md"
                      : "bg-white/50 border border-tracksuit-purple-100/50 hover:bg-white/80 hover:border-tracksuit-purple-200/70 hover:shadow-sm"
                  }`}
                >
                  {/* Rank */}
                  <div className={`col-span-1 flex items-center justify-center ${
                    entry.rank === 1 ? "text-tracksuit-green-600" : 
                    entry.rank === 2 ? "text-tracksuit-purple-500" : 
                    entry.rank === 3 ? "text-tracksuit-purple-400" : 
                    "text-tracksuit-purple-600"
                  } font-bold text-lg font-chapeau`}>
                    {entry.rank === 1 && "🥇"}
                    {entry.rank === 2 && "🥈"}
                    {entry.rank === 3 && "🥉"}
                    {entry.rank > 3 && `#${entry.rank}`}
                  </div>
                  
                  {/* Player Info with Profile Pic and Username */}
                  <div className={`col-span-5 flex items-center gap-3 ${
                    isCurrentUser ? "text-tracksuit-purple-700 font-semibold" : "text-tracksuit-purple-800"
                  } font-quicksand`}>
                    {/* Profile Picture */}
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-tracksuit-purple-300 flex-shrink-0">
                      {entry.avatar_url ? (
                        <img
                          src={entry.avatar_url}
                          alt={entry.username || entry.user_email}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-tracksuit-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {(entry.username || entry.user_email).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Username and Display Name/Email */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col">
                        {entry.username && (
                          <span className="font-semibold">@{entry.username}</span>
                        )}
                        <span className={`truncate text-sm ${entry.username ? 'text-tracksuit-purple-600' : ''}`}>
                          {entry.display_name || entry.user_email}
                        </span>
                      </div>
                      {isCurrentUser && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-tracksuit-purple-200 text-tracksuit-purple-700 rounded-full font-chapeau">You</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Score */}
                  <div className="col-span-2 text-right flex items-center justify-end">
                    <span className="font-bold text-tracksuit-green-600 text-lg font-chapeau">
                      {entry.score.toLocaleString()}
                    </span>
                    <span className="ml-1 text-xs text-tracksuit-purple-500 font-quicksand">dawgs</span>
                  </div>
                  
                  {/* Date */}
                  <div className="col-span-4 text-right text-sm text-tracksuit-purple-600 flex items-center justify-end font-quicksand">
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

