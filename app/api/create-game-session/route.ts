import { NextRequest, NextResponse } from "next/server"
import { createAuthenticatedClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, accessToken, vehicle } = body

    if (!userEmail || !accessToken) {
      return NextResponse.json(
        { error: "userEmail and accessToken are required" },
        { status: 400 }
      )
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedClient(accessToken)

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.email !== userEmail) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Create game session
    // First, verify we can access the user
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
    if (userError || !authUser) {
      console.error('Error getting user for session creation:', userError)
      return NextResponse.json(
        { error: "Failed to authenticate user", details: userError?.message },
        { status: 401 }
      )
    }
    
    console.log('Creating session for user:', authUser.id, authUser.email)
    
    const { data: session, error: insertError } = await supabase
      .from('game_sessions')
      .insert([
        {
          user_email: userEmail,
          vehicle_type: vehicle || null,
          started_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating game session:', insertError)
      console.error('Insert error details:', JSON.stringify(insertError, null, 2))
      console.error('User ID:', authUser.id)
      console.error('User email:', authUser.email)
      return NextResponse.json(
        { error: "Failed to create game session", details: insertError.message, code: insertError.code },
        { status: 500 }
      )
    }
    
    console.log('Successfully created game session:', session.id)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
    })
  } catch (error) {
    console.error("Error in create-game-session API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

