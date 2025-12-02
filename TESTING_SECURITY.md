# Security Features Testing Guide

## Overview
This guide covers how to test the new security features for score validation.

## Prerequisites
1. Access to Supabase dashboard to view `game_sessions` and `game_events` tables
2. Browser DevTools open (Console tab)
3. Network tab open to inspect API calls

---

## Test 1: Normal Game Flow (Happy Path)

### Steps:
1. **Start a game** - Select a vehicle and start playing
2. **Play normally** - Hit some drivers, take some damage, get combos
3. **Win the game** - Complete the game and submit score

### Expected Results:
- ✅ Game session created in `game_sessions` table
- ✅ Events logged in `game_events` table (hits, combos, damage)
- ✅ Score submitted successfully
- ✅ Session marked as `score_saved: true` in database
- ✅ No errors in console

### How to Verify:
```sql
-- Check session was created
SELECT * FROM game_sessions 
WHERE user_email = 'your-email@example.com' 
ORDER BY started_at DESC 
LIMIT 1;

-- Check events were logged
SELECT * FROM game_events 
WHERE session_id = '<session_id_from_above>' 
ORDER BY timestamp_ms;
```

---

## Test 2: Score Validation - Valid Session

### Steps:
1. Play a game normally
2. Check the Network tab for the `/api/save-score` request
3. Verify the request includes:
   - `sessionId`
   - `gameDurationMs`
   - `score`

### Expected Results:
- ✅ Score submission succeeds
- ✅ Session is marked as used
- ✅ Score matches calculated score from events

---

## Test 3: Session Reuse Prevention

### Steps:
1. Complete a game and submit score successfully
2. Try to submit the same score again with the same `sessionId`

### Expected Results:
- ❌ Second submission should fail with error: "Session already used"
- ✅ Status code: 403

### How to Test:
Open browser console and run:
```javascript
// Get your session ID from the database or Network tab
const sessionId = 'your-session-id';
const accessToken = 'your-access-token'; // Get from localStorage or Network tab

fetch('/api/save-score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userEmail: 'your-email@example.com',
    score: 1000,
    accessToken: accessToken,
    sessionId: sessionId,
    gameDurationMs: 120000
  })
})
.then(r => r.json())
.then(console.log);
```

---

## Test 4: Invalid Score - Too High

### Steps:
1. Try to submit a score above 4000

### Expected Results:
- ❌ Submission fails with error: "Score exceeds maximum possible value"
- ✅ Status code: 400

### How to Test:
```javascript
fetch('/api/save-score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userEmail: 'your-email@example.com',
    score: 5000, // Too high!
    accessToken: accessToken,
    sessionId: sessionId,
    gameDurationMs: 120000
  })
})
.then(r => r.json())
.then(console.log);
```

---

## Test 5: Invalid Score - Negative

### Steps:
1. Try to submit a negative score

### Expected Results:
- ❌ Submission fails with error: "Invalid score"
- ✅ Status code: 400

---

## Test 6: Score Mismatch Detection

### Steps:
1. Play a game and note the actual score
2. Try to submit a different score (e.g., add 100 points)

### Expected Results:
- ❌ If events exist, submission fails with: "Score validation failed"
- ✅ Status code: 400
- ✅ Error shows calculated vs submitted score difference

### How to Test:
```javascript
// Submit score that doesn't match events
fetch('/api/save-score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userEmail: 'your-email@example.com',
    score: 9999, // Way higher than actual
    accessToken: accessToken,
    sessionId: sessionId, // Valid session with events
    gameDurationMs: 120000
  })
})
.then(r => r.json())
.then(console.log);
```

---

## Test 7: Invalid Game Duration

### Steps:
1. Try to submit with duration < 10 seconds or > 150 seconds

### Expected Results:
- ❌ Submission fails with: "Invalid game duration"
- ✅ Status code: 400

### How to Test:
```javascript
// Too short
fetch('/api/save-score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userEmail: 'your-email@example.com',
    score: 100,
    accessToken: accessToken,
    sessionId: sessionId,
    gameDurationMs: 5000 // Too short!
  })
})
.then(r => r.json())
.then(console.log);
```

