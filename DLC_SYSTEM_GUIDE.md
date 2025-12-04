# DLC Unlock System - Integration Guide

## Database Schema

The system uses two main tables:

### `dlc_items`
Stores available DLC items that can be unlocked:
- `id` (UUID): Primary key
- `code` (TEXT): Unique DLC code (e.g., "DLC_001")
- `name` (TEXT): Display name
- `description` (TEXT): Optional description
- `image_url` (TEXT): Optional image URL
- `is_active` (BOOLEAN): Enable/disable DLC without deleting
- `created_at`, `updated_at`: Timestamps

### `dlc_unlocks`
Tracks which users have unlocked which DLCs:
- `id` (UUID): Primary key
- `user_email` (TEXT): User's email (matches `usernames.user_email`)
- `dlc_code` (TEXT): DLC code (references `dlc_items.code`)
- `unlocked_at` (TIMESTAMPTZ): When unlocked
- `unlocked_via` (TEXT): How it was unlocked (default: "spark_spend")
- `slack_user_id` (TEXT): Optional Slack user ID
- `slack_message_ts` (TEXT): Optional Slack message timestamp
- `created_at` (TIMESTAMPTZ): Record creation time
- **Unique constraint**: `(user_email, dlc_code)` prevents duplicate unlocks

## n8n Integration

### Step 1: Configure Supabase Node

1. **Add Supabase Node** to your n8n workflow after the Slack webhook trigger
2. **Operation**: Select `Insert`
3. **Table**: `dlc_unlocks`

### Step 2: Map n8n Output to Database Fields

Your n8n workflow outputs:
```json
{
  "dlc_code": "DLC_001",
  "username": "le-whetty", 
  "spender_name": "Peter Sloan",
  "slack_user_id": "U123456",
  "slack_email": "peter@gotracksuit.com",
  "slack_username": "peter.sloan",
  "message_ts": "1764763038.502509",
  "channel": "C0A1MV7A6TB"
}
```

**If your n8n workflow already extracts the user's email from the game, you can skip the username lookup entirely!**

Simply extract the `user_email` directly from your workflow output:

1. **Extract Data (Function Node)** - Get email and DLC code:
   ```javascript
   const slackData = $input.first().json;
   
   // Use email from workflow output (adjust field name as needed)
   const userEmail = slackData.user_email || slackData.email;
   const dlcCode = slackData.dlc_code;
   
   if (!userEmail || !dlcCode) {
     throw new Error(`Missing required fields. Email: ${userEmail}, DLC Code: ${dlcCode}`);
   }
   
   return {
     user_email: userEmail.toLowerCase().trim(),
     dlc_code: dlcCode,
     unlocked_via: 'spark_spend',
     slack_user_id: slackData.slack_user_id || '',
     slack_message_ts: slackData.message_ts || ''
   };
   ```

2. **Configure Insert Node**:
   - **Operation**: `Insert`
   - **Table**: `dlc_unlocks`
   - **Columns**: Map from Function node output:
     - `user_email`: `{{ $json.user_email }}`
     - `dlc_code`: `{{ $json.dlc_code }}`
     - `unlocked_via`: `{{ $json.unlocked_via }}`
     - `slack_user_id`: `{{ $json.slack_user_id }}`
     - `slack_message_ts`: `{{ $json.slack_message_ts }}`

### Step 3: Handle Duplicate Unlocks

The database has a unique constraint on `(user_email, dlc_code)`, so duplicate inserts will fail.

**Option A: Use `ON CONFLICT DO NOTHING` (Recommended)**
- In the Supabase Insert node, add this in "Additional Fields" → "Upsert Conflict Target": `user_email,dlc_code`
- This will silently ignore duplicate unlock attempts

**Option B: Check Before Insert**
- Add a Supabase Query node before Insert:
  ```sql
  SELECT id FROM dlc_unlocks 
  WHERE user_email = $1 AND dlc_code = $2
  ```
- Use an IF node to only insert if no rows returned

**Option C: Catch Error in n8n**
- Add an Error Trigger node
- Check if error message contains "duplicate" or "unique"
- Log as "DLC already unlocked" instead of failing

### Recommended n8n Workflow Structure

```
1. Slack Webhook Trigger
   ↓
2. Filter Node (check for "Parking Simulator DLC Unlock")
   ↓
3. Extract Data (parse message, get dlc_code, username)
   ↓
4. Supabase Query (get user_email from username)
   ↓
5. Function Node (map data + handle errors)
   ↓
6. Supabase Insert (insert into dlc_unlocks)
   ↓
7. Success Notification (optional: send confirmation to Slack)
```

## Testing

### Test 1: Manual Database Insert

Run this SQL in Supabase SQL Editor:

```sql
-- First, find a test user's email from their username
SELECT user_email FROM usernames WHERE username = 'le-whetty';

-- Then insert a test unlock (replace with actual email)
INSERT INTO dlc_unlocks (user_email, dlc_code, unlocked_via)
VALUES ('test@example.com', 'DLC_001', 'manual_test')
ON CONFLICT (user_email, dlc_code) DO NOTHING;

-- Verify it was inserted
SELECT * FROM dlc_unlocks WHERE user_email = 'test@example.com';
```

### Test 2: Test n8n Workflow

1. **Create a test Slack message** in the #spark-spending channel:
   ```
   Parking Simulator DLC Unlock
   DLC Code: DLC_001
   Username: le-whetty
   ```

2. **Check n8n execution logs**:
   - Verify the webhook was received
   - Check that username was found in database
   - Verify insert succeeded

3. **Verify in Supabase**:
   ```sql
   SELECT 
     du.*,
     u.username,
     di.name as dlc_name
   FROM dlc_unlocks du
   JOIN usernames u ON du.user_email = u.user_email
   JOIN dlc_items di ON du.dlc_code = di.code
   WHERE u.username = 'le-whetty';
   ```

### Test 3: Test Duplicate Prevention

Try inserting the same unlock twice - the second should be ignored (if using `ON CONFLICT DO NOTHING`) or fail gracefully.

## Querying DLC Status in Your Game

### Check if user has a specific DLC:

```typescript
const { data, error } = await supabase
  .from('dlc_unlocks')
  .select('id')
  .eq('user_email', userEmail)
  .eq('dlc_code', 'DLC_001')
  .maybeSingle();

const hasDLC = !!data;
```

### Get all unlocked DLCs for a user:

```typescript
const { data, error } = await supabase
  .from('dlc_unlocks')
  .select(`
    dlc_code,
    unlocked_at,
    dlc_items (
      name,
      description,
      image_url
    )
  `)
  .eq('user_email', userEmail)
  .order('unlocked_at', { ascending: false });
```

### Using the helper function:

```sql
-- Check if user has DLC
SELECT user_has_dlc('user@example.com', 'DLC_001');

-- Get all unlocked DLCs
SELECT * FROM get_user_unlocked_dlcs('user@example.com');
```

## Adding New DLC Items

To add a new DLC item:

```sql
INSERT INTO dlc_items (code, name, description, image_url)
VALUES ('DLC_004', 'New DLC Name', 'Description here', 'https://example.com/image.png');
```

## Troubleshooting

### Username not found
- Check that username exists in `usernames` table
- Verify username is lowercase (if stored that way)
- Check for typos in the Slack message

### Insert fails
- Verify DLC code exists in `dlc_items` table
- Check that `is_active = true` for the DLC
- Verify RLS policies allow service role to insert

### Duplicate unlock detected
- This is expected behavior - user already has the DLC
- Consider logging this as a success (already unlocked) rather than an error

