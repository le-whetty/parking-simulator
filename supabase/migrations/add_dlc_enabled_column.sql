-- Add enabled column to dlc_unlocks table
-- Allows users to enable/disable individual DLC items after unlocking

ALTER TABLE dlc_unlocks 
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dlc_unlocks_enabled ON dlc_unlocks(user_email, dlc_code, enabled) WHERE enabled = true;

-- Update RLS policy to allow users to update their own unlocks
CREATE POLICY "Users can update their own DLC unlocks"
  ON dlc_unlocks FOR UPDATE
  USING (auth.jwt() ->> 'email' = user_email)
  WITH CHECK (auth.jwt() ->> 'email' = user_email);

