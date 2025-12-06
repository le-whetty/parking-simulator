import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }
    
    // Get query parameters for leaderboard type and game mode
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'contest' // 'contest' or 'all-time'
    const gameMode = searchParams.get('game_mode') || "I'm Parkin' Here!" // Game mode filter
    
    // Create a server-side Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    
    let scoresData: any[] | null = null
    let scoresError: any = null

    if (type === 'contest') {
      // Contest leaderboard: Get each user's personal best (MAX score per user) for the game mode
      // Use a subquery to get MAX(score) grouped by user_email, then order by score DESC
      const { data, error } = await supabase
        .from('scores')
        .select('user_email, score, created_at, username')
        .eq('game_mode', gameMode) // Filter by game mode
        .order('score', { ascending: false })
        .limit(1000) // Get more records to ensure we can find unique users
      
      if (error) {
        scoresError = error
      } else {
        // Group by user_email and take the max score for each user
        const userBestScores: Record<string, { user_email: string; score: number; created_at: string; username: string | null; vehicle: string | null }> = {}
        
        data?.forEach((entry) => {
          const email = entry.user_email
          if (!userBestScores[email] || entry.score > userBestScores[email].score) {
            userBestScores[email] = {
              user_email: email,
              score: entry.score,
              created_at: entry.created_at,
              username: entry.username || null,
              vehicle: entry.vehicle || null,
            }
          }
        })
        
        // Convert to array, sort by score descending, and take top 10
        scoresData = Object.values(userBestScores)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
      }
    } else {
      // All-time leaderboard: Current behavior - top 10 individual runs for the game mode
      const { data, error } = await supabase
        .from('scores')
        .select('user_email, score, created_at, username')
        .eq('game_mode', gameMode) // Filter by game mode
        .order('score', { ascending: false })
        .limit(10)
      
      scoresData = data
      scoresError = error
    }

    if (scoresError) {
      console.error("Error fetching leaderboard:", scoresError)
      return NextResponse.json(
        { error: "Failed to fetch leaderboard", details: scoresError.message },
        { status: 500 }
      )
    }

    // Fetch profile pictures and display names from usernames table
    const userEmails = (scoresData || []).map(entry => entry.user_email)
    const { data: usernamesData } = await supabase
      .from('usernames')
      .select('user_email, avatar_url, display_name')
      .in('user_email', userEmails)

    // Create maps of email to avatar_url and display_name
    const avatarMap: Record<string, string | null> = {}
    const displayNameMap: Record<string, string | null> = {}
    if (usernamesData) {
      usernamesData.forEach((item) => {
        avatarMap[item.user_email] = item.avatar_url || null
        displayNameMap[item.user_email] = item.display_name || null
      })
    }

    console.log("Leaderboard query result:", { type, dataCount: scoresData?.length || 0, scoresData })

    // Map to leaderboard entries with rank, avatar_url, display_name, and vehicle
    const leaderboard = (scoresData || []).map((entry, index) => ({
      rank: index + 1,
      user_email: entry.user_email,
      username: entry.username || null,
      avatar_url: avatarMap[entry.user_email] || null,
      display_name: displayNameMap[entry.user_email] || null,
      score: entry.score,
      created_at: entry.created_at,
      vehicle: entry.vehicle || null,
    }))

    return NextResponse.json(leaderboard, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error("Error in leaderboard API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

