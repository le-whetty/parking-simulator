// DLC system utilities

import { supabase } from './supabase'

export interface DLCItem {
  id: string
  code: string
  name: string
  description: string | null
  image_url: string | null
  is_active: boolean
}

export interface DLCUnlock {
  id: string
  user_email: string
  dlc_code: string
  unlocked_at: string
  unlocked_via: string
}

/**
 * Check if a user has a specific DLC unlocked
 */
export async function hasDLCUnlocked(userEmail: string, dlcCode: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('dlc_unlocks')
      .select('id')
      .eq('user_email', userEmail)
      .eq('dlc_code', dlcCode)
      .maybeSingle()

    if (error) {
      console.error('Error checking DLC unlock:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error checking DLC unlock:', error)
    return false
  }
}

/**
 * Get all unlocked DLCs for a user
 */
export async function getUserUnlockedDLCs(userEmail: string): Promise<DLCUnlock[]> {
  try {
    const { data, error } = await supabase
      .from('dlc_unlocks')
      .select('*')
      .eq('user_email', userEmail)
      .order('unlocked_at', { ascending: false })

    if (error) {
      console.error('Error fetching user DLC unlocks:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching user DLC unlocks:', error)
    return []
  }
}

/**
 * Get all available DLC items
 */
export async function getAvailableDLCItems(): Promise<DLCItem[]> {
  try {
    // Ensure we have a session for RLS
    const { data: { session } } = await supabase.auth.getSession()
    
    const { data, error } = await supabase
      .from('dlc_items')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true })

    if (error) {
      console.error('Error fetching DLC items:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return []
    }

    console.log(`✅ Loaded ${data?.length || 0} DLC items`)
    return data || []
  } catch (error) {
    console.error('Error fetching DLC items:', error)
    return []
  }
}

/**
 * Get DLC items with unlock status for a user
 */
export async function getDLCItemsWithStatus(userEmail: string): Promise<(DLCItem & { unlocked: boolean; unlocked_at?: string })[]> {
  try {
    const [items, unlocks] = await Promise.all([
      getAvailableDLCItems(),
      getUserUnlockedDLCs(userEmail)
    ])

    const unlockMap = new Map(unlocks.map(u => [u.dlc_code, u]))

    return items.map(item => ({
      ...item,
      unlocked: unlockMap.has(item.code),
      unlocked_at: unlockMap.get(item.code)?.unlocked_at
    }))
  } catch (error) {
    console.error('Error fetching DLC items with status:', error)
    return []
  }
}

// DLC Code Constants
export const DLC_CODES = {
  VEHICLES: 'DLC_VEHICLES',
  ACCESSORIES: 'DLC_ACCESSORIES',
  AUDIO: 'DLC_AUDIO',
  BOOSTS: 'DLC_BOOSTS',
  BOSS_BATTLE: 'DLC_BOSS_BATTLE',
} as const

