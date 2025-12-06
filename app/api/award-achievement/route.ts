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
    const { userEmail, achievementCode, gameSessionId } = body

    if (!userEmail || !achievementCode) {
      return NextResponse.json(
        { error: "userEmail and achievementCode are required" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Check if already unlocked
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_email', userEmail)
      .eq('achievement_code', achievementCode)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: false,
        message: "Achievement already unlocked",
        alreadyUnlocked: true
      })
    }

    // Insert achievement unlock
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_email: userEmail,
        achievement_code: achievementCode,
        game_session_id: gameSessionId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error awarding achievement:', error)
      return NextResponse.json(
        { error: "Failed to award achievement", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      achievement: data
    })
  } catch (error) {
    console.error("Error in award-achievement API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

