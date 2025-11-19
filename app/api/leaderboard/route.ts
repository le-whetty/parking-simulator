import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    // Create a server-side Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Fetch top 10 scores
    const { data, error } = await supabase
      .from('scores')
      .select('user_email, score, created_at')
      .order('score', { ascending: false })
      .limit(10)

    if (error) {
      console.error("Error fetching leaderboard:", error)
      return NextResponse.json(
        { error: "Failed to fetch leaderboard", details: error.message },
        { status: 500 }
      )
    }

    // Map to leaderboard entries with rank
    const leaderboard = (data || []).map((entry, index) => ({
      rank: index + 1,
      user_email: entry.user_email,
      score: entry.score,
      created_at: entry.created_at,
    }))

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error("Error in leaderboard API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

