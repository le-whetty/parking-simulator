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

    console.log("Leaderboard query result:", { dataCount: data?.length || 0, data })

    // Map to leaderboard entries with rank
    const leaderboard = (data || []).map((entry, index) => ({
      rank: index + 1,
      user_email: entry.user_email,
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

