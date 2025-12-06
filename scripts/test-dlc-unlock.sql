-- Test Script for DLC Unlock System
-- Run these queries in Supabase SQL Editor to test the system

-- 1. Check if DLC items exist
SELECT * FROM dlc_items WHERE is_active = true;

-- 2. Find a test user's email from username
SELECT user_email, username FROM usernames WHERE username = 'le-whetty';

-- 3. Insert a test DLC unlock (replace email with actual user email)
-- This simulates what n8n would do
INSERT INTO dlc_unlocks (
  user_email,
  dlc_code,
  unlocked_via,
  slack_user_id,
  slack_message_ts
)
VALUES (
  'peter@gotracksuit.com', -- Replace with actual user email
  'DLC_001',
  'manual_test',
  'U_TEST123',
  '1764763038.502509'
)
ON CONFLICT (user_email, dlc_code) DO NOTHING
RETURNING *;

-- 4. Verify the unlock was created
SELECT 
  du.*,
  u.username,
  di.name as dlc_name,
  di.description
FROM dlc_unlocks du
JOIN usernames u ON du.user_email = u.user_email
JOIN dlc_items di ON du.dlc_code = di.code
WHERE u.username = 'le-whetty'; -- Replace with test username

-- 5. Test duplicate prevention (should return 0 rows inserted)
INSERT INTO dlc_unlocks (user_email, dlc_code, unlocked_via)
VALUES ('peter@gotracksuit.com', 'DLC_001', 'duplicate_test')
ON CONFLICT (user_email, dlc_code) DO NOTHING
RETURNING *;

-- 6. Test helper function: Check if user has DLC
SELECT user_has_dlc('peter@gotracksuit.com', 'DLC_001') as has_dlc;

-- 7. Test helper function: Get all unlocked DLCs for user
SELECT * FROM get_user_unlocked_dlcs('peter@gotracksuit.com');

-- 8. Clean up test data (optional)
-- DELETE FROM dlc_unlocks WHERE unlocked_via = 'manual_test';

