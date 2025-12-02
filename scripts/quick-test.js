/**
 * Quick Test Script - Using credentials from Network tab
 * 
 * Copy and paste this into your browser console
 */

// Your credentials extracted from the Network tab
const TEST_CREDS = {
  userEmail: 'peter.sloan@gotracksuit.com',
  accessToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6Inh1NS9yeXlxUDhVRnNRcmgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2hzZ3Z1ZmRtbW9yeGR1Z3J3YXFrLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiZjY0YTIxMy1kYTYwLTRjNTMtYmYxMi0wMzI3ZTgzODM5YTUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY0Njg0NjQyLCJpYXQiOjE3NjQ2ODEwNDIsImVtYWlsIjoicGV0ZXIuc2xvYW5AZ290cmFja3N1aXQuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJnb29nbGUiLCJwcm92aWRlcnMiOlsiZ29vZ2xlIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJZ3JvWldoZEJvSEdacDJ4b2J2bzBtVWZnR1JDUGNQRENQODk4Z19zc0hZczhzc2dJPXM5Ni1jIiwiY3VzdG9tX2NsYWltcyI6eyJoZCI6ImdvdHJhY2tzdWl0LmNvbSJ9LCJlbWFpbCI6InBldGVyLnNsb2FuQGdvdHJhY2tzdWl0LmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJQZXRlciBTbG9hbiIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSIsIm5hbWUiOiJQZXRlciBTbG9hbiIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0lncm9aV2hkQm9IR1pwMnhvYnZvMG1VZmdHUkNQY1BEQ1A4OThnX3NzSFlzOHNzZ0k9czk2LWMiLCJwcm92aWRlcl9pZCI6IjEwMTk4OTU2OTk2OTA0MzQ3MTQ1NSIsInN1YiI6IjEwMTk4OTU2OTk2OTA0MzQ3MTQ1NSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzY0NjYwNjExfV0sInNlc3Npb25faWQiOiI2NDY3ZTA5MC0wOGE4LTRmNTYtOWY2YS0wMjVlYmEzZGMzYTQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.Xy2dyrppJ2dVeDAYt70cB1FISvtQk5Zm0rcDwfXigcg',
  sessionId: null // Will be created below
}

// Test 1: Create a game session
async function createSession() {
  console.log('🧪 Creating game session...')
  
  const response = await fetch('/api/create-game-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: TEST_CREDS.userEmail,
      accessToken: TEST_CREDS.accessToken,
      vehicle: 'corolla'
    })
  })
  
  const data = await response.json()
  
  if (response.ok && data.sessionId) {
    TEST_CREDS.sessionId = data.sessionId
    console.log('✅ Session created!')
    console.log('📋 Full credentials:', TEST_CREDS)
    return data.sessionId
  } else {
    console.error('❌ Failed:', data)
    return null
  }
}

// Test 2: Log some game events
async function logEvents(sessionId) {
  console.log('🧪 Logging test events...')
  
  const events = [
    { type: 'hit', data: { driverName: 'Test Driver', comboCount: 1 }, timestamp: 1000 },
    { type: 'hit', data: { driverName: 'Test Driver', comboCount: 2 }, timestamp: 2000 },
    { type: 'hit', data: { driverName: 'Test Driver', comboCount: 3 }, timestamp: 3000 },
    { type: 'combo', data: { hits: 3, points: 150 }, timestamp: 3000 },
    { type: 'damage', data: { damage: 10 }, timestamp: 5000 },
  ]
  
  for (const event of events) {
    const response = await fetch('/api/log-game-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        accessToken: TEST_CREDS.accessToken,
        eventType: event.type,
        eventData: event.data,
        timestampMs: event.timestamp
      })
    })
    
    if (!response.ok) {
      console.error(`❌ Failed to log ${event.type}:`, await response.json())
    }
  }
  
  console.log('✅ Events logged')
}

// Test 3: Submit valid score
async function submitValidScore(sessionId) {
  console.log('🧪 Submitting valid score...')
  
  // Calculate expected score:
  // 3 hits × 50 = 150
  // 1 combo = 150
  // 1 damage = -10
  // Time bonus (115 seconds) = 115
  // Base: 150 - 10 + 115 + 150 = 405
  // Multiplier (100% on-screen) = 1.25
  // Final: 405 × 1.25 = 506.25 ≈ 506
  
  const response = await fetch('/api/save-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: TEST_CREDS.userEmail,
      score: 506,
      accessToken: TEST_CREDS.accessToken,
      vehicle: 'corolla',
      sessionId: sessionId,
      gameDurationMs: 5000 // 5 seconds played, 115 seconds remaining
    })
  })
  
  const data = await response.json()
  
  if (response.ok) {
    console.log('✅ Score submitted successfully!', data)
  } else {
    console.error('❌ Failed:', data)
  }
  
  return data
}

// Test 4: Submit invalid score (too high)
async function submitInvalidScore(sessionId) {
  console.log('🧪 Testing invalid score (too high)...')
  
  const response = await fetch('/api/save-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: TEST_CREDS.userEmail,
      score: 5000, // Too high!
      accessToken: TEST_CREDS.accessToken,
      vehicle: 'corolla',
      sessionId: sessionId,
      gameDurationMs: 120000
    })
  })
  
  const data = await response.json()
  
  if (response.status === 400) {
    console.log('✅ Correctly rejected high score:', data)
  } else {
    console.error('❌ Should have rejected:', data)
  }
  
  return data
}

// Test 5: Try to reuse session
async function testSessionReuse(sessionId) {
  console.log('🧪 Testing session reuse prevention...')
  
  const response = await fetch('/api/save-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: TEST_CREDS.userEmail,
      score: 1000,
      accessToken: TEST_CREDS.accessToken,
      vehicle: 'corolla',
      sessionId: sessionId, // Same session ID
      gameDurationMs: 120000
    })
  })
  
  const data = await response.json()
  
  if (response.status === 403) {
    console.log('✅ Correctly prevented session reuse:', data)
  } else {
    console.error('❌ Should have prevented reuse:', data)
  }
  
  return data
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running all security tests...\n')
  
  // Create session
  const sessionId = await createSession()
  if (!sessionId) {
    console.error('❌ Cannot continue without session')
    return
  }
  
  // Log events
  await logEvents(sessionId)
  
  // Submit valid score
  await submitValidScore(sessionId)
  
  // Test invalid score
  await submitInvalidScore(sessionId)
  
  // Test session reuse (should fail)
  await testSessionReuse(sessionId)
  
  console.log('\n✅ All tests complete!')
}

// Export for manual use
window.TEST_CREDS = TEST_CREDS
window.createSession = createSession
window.logEvents = logEvents
window.submitValidScore = submitValidScore
window.submitInvalidScore = submitInvalidScore
window.testSessionReuse = testSessionReuse
window.runAllTests = runAllTests

console.log('✅ Test functions loaded!')
console.log('\n📋 Available functions:')
console.log('  - await createSession()           # Create a game session')
console.log('  - await logEvents(sessionId)       # Log test events')
console.log('  - await submitValidScore(sessionId)   # Submit valid score')
console.log('  - await submitInvalidScore(sessionId) # Test invalid score rejection')
console.log('  - await testSessionReuse(sessionId)  # Test session reuse prevention')
console.log('  - await runAllTests()              # Run all tests ⭐')
console.log('\n💡 Quick start:')
console.log('   await runAllTests()')

