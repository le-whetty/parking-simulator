-- DLC System Migration
-- Creates tables for DLC items and user unlocks

-- Table: dlc_items
-- Stores available DLC items that can be unlocked
CREATE TABLE IF NOT EXISTS dlc_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g., "DLC_001"
  name TEXT NOT NULL, -- Display name, e.g., "Premium Vehicle Pack"
  description TEXT, -- Optional description
  image_url TEXT, -- Optional image URL for the DLC
  is_active BOOLEAN DEFAULT true, -- Can disable DLCs without deleting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: dlc_unlocks
-- Tracks which users have unlocked which DLCs
CREATE TABLE IF NOT EXISTS dlc_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL, -- References user via email (matches usernames.user_email)
  dlc_code TEXT NOT NULL, -- References dlc_items.code
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_via TEXT DEFAULT 'spark_spend', -- Track how it was unlocked
  slack_user_id TEXT, -- Optional: track Slack user who unlocked
  slack_message_ts TEXT, -- Optional: track Slack message timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate unlocks of the same DLC for the same user
  UNIQUE(user_email, dlc_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dlc_unlocks_user_email ON dlc_unlocks(user_email);
CREATE INDEX IF NOT EXISTS idx_dlc_unlocks_dlc_code ON dlc_unlocks(dlc_code);
CREATE INDEX IF NOT EXISTS idx_dlc_items_code ON dlc_items(code);
CREATE INDEX IF NOT EXISTS idx_dlc_items_active ON dlc_items(is_active) WHERE is_active = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at for dlc_items
CREATE TRIGGER update_dlc_items_updated_at
  BEFORE UPDATE ON dlc_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
-- Enable RLS on both tables
ALTER TABLE dlc_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dlc_unlocks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active DLC items (for game to show available DLCs)
CREATE POLICY "Anyone can read active DLC items"
  ON dlc_items FOR SELECT
  USING (is_active = true);

-- Policy: Users can read their own unlocks
CREATE POLICY "Users can read their own DLC unlocks"
  ON dlc_unlocks FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

-- Policy: Service role can insert unlocks (for n8n workflow)
-- Note: n8n will use service role key, so this allows inserts
CREATE POLICY "Service role can insert DLC unlocks"
  ON dlc_unlocks FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can read all unlocks (for admin/debugging)
CREATE POLICY "Service role can read all DLC unlocks"
  ON dlc_unlocks FOR SELECT
  USING (true);

-- Insert some example DLC items (you can modify these)
INSERT INTO dlc_items (code, name, description) VALUES
  ('DLC_001', 'Premium Vehicle Pack', 'Unlock exclusive vehicles for your parking adventures'),
  ('DLC_002', 'Golden Hotdog Pack', 'Premium hotdog skins and effects'),
  ('DLC_003', 'VIP Parking Pass', 'Special parking spot designs and animations')
ON CONFLICT (code) DO NOTHING;

-- Helper function: Check if user has DLC unlocked
CREATE OR REPLACE FUNCTION user_has_dlc(user_email_param TEXT, dlc_code_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dlc_unlocks
    WHERE user_email = user_email_param
      AND dlc_code = dlc_code_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get all unlocked DLCs for a user
CREATE OR REPLACE FUNCTION get_user_unlocked_dlcs(user_email_param TEXT)
RETURNS TABLE (
  dlc_code TEXT,
  name TEXT,
  description TEXT,
  image_url TEXT,
  unlocked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    di.code,
    di.name,
    di.description,
    di.image_url,
    du.unlocked_at
  FROM dlc_unlocks du
  JOIN dlc_items di ON du.dlc_code = di.code
  WHERE du.user_email = user_email_param
    AND di.is_active = true
  ORDER BY du.unlocked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

