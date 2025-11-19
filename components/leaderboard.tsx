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
          setLeaderboard(data)
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
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4">
      <h2 className="text-3xl font-bold text-center mb-6 text-green-500">Leaderboard</h2>

      {userEmail && userScore !== undefined && userRank !== undefined && (
        <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border-2 border-blue-500">
          <div className="text-center">
            <p className="text-lg text-blue-300 mb-2">Your Score</p>
            <p className="text-3xl font-bold text-blue-400">
              {userScore.toLocaleString()} dawgs
            </p>
            <p className="text-sm text-blue-300 mt-2">
              Rank: #{userRank} • {userEmail}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading leaderboard...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No scores yet. Be the first!</div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-gray-400 border-b border-gray-700">
            <div className="col-span-1">Rank</div>
            <div className="col-span-6">Player</div>
            <div className="col-span-3 text-right">Score</div>
            <div className="col-span-2 text-right">Date</div>
          </div>
          {leaderboard.map((entry) => {
            const isCurrentUser = userEmail && entry.user_email === userEmail
            return (
              <div
                key={`${entry.user_email}-${entry.created_at}`}
                className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg ${
                  isCurrentUser
                    ? "bg-blue-900/30 border-2 border-blue-500"
                    : "bg-gray-700/50 hover:bg-gray-700/70"
                } transition-colors`}
              >
                <div className="col-span-1 font-bold text-yellow-400">
                  #{entry.rank}
                </div>
                <div className={`col-span-6 ${isCurrentUser ? "text-blue-300" : "text-gray-300"}`}>
                  {entry.user_email}
                </div>
                <div className="col-span-3 text-right font-semibold text-green-400">
                  {entry.score.toLocaleString()} dawgs
                </div>
                <div className="col-span-2 text-right text-sm text-gray-400">
                  {formatDate(entry.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

