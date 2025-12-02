import { NextRequest, NextResponse } from "next/server"
import { createAuthenticatedClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { userEmail, score, accessToken, vehicle, sessionId, gameDurationMs } = body

    if (!userEmail || score === undefined) {
      return NextResponse.json(
        { error: "userEmail and score are required" },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
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

    // Security: Validate game session if provided
    if (sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_email', userEmail)
        .single()

      if (sessionError || !session) {
        console.error('Invalid or missing game session:', sessionError)
        return NextResponse.json(
          { error: "Invalid game session" },
          { status: 403 }
        )
      }

      // Check if session was already used
      if (session.score_saved) {
        console.error('Session already used for score submission')
        return NextResponse.json(
          { error: "Session already used" },
          { status: 403 }
        )
      }

      // Validate game duration (must be at least 10 seconds, max 150 seconds)
      if (gameDurationMs) {
        if (gameDurationMs < 10000 || gameDurationMs > 150000) {
          console.error('Invalid game duration:', gameDurationMs)
          return NextResponse.json(
            { error: "Invalid game duration" },
            { status: 400 }
          )
        }
      }

      // Note: We trust the client-submitted score. The server-side recalculation
      // cannot accurately replicate the client's off-screen time tracking and
      // other game state, so we rely on session validation (duplicate prevention)
      // and score bounds checking instead.
    }

    // Security: Validate score bounds
    // Theoretical maximum with combos:
    // - Base hits: ~50 hits × 50 = 2500
    // - Multiple combo bonuses: 6 × (150 + 300 + 500) = 5700
    // - Time bonus: 120
    // - Before multiplier: 2500 + 5700 + 120 = 8320
    // - With 1.25x multiplier: 8320 × 1.25 = 10400
    // Set to 12000 to allow for exceptional gameplay
    const MAX_THEORETICAL_SCORE = 12000
    const MIN_VALID_SCORE = 0

    if (score > MAX_THEORETICAL_SCORE) {
      console.error(`Suspicious score: ${score} exceeds theoretical maximum`)
      return NextResponse.json(
        { error: "Score exceeds maximum possible value" },
        { status: 400 }
      )
    }

    if (score < MIN_VALID_SCORE) {
      return NextResponse.json(
        { error: "Invalid score" },
        { status: 400 }
      )
    }

    // Get the user's username
    let username: string | null = null
    const { data: usernameData } = await supabase
      .from('usernames')
      .select('username')
      .eq('user_email', userEmail)
      .single()
    
    if (usernameData?.username) {
      username = usernameData.username
    }

    // Save the score using the authenticated client
    const { data: savedScore, error: insertError } = await supabase
      .from('scores')
      .insert([
        {
          user_email: userEmail,
          score: score,
          username: username,
          vehicle: vehicle || null, // Include vehicle type if provided
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Error saving score:', insertError)
      return NextResponse.json(
        { error: "Failed to save score", details: insertError.message },
        { status: 500 }
      )
    }

    // Mark session as used if provided
    if (sessionId) {
      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_ms: gameDurationMs || null,
          final_score: score,
          score_saved: true,
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('Error updating game session:', updateError)
        // Don't fail the request, just log the error
      }
    }

    // Get the user's all-time rank (count scores higher than this one)
    const { count: allTimeCount, error: allTimeCountError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .gt('score', score)

    if (allTimeCountError) {
      console.error('Error fetching all-time rank:', allTimeCountError)
    }

    const allTimeRank = (allTimeCount || 0) + 1

    // Get the user's contest rank (count users with personal best scores higher than this one)
    // First, get all users' personal best scores
    const { data: allScores, error: allScoresError } = await supabase
      .from('scores')
      .select('user_email, score')
      .order('score', { ascending: false })
      .limit(10000) // Get enough records to find all unique users
    
    if (allScoresError) {
      console.error('Error fetching all scores for contest rank:', allScoresError)
    }

    // Group by user_email and get max score for each user
    const userBestScores: Record<string, number> = {}
    allScores?.forEach((entry) => {
      const email = entry.user_email
      if (!userBestScores[email] || entry.score > userBestScores[email]) {
        userBestScores[email] = entry.score
      }
    })

    // Count how many users have a personal best higher than this score
    const contestRank = Object.values(userBestScores).filter(bestScore => bestScore > score).length + 1

    return NextResponse.json({
      success: true,
      rank: allTimeRank, // Keep 'rank' for backward compatibility (all-time rank)
      contestRank,
      allTimeRank,
      score: savedScore,
    })
  } catch (error) {
    console.error("Error in save-score API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

