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
    times_late_for_work: number
    cars_parked: number
    combos: number
    direct_dog_hits: number
    accuracy_percent: number | null
    most_damaged_driver: string
    contest_rank: number
    all_time_rank: number
    top_score: number
  }
  achievements?: Achievement[]
  title?: {
    current_title: string
    title_level: number
    total_points: number
    points_to_next_level: number
  } | null
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
        console.log("🔍 ProfilePage: Starting to load profile...")
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("❌ ProfilePage: Session error:", sessionError)
        }
        
        // Log full session structure
        console.log("🔍 ProfilePage: Full session object:", JSON.stringify(session, null, 2))
        console.log("🔍 ProfilePage: Session data:", { 
          hasSession: !!session, 
          hasUser: !!session?.user, 
          email: session?.user?.email,
          userMetadata: session?.user?.user_metadata,
          identities: session?.user?.identities
        })
        
        // Check for email in multiple ways (session might have different structure)
        const email = session?.user?.email || 
                     session?.user?.user_metadata?.email || 
                     session?.user?.identities?.[0]?.identity_data?.email ||
                     null
        
        console.log("🔍 ProfilePage: Extracted email:", email)
        
        // In dev mode, if no email, use a placeholder or show message
        const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === "true"
        if (!email && isDevMode) {
          console.warn("⚠️ ProfilePage: Dev mode - no email found, showing placeholder data")
          setStats({
            user_email: 'dev-mode@example.com',
            username: null,
            avatar_url: null,
            display_name: null,
            date_joined: null,
            stats: {
              games_played: 0,
              victories: 0,
              victory_percent: 0,
              times_late_for_work: 0,
              cars_parked: 0,
              combos: 0,
              direct_dog_hits: 0,
              accuracy_percent: null,
              most_damaged_driver: 'None',
              contest_rank: 999999,
              all_time_rank: 999999,
              top_score: 0,
            },
            achievements: [],
            title: {
              current_title: 'Parking Manager',
              title_level: 1,
              total_points: 0,
              points_to_next_level: 0,
            }
          })
          setLoading(false)
          return
        }
        
        if (email) {
          setUserEmail(email)
          
          // Fetch user stats
          const apiUrl = `/api/user-stats?user_email=${encodeURIComponent(email)}`
          console.log("🔍 ProfilePage: Fetching from:", apiUrl)
          
          const response = await fetch(apiUrl)
          console.log("🔍 ProfilePage: Response status:", response.status, response.statusText)
          
          if (response.ok) {
            const data = await response.json()
            console.log("✅ ProfilePage: Received data:", data)
            setStats(data)
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error("❌ ProfilePage: Error loading profile:", response.status, errorData)
            // Set minimal stats on error
            setStats({
              user_email: email,
              username: null,
              avatar_url: null,
              display_name: null,
              date_joined: null,
              stats: {
                games_played: 0,
                victories: 0,
                victory_percent: 0,
                drivers_defeated: 0,
                most_defeated_driver: 'None',
                contest_rank: 999999,
                all_time_rank: 999999,
                top_score: 0,
                hotdogs_thrown: 0,
              },
              achievements: [],
              title: {
                current_title: 'Parking Manager',
                title_level: 1,
                total_points: 0,
                points_to_next_level: 0,
              }
            })
          }
        } else {
          console.warn("⚠️ ProfilePage: No session or email found")
          setLoading(false)
        }
      } catch (error) {
        console.error("❌ ProfilePage: Error loading profile:", error)
        setLoading(false)
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

        {/* Times Late for Work */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            Times Late for Work
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-purple-800">
            {stats.stats.times_late_for_work}
          </p>
        </Card>

        {/* Cars Parked */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            Cars Parked
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-green-600">
            {stats.stats.cars_parked}
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

      {/* Additional Stats Grid */}
      <div className="grid md:grid-cols-2 gap-6 w-full mb-6">
        {/* Combos */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            Combos
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-purple-800">
            {stats.stats.combos}
          </p>
        </Card>

        {/* Direct Dog Hits */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            Direct Dog Hits
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-purple-800">
            {stats.stats.direct_dog_hits}
          </p>
        </Card>

        {/* Accuracy */}
        {stats.stats.accuracy_percent !== null && (
          <Card className="p-6">
            <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
              Accuracy
            </h3>
            <p className="text-4xl font-bold font-chapeau text-tracksuit-green-600">
              {stats.stats.accuracy_percent}%
            </p>
          </Card>
        )}

        {/* Most Damaged Driver */}
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-wider text-tracksuit-purple-600 mb-2 font-semibold font-chapeau">
            Most Damaged Driver
          </h3>
          <p className="text-4xl font-bold font-chapeau text-tracksuit-purple-800">
            {stats.stats.most_damaged_driver}
          </p>
        </Card>
      </div>

      {/* Progression Section */}
      <Card className="w-full p-6 mb-6">
        <h3 className="text-xl font-bold font-chapeau text-tracksuit-purple-800 mb-4">
          Progression
        </h3>

        {/* Achievements - shown as parking permits */}
        <div className="mt-6">
          <h4 className="text-lg font-bold font-chapeau text-tracksuit-purple-800 mb-4">
            Achievements ({stats.achievements?.length || 0})
          </h4>
          {stats.achievements && stats.achievements.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.achievements.map((achievement) => (
                <div
                  key={achievement.code}
                  className="flex flex-col items-center p-4 bg-gradient-to-r from-tracksuit-purple-50 via-tracksuit-purple-100/50 to-tracksuit-purple-50 border-2 border-tracksuit-purple-300/50 rounded-lg"
                >
                  {/* Parking Permit Image */}
                  <img 
                    src="/images/parking-permit.png" 
                    alt="Parking Permit" 
                    className="w-24 h-24 object-contain mb-3"
                  />
                  {/* Achievement Title */}
                  <h5 className="font-bold font-chapeau text-tracksuit-purple-800 mb-1 text-center">
                    {achievement.name}
                  </h5>
                  {/* Achievement Description */}
                  <p className="text-xs text-tracksuit-purple-600 font-quicksand text-center mb-2">
                    {achievement.description}
                  </p>
                  {/* Unlock Date */}
                  <p className="text-xs text-tracksuit-purple-500 font-quicksand">
                    Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-tracksuit-purple-500 font-quicksand italic">
              No achievements unlocked yet. Keep playing to earn badges!
            </p>
          )}
        </div>

        {/* Title */}
        <div className="mt-6">
          <h4 className="text-lg font-bold font-chapeau text-tracksuit-purple-800 mb-4">
            Title
          </h4>
          {stats.title ? (
            <div className="p-4 bg-gradient-to-r from-tracksuit-purple-50 via-tracksuit-purple-100/50 to-tracksuit-purple-50 border-2 border-tracksuit-purple-300/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-xl font-bold font-chapeau text-tracksuit-purple-800">
                  {stats.title.current_title}
                </h5>
                <span className="px-3 py-1 bg-tracksuit-purple-600 text-white rounded-full text-sm font-semibold font-chapeau">
                  L{stats.title.title_level}
                </span>
              </div>
              
              {/* Level Progression Visualization */}
              <div className="mb-4">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((level) => {
                    const isCurrentLevel = stats.title.title_level === level
                    const isCompleted = stats.title.title_level > level
                    const levelTitles = [
                      'Parking Manager',
                      'Intermediate Parking Manager',
                      'Senior Parking Manager',
                      'Parking Lead',
                      'Head of Parking',
                      'VP Parking',
                      'Chief Parking Officer',
                    ]
                    const levelTitle = levelTitles[level - 1]
                    
                    return (
                      <div key={level} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1 relative group">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-chapeau cursor-help transition-all ${
                              isCurrentLevel
                                ? 'bg-tracksuit-purple-600 text-white ring-2 ring-tracksuit-purple-300 ring-offset-2'
                                : isCompleted
                                ? 'bg-tracksuit-green-500 text-white'
                                : 'bg-gray-300 text-gray-600'
                            }`}
                            title={levelTitle}
                          >
                            {level}
                          </div>
                          {/* Hover tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                            <div className="bg-tracksuit-purple-800 text-white text-xs font-quicksand px-2 py-1 rounded whitespace-nowrap shadow-lg">
                              L{level}: {levelTitle}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1">
                                <div className="border-4 border-transparent border-t-tracksuit-purple-800"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {level < 7 && (
                          <div
                            className={`h-1 flex-1 mx-1 ${
                              isCompleted
                                ? 'bg-tracksuit-green-500'
                                : isCurrentLevel
                                ? 'bg-tracksuit-purple-500'
                                : 'bg-gray-300'
                            }`}
                            style={{ minWidth: '8px' }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1 text-xs text-tracksuit-purple-600 font-quicksand">
                  <span>L1: Parking Manager</span>
                  <span>L7: Chief Parking Officer</span>
                </div>
              </div>

              {stats.title.points_to_next_level > 0 ? (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-tracksuit-purple-600 font-quicksand">
                      Progress to next level
                    </span>
                    <span className="text-xs text-tracksuit-purple-600 font-quicksand font-semibold">
                      {stats.title.points_to_next_level.toLocaleString()} points needed
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-tracksuit-purple-500 to-tracksuit-purple-600 transition-all"
                      style={{
                        width: `${Math.min(100, ((stats.title.total_points / (stats.title.total_points + stats.title.points_to_next_level)) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-tracksuit-purple-500 font-quicksand mt-1">
                    {stats.title.total_points.toLocaleString()} / {(stats.title.total_points + stats.title.points_to_next_level).toLocaleString()} points
                  </p>
                </div>
              ) : stats.title.title_level === 7 ? (
                <p className="text-sm text-tracksuit-green-600 font-quicksand font-semibold mt-2">
                  🏆 Maximum level achieved!
                </p>
              ) : null}
            </div>
          ) : (
            <div className="p-4 bg-tracksuit-purple-50 border-2 border-tracksuit-purple-200/50 rounded-lg">
              <p className="text-sm text-tracksuit-purple-600 font-quicksand">
                Play games to earn your first title!
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

