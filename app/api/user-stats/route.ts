import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const userEmail = searchParams.get('user_email')

    if (!userEmail) {
      return NextResponse.json(
        { error: "user_email parameter is required" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Get user's username info
    const { data: usernameData } = await supabase
      .from('usernames')
      .select('username, avatar_url, display_name, created_at')
      .eq('user_email', userEmail)
      .maybeSingle()

    // Get game sessions count (metric 1: games played)
    const { count: gamesPlayed } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', userEmail)

    // Get times late for work (metric 2: score_saved = false)
    const { count: timesLate } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', userEmail)
      .eq('score_saved', false)

    // Get cars parked (metric 3: score_saved = true)
    const { count: carsParked } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', userEmail)
      .eq('score_saved', true)

    // Get scores for stats
    const { data: scores } = await supabase
      .from('scores')
      .select('score, created_at')
      .eq('user_email', userEmail)
      .order('score', { ascending: false })

    // Get game events for detailed stats
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('id, final_score, score_saved, started_at, ended_at')
      .eq('user_email', userEmail)
      .order('started_at', { ascending: false })

    const sessionIds = sessions?.map(s => s.id) || []

    // Get all game events for this user
    let allEvents: any[] = []
    if (sessionIds.length > 0) {
      const { data: events } = await supabase
        .from('game_events')
        .select('*')
        .in('session_id', sessionIds)
        .order('timestamp_ms', { ascending: true })

      allEvents = events || []
    }

    // Calculate stats
    const victories = sessions?.filter(s => s.score_saved && s.final_score !== null) || []
    const victoryCount = victories.length
    const victoryPercent = gamesPlayed ? Math.round((victoryCount / gamesPlayed) * 100) : 0

    // Count combos (metric 4: event_type = 'combo')
    const comboEvents = allEvents.filter(e => e.event_type === 'combo')
    const combos = comboEvents.length

    // Count direct dog hits (metric 6: event_type = 'hit')
    const hitEvents = allEvents.filter(e => e.event_type === 'hit')
    const directDogHits = hitEvents.length

    // Count hotdogs fired (for accuracy calculation)
    // Only count events after a certain date when we started tracking this
    const hotdogFiredEvents = allEvents.filter(e => e.event_type === 'hotdog_fired')
    const hotdogsFired = hotdogFiredEvents.length

    // Calculate accuracy % (metric: direct hits / hotdogs fired)
    // Only calculate if we have hotdog_fired events (after tracking started)
    const accuracyPercent = hotdogsFired > 0 
      ? Math.round((directDogHits / hotdogsFired) * 100) 
      : null

    // Most damaged driver (metric 7: event_type = 'hit', grouped by driver_name)
    const driverHits: Record<string, number> = {}
    hitEvents.forEach(event => {
      const driverName = event.event_data?.driver_name || event.event_data?.driverName || 'Unknown'
      driverHits[driverName] = (driverHits[driverName] || 0) + 1
    })
    const mostDamagedDriver = Object.entries(driverHits)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'

    // Top score - use max from scores table, or fallback to max from game_sessions
    const topScoreFromScores = scores?.[0]?.score || 0
    const topScoreFromSessions = sessions?.reduce((max, s) => Math.max(max, s.final_score || 0), 0) || 0
    const topScore = Math.max(topScoreFromScores, topScoreFromSessions)

    // Get or update user title based on top score
    const { data: titleData } = await supabase
      .rpc('update_user_title_from_points', {
        user_email_param: userEmail,
        new_total_points: topScore,
      })

    const userTitle = titleData && titleData.length > 0 ? titleData[0] : null

    // Get rankings
    // Contest rank (personal best)
    const { data: allScores } = await supabase
      .from('scores')
      .select('user_email, score')
      .order('score', { ascending: false })
      .limit(10000)

    const userBestScores: Record<string, number> = {}
    allScores?.forEach((entry) => {
      const email = entry.user_email
      if (!userBestScores[email] || entry.score > userBestScores[email]) {
        userBestScores[email] = entry.score
      }
    })

    const userBestScore = Math.max(...(scores?.map(s => s.score) || [0]))
    const contestRank = Object.values(userBestScores).filter(score => score > userBestScore).length + 1

    // All-time rank
    const { count: allTimeCount } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .gt('score', userBestScore)

    const allTimeRank = (allTimeCount || 0) + 1

    // Date joined (from username creation)
    const dateJoined = usernameData?.created_at || null

    // Get user achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select(`
        achievement_code,
        unlocked_at,
        achievements (
          code,
          name,
          description,
          image_url,
          category
        )
      `)
      .eq('user_email', userEmail)
      .order('unlocked_at', { ascending: false })

    const achievements = (userAchievements || []).map((ua: any) => ({
      code: ua.achievement_code,
      name: ua.achievements?.name || '',
      description: ua.achievements?.description || '',
      image_url: ua.achievements?.image_url || null,
      category: ua.achievements?.category || 'general',
      unlocked_at: ua.unlocked_at,
    }))

    // Always return data, even if minimal
    return NextResponse.json({
      user_email: userEmail,
      username: usernameData?.username || null,
      avatar_url: usernameData?.avatar_url || null,
      display_name: usernameData?.display_name || null,
      date_joined: dateJoined,
      stats: {
        games_played: gamesPlayed || 0,
        victories: victoryCount,
        victory_percent: victoryPercent,
        times_late_for_work: timesLate || 0,
        cars_parked: carsParked || 0,
        combos: combos,
        direct_dog_hits: directDogHits,
        accuracy_percent: accuracyPercent,
        most_damaged_driver: mostDamagedDriver || 'None',
        contest_rank: contestRank || 999999,
        all_time_rank: allTimeRank || 999999,
        top_score: topScore,
      },
      achievements: achievements || [],
      title: userTitle ? {
        current_title: userTitle.current_title,
        title_level: userTitle.title_level,
        total_points: userTitle.total_points,
        points_to_next_level: userTitle.points_to_next_level || 0,
      } : {
        current_title: 'Parking Manager',
        title_level: 1,
        total_points: 0,
        points_to_next_level: 0,
      }
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    // Return minimal data even on error so profile page can display
    return NextResponse.json({
      user_email: userEmail,
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
  }
}

