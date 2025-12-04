// Title progression system utilities

import { supabase } from './supabase'

export interface UserTitle {
  user_email: string
  current_title: string
  title_level: number
  progression_points: number
  total_points: number
  points_to_next_level?: number
}

export const TITLE_LEVELS = {
  1: 'Parking Manager',
  2: 'Intermediate Parking Manager',
  3: 'Senior Parking Manager',
  4: 'Parking Lead',
  5: 'Head of Parking',
  6: 'VP Parking',
  7: 'Chief Parking Officer',
} as const

export type TitleLevel = keyof typeof TITLE_LEVELS

/**
 * Get user's current title
 */
export async function getUserTitle(userEmail: string): Promise<UserTitle | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_or_create_user_title', { user_email_param: userEmail })

    if (error) {
      console.error('Error fetching user title:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0] as UserTitle
  } catch (error) {
    console.error('Error fetching user title:', error)
    return null
  }
}

/**
 * Update user title based on their total points (best score)
 */
export async function updateUserTitle(userEmail: string, totalPoints: number): Promise<UserTitle | null> {
  try {
    const { data, error } = await supabase
      .rpc('update_user_title_from_points', {
        user_email_param: userEmail,
        new_total_points: totalPoints,
      })

    if (error) {
      console.error('Error updating user title:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0] as UserTitle
  } catch (error) {
    console.error('Error updating user title:', error)
    return null
  }
}

/**
 * Get title display name with level
 */
export function getTitleDisplay(title: string, level: number): string {
  return `${title} (L${level})`
}

