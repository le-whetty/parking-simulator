/**
 * Security Testing Script
 * 
 * This script helps test the security features by simulating various scenarios.
 * Run this in the browser console after logging in.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Call test functions: await testNormalFlow(), await testInvalidScore(), etc.
 */

// Helper function to get auth token
async function getAuthToken() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
  // You'll need to provide your Supabase URL and anon key
  // Or get it from localStorage/sessionStorage
  const supabaseUrl = window.location.origin.includes('localhost') 
    ? process.env.NEXT_PUBLIC_SUPABASE_URL 
    : 'your-supabase-url'
  const supabaseKey = 'your-anon-key'
  
  // Try to get from existing session
  const response = await fetch('/api/auth/session')
  // This is a placeholder - adjust based on your auth setup
  return 'your-access-token'
}

// Test 1: Normal flow
async function testNormalFlow() {
  console.log('🧪 Testing normal game flow...')
  
  const userEmail = 'test@example.com' // Replace with your email
  const accessToken = await getAuthToken()
  
  // Step 1: Create session
  const sessionResponse = await fetch('/api/create-game-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail,
      accessToken,
      vehicle: 'corolla'
    })
  })
  
  const sessionData = await sessionResponse.json()
  console.log('✅ Session created:', sessionData)
  
  if (!sessionData.sessionId) {
    console.error('❌ Failed to create session')
    return
  }
  
  const sessionId = sessionData.sessionId
  
  // Step 2: Log some events
  const events = [
    { type: 'hit', data: { driverName: 'Test Driver', comboCount: 1 }, timestamp: 1000 },
    { type: 'hit', data: { driverName: 'Test Driver', comboCount: 2 }, timestamp: 2000 },
    { type: 'hit', data: { driverName: 'Test Driver', comboCount: 3 }, timestamp: 3000 },
    { type: 'combo', data: { hits: 3, points: 150 }, timestamp: 3000 },
    { type: 'damage', data: { damage: 10 }, timestamp: 5000 },
  ]
  
  for (const event of events) {
    await fetch('/api/log-game-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        accessToken,
        eventType: event.type,
        eventData: event.data,
        timestampMs: event.timestamp
      })
    })
  }
  
  console.log('✅ Events logged')
  
  // Step 3: Calculate expected score
  // 3 hits × 50 = 150
  // 1 combo (150 points)
  // 1 damage = -10
  // Time bonus (assuming 115 seconds remaining) = 115
  // Base: 150 - 10 + 115 + 150 = 405
  // Multiplier (assuming 100% on-screen) = 1.25
  // Final: 405 × 1.25 = 506.25 ≈ 506
  
  const expectedScore = 506
  const gameDurationMs = 5000 // 5 seconds (115 seconds remaining)
  
  // Step 4: Submit score
  const scoreResponse = await fetch('/api/save-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail,
      score: expectedScore,
      accessToken,
      vehicle: 'corolla',
      sessionId,
      gameDurationMs
    })
  })
  
  const scoreData = await scoreResponse.json()
  console.log('✅ Score submitted:', scoreData)
  
  return { sessionId, scoreData }
}

// Test 2: Invalid score (too high)
async function testInvalidScore() {
  console.log('🧪 Testing invalid score (too high)...')
  
  const userEmail = 'test@example.com'
  const accessToken = await getAuthToken()
  
  const response = await fetch('/api/save-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail,
      score: 5000, // Too high!
      accessToken,
      vehicle: 'corolla'
    })
  })
  
  const data = await response.json()
  console.log('Result:', data)
  
  if (response.status === 400 && data.error.includes('maximum')) {
    console.log('✅ Correctly rejected high score')
  } else {
    console.error('❌ Should have rejected high score')
  }
  
  return data
}

// Test 3: Session reuse
async function testSessionReuse() {
  console.log('🧪 Testing session reuse prevention...')
  
  // First, create a normal game and submit score
  const { sessionId } = await testNormalFlow()
  
  if (!sessionId) {
    console.error('❌ Need valid session first')
    return
  }
  
  // Try to submit again with same session
  const userEmail = 'test@example.com'
  const accessToken = await getAuthToken()
  
  const response = await fetch('/api/save-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail,
      score: 1000,
      accessToken,
      sessionId,
      gameDurationMs: 120000
    })
  })
  
  const data = await response.json()
  console.log('Result:', data)
  
  if (response.status === 403 && data.error.includes('already used')) {
    console.log('✅ Correctly prevented session reuse')
  } else {
    console.error('❌ Should have prevented session reuse')
  }
  
  return data
}

// Test 4: Score mismatch
async function testScoreMismatch() {
  console.log('🧪 Testing score mismatch detection...')
  
  const userEmail = 'test@example.com'
  const accessToken = await getAuthToken()
  
  // Create session
  const sessionResponse = await fetch('/api/create-game-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail,
      accessToken,
      vehicle: 'corolla'
    })
  })
  
  const sessionData = await sessionResponse.json()
  const sessionId = sessionData.sessionId
  
  // Log minimal events (low score)
  await fetch('/api/log-game-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      accessToken,
      eventType: 'hit',
      eventData: { driverName: 'Test' },
      timestampMs: 1000
    })
  })
  
  // Try to submit high score
  const response = await fetch('/api/save-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail,
      score: 9999, // Way too high!
      accessToken,
      sessionId,
      gameDurationMs: 120000
    })
  })
  
  const data = await response.json()
  console.log('Result:', data)
  
  if (response.status === 400 && data.error.includes('validation failed')) {
    console.log('✅ Correctly detected score mismatch')
  } else {
    console.error('❌ Should have detected score mismatch')
  }
  
  return data
}

// Export for use
window.testSecurity = {
  testNormalFlow,
  testInvalidScore,
  testSessionReuse,
  testScoreMismatch
}

console.log('✅ Security test functions loaded!')
console.log('Available functions:')
console.log('  - await testSecurity.testNormalFlow()')
console.log('  - await testSecurity.testInvalidScore()')
console.log('  - await testSecurity.testSessionReuse()')
console.log('  - await testSecurity.testScoreMismatch()')