---

## Test 8: Invalid Session ID

### Steps:
1. Try to submit with a fake/non-existent session ID

### Expected Results:
- ❌ Submission fails with: "Invalid game session"
- ✅ Status code: 403

---

## Test 9: Backward Compatibility (No Session)

### Steps:
1. Submit score without `sessionId` (simulating old client)

### Expected Results:
- ✅ Submission succeeds (backward compatible)
- ✅ Score bounds validation still applies
- ⚠️ No event validation (expected)

### How to Test:
```javascript
// Submit without sessionId (old behavior)
fetch('/api/save-score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userEmail: 'your-email@example.com',
    score: 1000,
    accessToken: accessToken,
    vehicle: 'corolla'
    // No sessionId or gameDurationMs
  })
})
.then(r => r.json())
.then(console.log);
```

---

## Test 10: Event Logging Verification

### Steps:
1. Play a game and perform various actions:
   - Hit drivers (should log 'hit' events)
   - Get combos (should log 'combo' events)
   - Take damage (should log 'damage' events)
   - Miss hotdogs (should log 'miss' events)
2. Check database for events

### Expected Results:
- ✅ All events logged with correct `event_type`
- ✅ `timestamp_ms` increases over time
- ✅ `event_data` contains relevant information

### How to Verify:
```sql
-- Check all event types
SELECT event_type, COUNT(*) 
FROM game_events 
WHERE session_id = '<session_id>' 
GROUP BY event_type;

-- Check event timeline
SELECT event_type, timestamp_ms, event_data 
FROM game_events 
WHERE session_id = '<session_id>' 
ORDER BY timestamp_ms;
```

---

## Test 11: Score Calculation Accuracy

### Steps:
1. Play a game and manually track:
   - Number of hits
   - Combo milestones reached
   - Damage taken
   - Time remaining
   - On-screen percentage
2. Calculate expected score manually
3. Compare with submitted score

### Expected Score Formula:
```
Base Score = (hits × 50) - (damage × 10)
Time Bonus = seconds_remaining
Combo Bonuses = sum of milestone bonuses (150, 300, 500)
Score Before Multiplier = Base Score + Time Bonus + Combo Bonuses
Final Score = Score Before Multiplier × On-Screen Multiplier
```

---

## Test 12: Multiple Rapid Submissions

### Steps:
1. Try to submit multiple scores rapidly

### Expected Results:
- ✅ First submission succeeds
- ❌ Subsequent submissions with same session fail
- ⚠️ Note: Rate limiting not yet implemented (future enhancement)

---

## Debugging Tips

### Check Console Logs:
- Look for "Failed to log game event" warnings (non-blocking)
- Check for "Error creating game session" (shouldn't block game start)

### Check Network Tab:
- Verify `/api/create-game-session` is called on game start
- Verify `/api/log-game-event` is called during gameplay
- Verify `/api/save-score` includes session data

### Database Queries:
```sql
-- Find recent sessions
SELECT * FROM game_sessions 
ORDER BY started_at DESC 
LIMIT 10;

-- Find sessions without scores
SELECT * FROM game_sessions 
WHERE score_saved = false 
ORDER BY started_at DESC;

-- Count events per session
SELECT session_id, COUNT(*) as event_count 
FROM game_events 
GROUP BY session_id 
ORDER BY event_count DESC;
```

---

## Known Limitations

1. **Off-screen tracking**: Currently assumes 100% on-screen if no off-screen events logged
2. **Event loss**: If network fails, events might not be logged (non-blocking by design)
3. **Race conditions**: Multiple rapid submissions might have timing issues
4. **No rate limiting**: Users can still create multiple sessions rapidly

---

## Next Steps for Enhanced Security

1. Add rate limiting (max 1 score per minute per user)
2. Track off-screen events for accurate multiplier calculation
3. Add statistical anomaly detection
4. Implement admin review queue for flagged scores
5. Add replay system for top scores

