-- RPC function to get game sessions for a user by email
-- This bypasses RLS by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_game_sessions(user_email_param TEXT)
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  user_id UUID,
  vehicle_type TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_ms BIGINT,
  final_score INTEGER,
  score_saved BOOLEAN,
  game_mode TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.id,
    gs.user_email,
    gs.user_id,
    gs.vehicle_type,
    gs.started_at,
    gs.ended_at,
    gs.duration_ms,
    gs.final_score,
    gs.score_saved,
    gs.game_mode
  FROM game_sessions gs
  WHERE gs.user_email = user_email_param
  ORDER BY gs.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

