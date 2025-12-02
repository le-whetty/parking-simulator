# How to Get Test Credentials

## Quick Method (Browser Console)

1. **Open the game** in your browser (logged in)
2. **Open DevTools** (F12) → **Console** tab
3. **Copy and paste** the script from `scripts/get-test-credentials.js`
4. **Run**: `await getTestCredentials()`

This will extract:
- ✅ Your email address
- ✅ Your access token
- ⚠️ Session ID (you'll need to create one or find it in Network tab)

## Alternative: Get from Network Tab

### Method 1: Create a New Session

1. **Play a game** (or just start one)
2. **Open Network tab** in DevTools
3. **Filter by**: `create-game-session`
4. **Click** on the request
5. **Check Response tab** - you'll see:
   ```json
   {
     "success": true,
     "sessionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   }
   ```
6. **Copy the sessionId**

### Method 2: Find Existing Session

1. **Open Network tab** in DevTools
2. **Filter by**: `save-score`
3. **Click** on a recent request
4. **Check Request tab** → **Payload**
5. **Look for** `sessionId` in the JSON body

## Manual Extraction

### Access Token

The access token is stored in your browser's localStorage. To get it:

1. **Open DevTools** → **Application** tab
2. **Go to**: Storage → Local Storage → `https://ts-parking-simulator.vercel.app`
3. **Look for** a key containing `supabase` and `auth-token`
4. **Copy the value** and parse the JSON
5. **Extract** `access_token` field

Or use console:
```javascript
// In browser console
const keys = Object.keys(localStorage).filter(k => k.includes('supabase'))
keys.forEach(key => {
  try {
    const data = JSON.parse(localStorage.getItem(key))
    if (data.access_token) {
      console.log('Access Token:', data.access_token)
      console.log('User Email:', data.user?.email)
    }
  } catch(e) {}
})
```

### Session ID

The session ID is only created when you start a game. To get it:

**Option A: Create one**
```javascript
// In browser console (after running getTestCredentials script)
const sessionId = await createTestSession()
console.log('Session ID:', sessionId)
```

**Option B: Check Database**
```sql
-- In Supabase SQL Editor
SELECT id, user_email, started_at 
FROM game_sessions 
WHERE user_email = 'your-email@example.com'
ORDER BY started_at DESC 
LIMIT 1;
```

## Example Usage

Once you have the credentials:

```javascript
const credentials = {
  userEmail: 'peter.sloan@gotracksuit.com',
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  sessionId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
}

// Test invalid score
await fetch('/api/save-score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userEmail: credentials.userEmail,
    score: 5000, // Too high!
    accessToken: credentials.accessToken,
    sessionId: credentials.sessionId,
    gameDurationMs: 120000
  })
})
.then(r => r.json())
.then(console.log)
```

## Security Note

⚠️ **Never commit these credentials to Git!** They are sensitive and should only be used for testing.

