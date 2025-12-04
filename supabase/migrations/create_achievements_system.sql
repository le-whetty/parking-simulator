-- Achievements System Migration
-- Creates tables for achievements and user achievement unlocks

-- Table: achievements
-- Stores available achievements that can be unlocked
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g., "PERFECT_PARKING"
  name TEXT NOT NULL, -- Display name, e.g., "Perfect Parking"
  description TEXT NOT NULL, -- Description of how to unlock
  image_url TEXT, -- Optional image URL for the achievement badge
  category TEXT DEFAULT 'general', -- Category: 'general', 'combat', 'speed', 'survival', 'social'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: user_achievements
-- Tracks which users have unlocked which achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL, -- References user via email
  achievement_code TEXT NOT NULL, -- References achievements.code
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  game_session_id UUID, -- Optional: link to the game session where it was unlocked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate unlocks
  UNIQUE(user_email, achievement_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_email ON user_achievements(user_email);
CREATE INDEX IF NOT EXISTS idx_user_achievements_code ON user_achievements(achievement_code);
CREATE INDEX IF NOT EXISTS idx_achievements_code ON achievements(code);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active) WHERE is_active = true;

-- Trigger to auto-update updated_at for achievements
CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active achievements
CREATE POLICY "Anyone can read active achievements"
  ON achievements FOR SELECT
  USING (is_active = true);

-- Policy: Users can read their own achievements
CREATE POLICY "Users can read their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

-- Policy: Service role can insert achievements (for game logic)
CREATE POLICY "Service role can insert user achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can read all achievements (for admin/debugging)
CREATE POLICY "Service role can read all user achievements"
  ON user_achievements FOR SELECT
  USING (true);

-- Insert achievement definitions
INSERT INTO achievements (code, name, description, category) VALUES
  ('PERFECT_PARKING', 'Perfect Parking', 'Win a game without taking any damage', 'survival'),
  ('COMBO_MASTER', 'Combo Master', 'Achieve 50+ combo hits in a single game', 'combat'),
  ('HOTDOG_HERO', 'Hotdog Hero', 'Throw 1000 hotdogs total', 'combat'),
  ('SPEED_DEMON', 'Speed Demon', 'Win a game in under 20 seconds', 'speed'),
  ('TANK_COMMANDER', 'Tank Commander', 'Win a game with 10 health or less remaining', 'survival'),
  ('SPARKIE', 'Sparkie', 'Spend 100 SPARK on DLC', 'social'),
  ('PARKIE', 'Parkie', 'OG award - Played during launch week', 'social'),
  ('LEARNER_VEHICLE', 'Learner Vehicle', 'Play for 3 days in a row', 'social')
ON CONFLICT (code) DO NOTHING;

-- Helper function: Check if user has achievement
CREATE OR REPLACE FUNCTION user_has_achievement(user_email_param TEXT, achievement_code_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_email = user_email_param
      AND achievement_code = achievement_code_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get all unlocked achievements for a user
CREATE OR REPLACE FUNCTION get_user_achievements(user_email_param TEXT)
RETURNS TABLE (
  achievement_code TEXT,
  name TEXT,
  description TEXT,
  image_url TEXT,
  category TEXT,
  unlocked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.code,
    a.name,
    a.description,
    a.image_url,
    a.category,
    ua.unlocked_at
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_code = a.code
  WHERE ua.user_email = user_email_param
    AND a.is_active = true
  ORDER BY ua.unlocked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

