"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"

interface Achievement {
  code: string
  name: string
  description: string
  image_url: string | null
  category: string
  unlocked_at: string
}

interface UserStats {
  user_email: string
  username: string | null
  avatar_url: string | null
  display_name: string | null
  date_joined: string | null
  stats: {
    games_played: number
    victories: number
    victory_percent: number
    drivers_defeated: number
    most_defeated_driver: string
    contest_rank: number
    all_time_rank: number
    top_score: number
    hotdogs_thrown: number
  }
  achievements?: Achievement[]
}

interface ProfilePageProps {
  onBack: () => void
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          setUserEmail(session.user.email)
          
          // Fetch user stats
          const response = await fetch(`/api/user-stats?user_email=${encodeURIComponent(session.user.email)}`)
          if (response.ok) {
            const data = await response.json()
            setStats(data)
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error("Error loading profile:", response.status, errorData)
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tracksuit-purple-500 mb-3"></div>
          <p className="font-quicksand text-tracksuit-purple-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Card className="p-8 max-w-2xl w-full">
          <h2 className="text-2xl font-bold font-chapeau text-tracksuit-purple-800 mb-4">Profile Not Found</h2>
          <p className="text-tracksuit-purple-600 font-quicksand mb-6">Unable to load your profile.</p>
          <Button onClick={onBack} className="font-chapeau">Back</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-6 max-w-6xl mx-auto pt-24">
      {/* Header */}
      <div className="w-full mb-8">
        <Button onClick={onBack} variant="outline" className="mb-4 font-chapeau">
          ← Back
        </Button>
        <h1 className="text-4xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 to-tracksuit-purple-700 mb-2">
          Player Profile
        </h1>
      </div>

      {/* Profile Header Card */}
      <Card className="w-full mb-6 p-6 bg-gradient-to-r from-tracksuit-purple-50 via-tracksuit-purple-100/50 to-tracksuit-purple-50 border-2 border-tracksuit-purple-300/50">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-tracksuit-purple-400 shadow-lg flex-shrink-0">
            {stats.avatar_url ? (
              <img
                src={stats.avatar_url}
                alt={stats.username || stats.user_email}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-tracksuit-purple-500 flex items-center justify-center text-white text-3xl font-bold font-chapeau">
                {(stats.username || stats.user_email).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold font-chapeau text-tracksuit-purple-800 mb-1">
              {stats.display_name || `@${stats.username}` || stats.user_email}
            </h2>
            {stats.username && (
              <p className="text-lg text-tracksuit-purple-600 font-quicksand mb-2">
                @{stats.username}
              </p>
            )}
            <p className="text-sm text-tracksuit-purple-500 font-quicksand">
              Joined {formatDate(stats.date_joined)}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 gap-6 w-full mb-6">
        {/* Games Played */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            Games Played
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-purple-800">
            {stats.stats.games_played}
          </p>
        </Card>

        {/* Victory % */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            Victory Rate
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-green-600">
            {stats.stats.victory_percent}%
          </p>
          <p className="text-sm text-tracksuit-purple-500 font-quicksand mt-1">
            {stats.stats.victories} victories
          </p>
        </Card>

        {/* Top Score */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            Top Score
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-green-600">
            {stats.stats.top_score.toLocaleString()}
          </p>
          <p className="text-sm text-tracksuit-purple-500 font-quicksand mt-1">dawgs 🌭</p>
        </Card>

        {/* Drivers Defeated */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            Drivers Defeated
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-purple-800">
            {stats.stats.drivers_defeated}
          </p>
          <p className="text-sm text-tracksuit-purple-500 font-quicksand mt-1">
            Most defeated: {stats.stats.most_defeated_driver}
          </p>
        </Card>

        {/* Contest Rank */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            Contest Rank
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-purple-800">
            #{stats.stats.contest_rank}
          </p>
          <p className="text-sm text-tracksuit-purple-500 font-quicksand mt-1">
            I'm Parkin' Here!
          </p>
        </Card>

        {/* All-Time Rank */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            All-Time Rank
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-purple-800">
            #{stats.stats.all_time_rank}
          </p>
          <p className="text-sm text-tracksuit-purple-500 font-quicksand mt-1">
            All-Time High Scores
          </p>
        </Card>
      </div>

      {/* Hotdogs Thrown */}
      <Card className="w-full mb-6 p-6">
        <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
          Hotdogs Thrown
        </h3>
        <p className="text-4xl font-bold font-chapeau text-tracksuit-purple-800">
          {stats.stats.hotdogs_thrown.toLocaleString()}
        </p>
      </Card>

      {/* Progression Section */}
      <Card className="w-full p-6 mb-6">
        <h3 className="text-xl font-bold font-chapeau text-tracksuit-purple-800 mb-4">
          Progression
        </h3>
        <div className="flex items-center gap-4 mb-6">
          <img 
            src="/images/parking-permit.png" 
            alt="Parking Permit" 
            className="w-16 h-16 object-contain"
          />
          <div>
            <p className="font-semibold font-chapeau text-tracksuit-purple-700">Parking Permit</p>
            <p className="text-sm text-tracksuit-purple-500 font-quicksand">Your progression badge</p>
          </div>
        </div>

        {/* Achievements */}
        <div className="mt-6">
          <h4 className="text-lg font-bold font-chapeau text-tracksuit-purple-800 mb-4">
            Achievements ({stats.achievements?.length || 0})
          </h4>
          {stats.achievements && stats.achievements.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.achievements.map((achievement) => (
                <div
                  key={achievement.code}
                  className="p-4 bg-gradient-to-r from-tracksuit-green-50 via-tracksuit-green-100/50 to-tracksuit-green-50 border-2 border-tracksuit-green-300/50 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    {achievement.image_url ? (
                      <img
                        src={achievement.image_url}
                        alt={achievement.name}
                        className="w-12 h-12 object-contain flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-tracksuit-green-500 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                        ✓
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold font-chapeau text-tracksuit-purple-800 mb-1">
                        {achievement.name}
                      </h5>
                      <p className="text-xs text-tracksuit-purple-600 font-quicksand mb-2">
                        {achievement.description}
                      </p>
                      <p className="text-xs text-tracksuit-purple-500 font-quicksand">
                        Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-tracksuit-purple-500 font-quicksand italic">
              No achievements unlocked yet. Keep playing to earn badges!
            </p>
          )}
        </div>

        {/* Titles - Placeholder */}
        <div className="mt-6">
          <h4 className="text-lg font-bold font-chapeau text-tracksuit-purple-800 mb-4">
            Title
          </h4>
          <p className="text-sm text-tracksuit-purple-500 font-quicksand italic">
            Title progression system coming soon!
          </p>
        </div>
      </Card>
    </div>
  )
}

