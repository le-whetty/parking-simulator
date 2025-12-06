import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Detect session from URL hash/query params
  },
})

/**
 * Create an authenticated Supabase client for server-side use
 * Pass the access token from the client to authenticate the request
 */
export function createAuthenticatedClient(accessToken: string) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  
  // Set the session explicitly so RLS policies can access auth.uid()
  // This is needed for RLS to work correctly with server-side authenticated clients
  client.auth.setSession({
    access_token: accessToken,
    refresh_token: '', // Not needed for server-side
  } as any).catch(() => {
    // Ignore errors - the Authorization header should be enough
  })
  
  return client
}

