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
  enabled?: boolean
}

/**
 * Check if a user has a specific DLC unlocked AND enabled
 */
export async function hasDLCUnlocked(userEmail: string, dlcCode: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('dlc_unlocks')
      .select('id, enabled')
      .eq('user_email', userEmail)
      .eq('dlc_code', dlcCode)
      .maybeSingle()

    if (error) {
      console.error('Error checking DLC unlock:', error)
      return false
    }

    // DLC must be unlocked AND enabled
    return !!data && (data.enabled !== false) // Default to true if null
  } catch (error) {
    console.error('Error checking DLC unlock:', error)
    return false
  }
}

/**
 * Enable or disable a DLC item for a user
 */
export async function setDLCEnabled(userEmail: string, dlcCode: string, enabled: boolean): Promise<boolean> {
  try {
    // First check if unlock exists
    const { data: existing } = await supabase
      .from('dlc_unlocks')
      .select('id')
      .eq('user_email', userEmail)
      .eq('dlc_code', dlcCode)
      .maybeSingle()

    if (!existing) {
      console.error('Cannot enable/disable DLC that is not unlocked')
      return false
    }

    // Update enabled status
    const { error } = await supabase
      .from('dlc_unlocks')
      .update({ enabled })
      .eq('user_email', userEmail)
      .eq('dlc_code', dlcCode)

    if (error) {
      console.error('Error updating DLC enabled status:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating DLC enabled status:', error)
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
export async function getDLCItemsWithStatus(userEmail: string): Promise<(DLCItem & { unlocked: boolean; enabled: boolean; unlocked_at?: string })[]> {
  try {
    // Get items (should work even without auth due to RLS policy)
    const items = await getAvailableDLCItems()
    
    // Only check unlocks if we have a user email
    const unlocks = userEmail ? await getUserUnlockedDLCs(userEmail) : []

    const unlockMap = new Map(unlocks.map(u => [u.dlc_code, u]))

    const result = items.map(item => {
      const unlock = unlockMap.get(item.code)
      return {
        ...item,
        unlocked: !!unlock,
        enabled: unlock?.enabled !== false, // Default to true if null
        unlocked_at: unlock?.unlocked_at
      }
    })
    
    console.log(`📦 getDLCItemsWithStatus: ${items.length} items, ${unlocks.length} unlocks for ${userEmail || 'anonymous'}`)
    return result
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

// Individual DLC item IDs (for enable/disable preferences)
export const DLC_ITEM_IDS = {
  FM_RADIO: 'fm-radio',
  CAR_HORN: 'car-horn',
  LICENSE_PLATE: 'license-plate',
  RED_BULL_FRIDGE: 'red-bull-fridge',
  TRUCOAT: 'trucoat',
  COSTCO_CARD: 'costco-card',
  CARAVAN: 'caravan',
  SWIFT: 'swift',
  CONNOR_BOSS: 'connor-boss',
} as const

/**
 * Sync DLC item enabled status from database to localStorage
 * This ensures localStorage is up-to-date when checking item status
 */
export async function syncDLCItemEnabledStatus(userEmail: string, packCode: string): Promise<void> {
  if (typeof window === 'undefined') return
  
  try {
    const unlocks = await getUserUnlockedDLCs(userEmail)
    const unlock = unlocks.find(u => u.dlc_code === packCode)
    if (unlock) {
      // Import DLC_PACKS to get pack item definitions
      const { DLC_PACKS } = await import('./dlc-packs')
      const pack = DLC_PACKS[packCode]
      
      if (pack) {
        // Sync each item's enabled status (defaults to true if not explicitly disabled)
        pack.items.forEach(item => {
          const key = `dlc_item_enabled_${packCode}_${item.id}`
          if (localStorage.getItem(key) === null) {
            // Only set if not already in localStorage (don't overwrite user preference)
            const enabled = unlock.enabled !== false
            localStorage.setItem(key, enabled.toString())
            console.log(`📦 Synced ${packCode}/${item.id} to localStorage: ${enabled}`)
          }
        })
      } else {
        console.warn(`⚠️ No pack definition found for ${packCode}`)
      }
    }
  } catch (error) {
    console.error('Error syncing DLC enabled status:', error)
  }
}

/**
 * Check if an individual DLC item is enabled
 * Checks both pack unlock status and item preference
 */
export function isDLCItemEnabled(packCode: string, itemId: string, packUnlocked: boolean): boolean {
  if (!packUnlocked) return false
  
  // Check localStorage for item preference (defaults to enabled)
  if (typeof window !== 'undefined') {
    const key = `dlc_item_enabled_${packCode}_${itemId}`
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      return stored === 'true'
    }
  }
  
  // Default to enabled if pack is unlocked
  return true
}

/**
 * Set individual DLC item enabled status
 */
export function setDLCItemEnabled(packCode: string, itemId: string, enabled: boolean): void {
  if (typeof window !== 'undefined') {
    const key = `dlc_item_enabled_${packCode}_${itemId}`
    localStorage.setItem(key, enabled.toString())
  }
}

/**
 * Get selected horn preference
 */
export function getSelectedHorn(): 1 | 2 | 3 | 'random' {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('selected_horn')
    if (stored === '1' || stored === '2' || stored === '3' || stored === 'random') {
      return stored as 1 | 2 | 3 | 'random'
    }
  }
  return 1 // Default
}

/**
 * Set selected horn preference
 */
export function setSelectedHorn(horn: 1 | 2 | 3 | 'random'): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selected_horn', horn.toString())
  }
}

