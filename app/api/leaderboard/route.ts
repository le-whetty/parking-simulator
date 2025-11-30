import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
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
    
    // Create a server-side Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    
    // Fetch top 10 scores with usernames
    const { data: scoresData, error: scoresError } = await supabase
      .from('scores')
      .select('user_email, score, created_at, username')
      .order('score', { ascending: false })
      .limit(10)

    if (scoresError) {
      console.error("Error fetching leaderboard:", scoresError)
      return NextResponse.json(
        { error: "Failed to fetch leaderboard", details: scoresError.message },
        { status: 500 }
      )
    }

    // Fetch profile pictures from usernames table
    const userEmails = (scoresData || []).map(entry => entry.user_email)
    const { data: usernamesData } = await supabase
      .from('usernames')
      .select('user_email, avatar_url')
      .in('user_email', userEmails)

    // Create a map of email to avatar_url
    const avatarMap: Record<string, string | null> = {}
    if (usernamesData) {
      usernamesData.forEach((item) => {
        avatarMap[item.user_email] = item.avatar_url || null
      })
    }

    console.log("Leaderboard query result:", { dataCount: scoresData?.length || 0, scoresData })

    // Map to leaderboard entries with rank and avatar_url
    const leaderboard = (scoresData || []).map((entry, index) => ({
      rank: index + 1,
      user_email: entry.user_email,
      username: entry.username || null,
      avatar_url: avatarMap[entry.user_email] || null,
      score: entry.score,
      created_at: entry.created_at,
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

