-- Title Progression System Migration
-- Creates table for tracking user titles and progression points

-- Table: user_titles
-- Tracks user's current title and progression points
CREATE TABLE IF NOT EXISTS user_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT UNIQUE NOT NULL,
  current_title TEXT NOT NULL DEFAULT 'Parking Manager', -- L1-L7 titles
  title_level INTEGER NOT NULL DEFAULT 1, -- 1-7
  progression_points INTEGER NOT NULL DEFAULT 0, -- Points toward next level
  total_points INTEGER NOT NULL DEFAULT 0, -- Lifetime total points
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_titles_user_email ON user_titles(user_email);
CREATE INDEX IF NOT EXISTS idx_user_titles_title_level ON user_titles(title_level);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_titles_updated_at
  BEFORE UPDATE ON user_titles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own title
CREATE POLICY "Users can read their own title"
  ON user_titles FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

-- Policy: Service role can insert/update titles
CREATE POLICY "Service role can manage titles"
  ON user_titles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Helper function: Calculate title from total points
-- Points thresholds (relative to top player's score):
-- L1 (Parking Manager): 0-20% of top player
-- L2 (Intermediate Parking Manager): 20-40%
-- L3 (Senior Parking Manager): 40-60%
-- L4 (Parking Lead): 60-80%
-- L5 (Head of Parking): 80-90%
-- L6 (VP Parking): 90-95%
-- L7 (Chief Parking Officer): 95-100%
CREATE OR REPLACE FUNCTION calculate_title_from_points(user_points INTEGER, top_player_points INTEGER)
RETURNS TABLE (
  title TEXT,
  level INTEGER,
  points_needed_for_next INTEGER
) AS $$
DECLARE
  percentage NUMERIC;
  calculated_title TEXT;
  calculated_level INTEGER;
  next_level_points INTEGER;
BEGIN
  -- Handle edge case where top_player_points is 0
  IF top_player_points = 0 OR top_player_points IS NULL THEN
    top_player_points := 1000; -- Default baseline
  END IF;

  percentage := (user_points::NUMERIC / top_player_points::NUMERIC) * 100;

  -- Determine title based on percentage
  IF percentage >= 95 THEN
    calculated_title := 'Chief Parking Officer';
    calculated_level := 7;
    next_level_points := NULL; -- Max level
  ELSIF percentage >= 90 THEN
    calculated_title := 'VP Parking';
    calculated_level := 6;
    next_level_points := CEIL(top_player_points * 0.95);
  ELSIF percentage >= 80 THEN
    calculated_title := 'Head of Parking';
    calculated_level := 5;
    next_level_points := CEIL(top_player_points * 0.90);
  ELSIF percentage >= 60 THEN
    calculated_title := 'Parking Lead';
    calculated_level := 4;
    next_level_points := CEIL(top_player_points * 0.80);
  ELSIF percentage >= 40 THEN
    calculated_title := 'Senior Parking Manager';
    calculated_level := 3;
    next_level_points := CEIL(top_player_points * 0.60);
  ELSIF percentage >= 20 THEN
    calculated_title := 'Intermediate Parking Manager';
    calculated_level := 2;
    next_level_points := CEIL(top_player_points * 0.40);
  ELSE
    calculated_title := 'Parking Manager';
    calculated_level := 1;
    next_level_points := CEIL(top_player_points * 0.20);
  END IF;

  RETURN QUERY SELECT calculated_title, calculated_level, next_level_points;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get or create user title
CREATE OR REPLACE FUNCTION get_or_create_user_title(user_email_param TEXT)
RETURNS TABLE (
  user_email TEXT,
  current_title TEXT,
  title_level INTEGER,
  progression_points INTEGER,
  total_points INTEGER
) AS $$
BEGIN
  -- Try to get existing title
  IF EXISTS (SELECT 1 FROM user_titles WHERE user_email = user_email_param) THEN
    RETURN QUERY
    SELECT 
      ut.user_email,
      ut.current_title,
      ut.title_level,
      ut.progression_points,
      ut.total_points
    FROM user_titles ut
    WHERE ut.user_email = user_email_param;
  ELSE
    -- Create new title entry
    INSERT INTO user_titles (user_email, current_title, title_level, progression_points, total_points)
    VALUES (user_email_param, 'Parking Manager', 1, 0, 0)
    RETURNING 
      user_email,
      current_title,
      title_level,
      progression_points,
      total_points;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Update user title based on points
CREATE OR REPLACE FUNCTION update_user_title_from_points(user_email_param TEXT, new_total_points INTEGER)
RETURNS TABLE (
  user_email TEXT,
  current_title TEXT,
  title_level INTEGER,
  progression_points INTEGER,
  total_points INTEGER,
  points_to_next_level INTEGER
) AS $$
DECLARE
  top_player_points INTEGER;
  title_info RECORD;
BEGIN
  -- Get top player's total points (from their best score)
  SELECT COALESCE(MAX(score), 1000) INTO top_player_points
  FROM scores
  LIMIT 1;

  -- Calculate title from points
  SELECT * INTO title_info
  FROM calculate_title_from_points(new_total_points, top_player_points);

  -- Update or insert user title
  INSERT INTO user_titles (user_email, current_title, title_level, total_points, progression_points)
  VALUES (
    user_email_param,
    title_info.title,
    title_info.level,
    new_total_points,
    new_total_points -- For now, progression_points = total_points (can be refined later)
  )
  ON CONFLICT (user_email) DO UPDATE SET
    current_title = EXCLUDED.current_title,
    title_level = EXCLUDED.title_level,
    total_points = EXCLUDED.total_points,
    progression_points = EXCLUDED.progression_points,
    updated_at = NOW();

  -- Return updated title info
  RETURN QUERY
  SELECT 
    ut.user_email,
    ut.current_title,
    ut.title_level,
    ut.progression_points,
    ut.total_points,
    COALESCE(title_info.points_needed_for_next - new_total_points, 0)::INTEGER as points_to_next_level
  FROM user_titles ut
  WHERE ut.user_email = user_email_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

