import { NextRequest, NextResponse } from "next/server"
import { createAuthenticatedClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, score, accessToken, vehicle } = body

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

