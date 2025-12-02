/**
 * Get Test Credentials Script
 * 
 * Run this in your browser console while logged into the game to extract:
 * - Access Token (from Supabase session)
 * - Session ID (from a completed game session)
 * - User Email
 * 
 * Usage:
 * 1. Open the game in your browser
 * 2. Open DevTools Console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: await getTestCredentials()
 */

async function getTestCredentials() {
  console.log('🔍 Extracting test credentials...\n')
  
  try {
    let accessToken = null
    let userEmail = null
    let sessionId = null
    
    // Method 1: Try to get from localStorage (Supabase stores session there)
    try {
      // Supabase stores session in localStorage with a key pattern like:
      // "sb-<project-ref>-auth-token" or similar
      const supabaseKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || (key.includes('sb-') && key.includes('auth'))
      )
      
      for (const key of supabaseKeys) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            const data = JSON.parse(value)
            // Check for access_token in various possible structures
            if (data.access_token) {
              accessToken = data.access_token
              userEmail = data.user?.email || data.user_email
              console.log(`✅ Found session in localStorage (key: ${key})`)
              break
            } else if (data.currentSession?.access_token) {
              accessToken = data.currentSession.access_token
              userEmail = data.currentSession.user?.email
              console.log(`✅ Found session in localStorage (key: ${key})`)
              break
            }
          }
        } catch (e) {
          // Skip invalid JSON
          continue
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e)
    }
    
    // Method 2: Try to get from Supabase client if available globally
    if (!accessToken && typeof window !== 'undefined') {
      try {
        // Try common ways Supabase might be exposed
        const supabaseClient = window.supabase || window.__SUPABASE__ || 
          (window.__NEXT_DATA__?.props?.pageProps?.supabase)
        
        if (supabaseClient && supabaseClient.auth) {
          const { data: { session }, error } = await supabaseClient.auth.getSession()
          if (session && !error) {
            accessToken = session.access_token
            userEmail = session.user.email
            console.log('✅ Found Supabase session via client')
          }
        }
      } catch (e) {
        console.warn('Could not get session from Supabase client:', e)
      }
    }
    
    // Method 3: Try to get from Network tab (if user just played a game)
    // Check if there's a recent API call we can inspect
    console.log('\n📋 To get Session ID:')
    console.log('   1. Play a game (or check if you just played one)')
    console.log('   2. Open Network tab in DevTools')
    console.log('   3. Look for "/api/create-game-session" request')
    console.log('   4. Check the Response tab - it will have "sessionId"')
    console.log('   OR check "/api/save-score" request - it will have sessionId in the request body')
    
    // Try to fetch recent session from database
    if (accessToken && userEmail) {
      console.log('\n🔍 Attempting to fetch recent session from database...')
      try {
        // We can't directly query Supabase from browser, but we can check Network tab
        console.log('   Check Network tab for recent "/api/create-game-session" responses')
      } catch (e) {
        console.warn('Could not fetch session:', e)
      }
    }
    
    // Output results
    console.log('\n' + '='.repeat(60))
    console.log('📝 TEST CREDENTIALS')
    console.log('='.repeat(60))
    
    if (userEmail) {
      console.log(`\n📧 User Email:`)
      console.log(`   ${userEmail}`)
    } else {
      console.log(`\n❌ User Email: NOT FOUND`)
      console.log(`   Make sure you're logged into the game`)
    }
    
    if (accessToken) {
      console.log(`\n🔑 Access Token:`)
      console.log(`   ${accessToken.substring(0, 50)}...${accessToken.substring(accessToken.length - 10)}`)
      console.log(`   (Full token: ${accessToken})`)
    } else {
      console.log(`\n❌ Access Token: NOT FOUND`)
      console.log(`   Try refreshing the page and logging in again`)
    }
    
    if (!sessionId) {
      console.log(`\n❌ Session ID: NOT FOUND`)
      console.log(`   To get Session ID:`)
      console.log(`   1. Play a game (or check Network tab if you just played)`)
      console.log(`   2. Look for "/api/create-game-session" response`)
      console.log(`   3. Copy the "sessionId" from the response`)
      console.log(`   OR run: await getSessionIdFromNetwork()`)
    } else {
      console.log(`\n🎮 Session ID:`)
      console.log(`   ${sessionId}`)
    }
    
    console.log('\n' + '='.repeat(60))
    
    // Return credentials object
    return {
      userEmail,
      accessToken,
      sessionId,
    }
    
  } catch (error) {
    console.error('❌ Error extracting credentials:', error)
    return null
  }
}

