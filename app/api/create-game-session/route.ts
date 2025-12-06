import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { user_email, user_id, game_mode } = body

    if (!user_email) {
      return NextResponse.json(
        { error: "user_email is required" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Insert session with game_mode
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        user_email,
        user_id: user_id || null,
        started_at: new Date().toISOString(),
        game_mode: game_mode || "I'm Parkin' Here!",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating game session:", error)
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      )
    }

    return NextResponse.json({ session_id: data.id })
  } catch (error) {
    console.error("Error in create-game-session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

