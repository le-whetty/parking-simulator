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
    const { session_id, event_type, event_data, timestamp_ms } = body

    if (!session_id || !event_type) {
      return NextResponse.json(
        { error: "session_id and event_type are required" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Insert event
    const { error } = await supabase
      .from('game_events')
      .insert({
        session_id,
        event_type,
        event_data: event_data || {},
        timestamp_ms: timestamp_ms || Date.now(),
      })

    if (error) {
      console.error("Error logging game event:", error)
      return NextResponse.json(
        { error: "Failed to log event" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in log-game-event:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