// Helper function to extract session ID from Network tab
async function getSessionIdFromNetwork() {
  console.log('🔍 Checking Network tab for session ID...')
  console.log('\n📋 Instructions:')
  console.log('   1. Open Network tab in DevTools')
  console.log('   2. Filter by "create-game-session" or "save-score"')
  console.log('   3. Click on the request')
  console.log('   4. Check "Response" tab for sessionId')
  console.log('   5. Copy the UUID (looks like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)')
  console.log('\n   OR manually copy from the response JSON:')
  console.log('   { "success": true, "sessionId": "YOUR-SESSION-ID-HERE" }')
}

// Helper function to create a test session
async function createTestSession(vehicle = 'corolla') {
  const credentials = await getTestCredentials()
  
  if (!credentials || !credentials.accessToken || !credentials.userEmail) {
    console.error('❌ Need access token and email first.')
    console.log('   Trying to extract credentials...')
    const creds = await getTestCredentials()
    if (!creds || !creds.accessToken || !creds.userEmail) {
      console.error('❌ Could not get credentials. Make sure you are logged in.')
      return null
    }
    // Use the newly extracted credentials
    credentials.accessToken = creds.accessToken
    credentials.userEmail = creds.userEmail
  }
  
  console.log('\n🧪 Creating test session...')
  
  try {
    const response = await fetch('/api/create-game-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: credentials.userEmail,
        accessToken: credentials.accessToken,
        vehicle: vehicle
      })
    })
    
    const data = await response.json()
    
    if (response.ok && data.sessionId) {
      console.log('✅ Test session created!')
      console.log(`\n🎮 Session ID: ${data.sessionId}`)
      console.log(`\n📋 Full credentials:`)
      console.log(`   Email: ${credentials.userEmail}`)
      console.log(`   Access Token: ${credentials.accessToken.substring(0, 30)}...`)
      console.log(`   Session ID: ${data.sessionId}`)
      return {
        ...credentials,
        sessionId: data.sessionId
      }
    } else {
      console.error('❌ Failed to create session:', data)
      if (response.status === 401) {
        console.error('   Authentication failed. Your access token may have expired.')
        console.error('   Try refreshing the page and logging in again.')
      }
      return null
    }
  } catch (error) {
    console.error('❌ Error creating session:', error)
    return null
  }
}

// Export functions
window.getTestCredentials = getTestCredentials
window.getSessionIdFromNetwork = getSessionIdFromNetwork
window.createTestSession = createTestSession

// Simple one-liner to get everything
async function getEverything() {
  const result = await createTestSession()
  if (result) {
    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL CREDENTIALS READY FOR TESTING')
    console.log('='.repeat(60))
    console.log('\nCopy these values:')
    console.log(`\nconst TEST_CREDS = {`)
    console.log(`  userEmail: '${result.userEmail}',`)
    console.log(`  accessToken: '${result.accessToken}',`)
    console.log(`  sessionId: '${result.sessionId}'`)
    console.log(`}`)
    console.log('\n' + '='.repeat(60))
    return result
  }
  return null
}

// Export functions
window.getTestCredentials = getTestCredentials
window.getSessionIdFromNetwork = getSessionIdFromNetwork
window.createTestSession = createTestSession
window.getEverything = getEverything

console.log('✅ Test credential helpers loaded!')
console.log('\n📋 Available functions:')
console.log('  - await getTestCredentials()     # Get access token and email')
console.log('  - await createTestSession()     # Create a new test session')
console.log('  - await getEverything()         # Get all credentials at once ⭐ RECOMMENDED')
console.log('  - getSessionIdFromNetwork()     # Instructions for finding session ID')
console.log('\n💡 Quick start (recommended):')
console.log('   const creds = await getEverything()')
console.log('\n💡 Or step by step:')
console.log('   const creds = await getTestCredentials()')
console.log('   const fullCreds = await createTestSession()')

