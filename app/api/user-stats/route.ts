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

    // Get all game sessions for this user
    const { data: allSessions, error: sessionsQueryError } = await supabase
      .from('game_sessions')
      .select('id, final_score, score_saved, started_at, ended_at')
      .eq('user_email', userEmail)
      .order('started_at', { ascending: false })
    
    console.log(`📊 [USER_STATS] allSessions query - count: ${allSessions?.length || 0}, error:`, sessionsQueryError)
    
    // Calculate stats from sessions
    const gamesPlayed = allSessions?.length || 0
    const timesLate = allSessions?.filter(s => s.score_saved === false).length || 0
    const carsParked = allSessions?.filter(s => s.score_saved === true).length || 0
    
    console.log(`📊 [USER_STATS] Calculated stats - gamesPlayed: ${gamesPlayed}, timesLate: ${timesLate}, carsParked: ${carsParked}`)

    // Get scores for stats
    const { data: scores } = await supabase
      .from('scores')
      .select('score, created_at')
      .eq('user_email', userEmail)
      .order('score', { ascending: false })

    // Use allSessions we already fetched
    const sessions = allSessions || []
    const sessionIds = sessions.map(s => s.id)
    console.log(`📊 [USER_STATS] Found ${sessions.length} sessions for ${userEmail}`)
    console.log(`📊 [USER_STATS] Session IDs:`, sessionIds)
    if (sessions.length > 0) {
      console.log(`📊 [USER_STATS] Sample session:`, {
        id: sessions[0].id,
        score_saved: sessions[0].score_saved,
        final_score: sessions[0].final_score,
        started_at: sessions[0].started_at,
      })
    }

    // Get all game events for this user
    let allEvents: any[] = []
    if (sessionIds.length > 0) {
      const { data: events, error: eventsError } = await supabase
        .from('game_events')
        .select('*')
        .in('session_id', sessionIds)
        .order('timestamp_ms', { ascending: true })

      allEvents = events || []
      console.log(`📊 [USER_STATS] Found ${allEvents.length} events across ${sessionIds.length} sessions`)
      if (eventsError) {
        console.error(`📊 [USER_STATS] Events query error:`, eventsError)
      }
      if (allEvents.length > 0) {
        const eventTypes = allEvents.reduce((acc, e) => {
          acc[e.event_type] = (acc[e.event_type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        console.log(`📊 [USER_STATS] Event breakdown by type:`, eventTypes)
      }
    } else {
      console.log(`📊 [USER_STATS] ⚠️ No session IDs found - this means no game sessions exist for ${userEmail}`)
      console.log(`📊 [USER_STATS] This could mean:`)
      console.log(`📊 [USER_STATS]   1. Sessions aren't being created (check create-game-session API)`)
      console.log(`📊 [USER_STATS]   2. Sessions are being created with a different user_email`)
      console.log(`📊 [USER_STATS]   3. RLS policies are blocking session reads`)
    }

    // Calculate stats
    const victories = sessions.filter(s => s.score_saved === true && s.final_score !== null && s.final_score !== undefined)
    const victoryCount = victories.length
    const victoryPercent = gamesPlayed > 0 ? Math.round((victoryCount / gamesPlayed) * 100) : 0
    
    console.log(`📊 [USER_STATS] Victory stats - victories: ${victoryCount}, gamesPlayed: ${gamesPlayed}, victoryPercent: ${victoryPercent}`)

    // Count combos (metric 4: event_type = 'combo')
    const comboEvents = allEvents.filter(e => e.event_type === 'combo')
    const combos = comboEvents.length
    console.log(`📊 [USER_STATS] combos - total events: ${allEvents.length}, combo events: ${combos}`)

    // Count direct dog hits (metric 6: event_type = 'hit')
    const hitEvents = allEvents.filter(e => e.event_type === 'hit')
    const directDogHits = hitEvents.length
    console.log(`📊 [USER_STATS] directDogHits - hit events: ${directDogHits}`)

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
    console.log(`📊 [USER_STATS] topScore - from scores: ${topScoreFromScores}, from sessions: ${topScoreFromSessions}, final: ${topScore}`)

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
    const responseData = {
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
    }
    
    console.log(`📊 [USER_STATS] Returning response for ${userEmail}:`, {
      games_played: responseData.stats.games_played,
      victories: responseData.stats.victories,
      cars_parked: responseData.stats.cars_parked,
      times_late_for_work: responseData.stats.times_late_for_work,
      combos: responseData.stats.combos,
      direct_dog_hits: responseData.stats.direct_dog_hits,
      top_score: responseData.stats.top_score,
    })
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching user stats:", error)
    // Return minimal data even on error so profile page can display
    const searchParams = request.nextUrl.searchParams
    const userEmailParam = searchParams.get('user_email') || 'unknown'
    
    return NextResponse.json({
      user_email: userEmailParam,
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

