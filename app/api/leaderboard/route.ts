import { NextResponse } from "next/server"
import { getLeaderboard } from "@/lib/scores"

export async function GET() {
  try {
    const leaderboard = await getLeaderboard(10)
    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error("Error in leaderboard API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

