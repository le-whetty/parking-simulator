import { supabase } from './supabase'

export interface Score {
  id: string
  user_email: string
  score: number
  created_at: string
}

export interface LeaderboardEntry {
  rank: number
  user_email: string
  username?: string | null
  avatar_url?: string | null
  display_name?: string | null
  score: number
  created_at: string
}

/**
 * Save a score to the database
 */
export async function saveScore(userEmail: string, score: number): Promise<Score | null> {
  try {
    const { data, error } = await supabase
      .from('scores')
      .insert([
        {
          user_email: userEmail,
          score: score,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error saving score:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error saving score:', error)
    return null
  }
}

/**
 * Get the top N scores for the leaderboard
 */
export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('user_email, score, created_at')
      .order('score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return []
    }

    return data.map((entry, index) => ({
      rank: index + 1,
      user_email: entry.user_email,
      score: entry.score,
      created_at: entry.created_at,
    }))
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }
}

/**
 * Get a user's rank for a given score
 */
export async function getUserRank(userEmail: string, score: number): Promise<number> {
  try {
    // Count how many scores are higher than this score
    const { count, error } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .gt('score', score)

    if (error) {
      console.error('Error fetching user rank:', error)
      return 0
    }

    // Rank is count of higher scores + 1
    return (count || 0) + 1
  } catch (error) {
    console.error('Error fetching user rank:', error)
    return 0
  }
}

/**
 * Get a user's best score
 */
export async function getUserBestScore(userEmail: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('score')
      .eq('user_email', userEmail)
      .order('score', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching user best score:', error)
      return null
    }

    return data?.score || null
  } catch (error) {
    console.error('Error fetching user best score:', error)
    return null
  }
}

