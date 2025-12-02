import { NextRequest, NextResponse } from "next/server"
import { createAuthenticatedClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, accessToken, eventType, eventData, timestampMs } = body

    if (!sessionId || !accessToken || !eventType || timestampMs === undefined) {
      return NextResponse.json(
        { error: "sessionId, accessToken, eventType, and timestampMs are required" },
        { status: 400 }
      )
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedClient(accessToken)

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('user_email')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session || session.user_email !== user.email) {
      return NextResponse.json(
        { error: "Session not found or unauthorized" },
        { status: 403 }
      )
    }

    // Log the event
    const { error: insertError } = await supabase
      .from('game_events')
      .insert([
        {
          session_id: sessionId,
          event_type: eventType,
          event_data: eventData || null,
          timestamp_ms: timestampMs,
        },
      ])

    if (insertError) {
      console.error('Error logging game event:', insertError)
      return NextResponse.json(
        { error: "Failed to log game event", details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Error in log-game-event API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

