-- Add game_mode column to game_sessions, game_events, and scores tables
-- Backdate all existing records with "I'm Parkin' Here!" as the game mode

-- Add game_mode to game_sessions
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'I''m Parkin'' Here!';

-- Update existing records to have the default value
UPDATE game_sessions
SET game_mode = 'I''m Parkin'' Here!'
WHERE game_mode IS NULL;

-- Add game_mode to game_events (via session_id join)
-- Note: game_events doesn't have game_mode directly, but we can query via session_id
-- We'll add a comment here for reference, but the actual filtering will be done via JOIN

-- Add game_mode to scores table
ALTER TABLE scores
ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'I''m Parkin'' Here!';

-- Update existing records to have the default value
UPDATE scores
SET game_mode = 'I''m Parkin'' Here!'
WHERE game_mode IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_mode ON game_sessions(game_mode);
CREATE INDEX IF NOT EXISTS idx_scores_game_mode ON scores(game_mode);

