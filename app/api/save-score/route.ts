import { NextRequest, NextResponse } from "next/server"
import { createAuthenticatedClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, score, accessToken } = body

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

    // Get the user's rank (count scores higher than this one)
    const { count, error: countError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .gt('score', score)

    if (countError) {
      console.error('Error fetching user rank:', countError)
    }

    const rank = (count || 0) + 1

    return NextResponse.json({
      success: true,
      rank,
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

