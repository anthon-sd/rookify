-- Migration: Add chess platform username fields to users table
-- Date: 2024-01-20
-- Purpose: Add chess_com_username and lichess_username fields to support opponent determination

-- Add chess platform username fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS chess_com_username VARCHAR,
ADD COLUMN IF NOT EXISTS lichess_username VARCHAR;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_chess_com_username ON users(chess_com_username);
CREATE INDEX IF NOT EXISTS idx_users_lichess_username ON users(lichess_username);

-- Add comments to document the purpose
COMMENT ON COLUMN users.chess_com_username IS 'Username on Chess.com platform for game sync and opponent determination';
COMMENT ON COLUMN users.lichess_username IS 'Username on Lichess platform for game sync and opponent determination'; 