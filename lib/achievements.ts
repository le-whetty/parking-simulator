// Achievements system utilities

import { supabase } from './supabase'

export interface Achievement {
  id: string
  code: string
  name: string
  description: string
  image_url: string | null
  category: string
  is_active: boolean
}

export interface UserAchievement {
  id: string
  user_email: string
  achievement_code: string
  unlocked_at: string
  game_session_id: string | null
}

/**
 * Check if a user has a specific achievement
 */
export async function hasAchievement(userEmail: string, achievementCode: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_email', userEmail)
      .eq('achievement_code', achievementCode)
      .maybeSingle()

    if (error) {
      console.error('Error checking achievement:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error checking achievement:', error)
    return false
  }
}

/**
 * Award an achievement to a user
 */
export async function awardAchievement(
  userEmail: string,
  achievementCode: string,
  gameSessionId?: string
): Promise<boolean> {
  try {
    // Check if already unlocked
    const alreadyUnlocked = await hasAchievement(userEmail, achievementCode)
    if (alreadyUnlocked) {
      return false // Already unlocked
    }

    // Insert achievement unlock
    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_email: userEmail,
        achievement_code: achievementCode,
        game_session_id: gameSessionId || null,
      })

    if (error) {
      console.error('Error awarding achievement:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error awarding achievement:', error)
    return false
  }
}

/**
 * Get all unlocked achievements for a user
 */
export async function getUserAchievements(userEmail: string): Promise<UserAchievement[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_email', userEmail)
      .order('unlocked_at', { ascending: false })

    if (error) {
      console.error('Error fetching user achievements:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching user achievements:', error)
    return []
  }
}

/**
 * Get all achievements with unlock status for a user
 */
export async function getAchievementsWithStatus(userEmail: string) {
  try {
    const [achievements, userAchievements] = await Promise.all([
      supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: true }),
      getUserAchievements(userEmail)
    ])

    const unlockedCodes = new Set(userAchievements.map(ua => ua.achievement_code))

    return {
      achievements: (achievements.data || []).map(ach => ({
        ...ach,
        unlocked: unlockedCodes.has(ach.code),
        unlocked_at: userAchievements.find(ua => ua.achievement_code === ach.code)?.unlocked_at
      }))
    }
  } catch (error) {
    console.error('Error fetching achievements with status:', error)
    return { achievements: [] }
  }
}

// Achievement Code Constants
export const ACHIEVEMENT_CODES = {
  PERFECT_PARKING: 'PERFECT_PARKING',
  COMBO_MASTER: 'COMBO_MASTER',
  HOTDOG_HERO: 'HOTDOG_HERO',
  SPEED_DEMON: 'SPEED_DEMON',
  TANK_COMMANDER: 'TANK_COMMANDER',
  SPARKIE: 'SPARKIE',
  PARKIE: 'PARKIE',
  LEARNER_VEHICLE: 'LEARNER_VEHICLE',
} as const

