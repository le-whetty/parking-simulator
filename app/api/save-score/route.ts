import { NextRequest, NextResponse } from "next/server"
import { saveScore, getUserRank } from "@/lib/scores"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, score } = body

    if (!userEmail || score === undefined) {
      return NextResponse.json(
        { error: "userEmail and score are required" },
        { status: 400 }
      )
    }

    // Save the score
    const savedScore = await saveScore(userEmail, score)

    if (!savedScore) {
      return NextResponse.json(
        { error: "Failed to save score" },
        { status: 500 }
      )
    }

    // Get the user's rank
    const rank = await getUserRank(userEmail, score)

    return NextResponse.json({
      success: true,
      rank,
      score: savedScore,
    })
  } catch (error) {
    console.error("Error in save-score API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

