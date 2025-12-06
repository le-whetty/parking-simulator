-- RPC function to get game events for a user by email
-- This bypasses RLS by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_game_events(user_email_param TEXT)
RETURNS TABLE (
  id UUID,
  session_id UUID,
  event_type TEXT,
  event_data JSONB,
  timestamp_ms BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ge.id,
    ge.session_id,
    ge.event_type,
    ge.event_data,
    ge.timestamp_ms
  FROM game_events ge
  JOIN game_sessions gs ON ge.session_id = gs.id
  WHERE gs.user_email = user_email_param
  ORDER BY ge.timestamp_ms ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

