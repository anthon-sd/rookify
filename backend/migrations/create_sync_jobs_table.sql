-- Migration: Create sync_jobs table for tracking game synchronization
-- Purpose: Track background sync jobs from Chess.com and Lichess

-- Create sync_jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('chess.com', 'lichess')),
    username VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fetching', 'analyzing', 'completed', 'failed')),
    games_found INTEGER DEFAULT 0,
    games_analyzed INTEGER DEFAULT 0,
    months_requested INTEGER DEFAULT 1,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id ON sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON sync_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_platform ON sync_jobs(platform);

-- Add platform and game_url columns to game_analyses if not exists
ALTER TABLE game_analyses 
ADD COLUMN IF NOT EXISTS platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS game_url TEXT,
ADD COLUMN IF NOT EXISTS sync_job_id UUID REFERENCES sync_jobs(id) ON DELETE SET NULL;

-- Create unique constraint to prevent duplicate game analysis
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_analyses_unique_game 
ON game_analyses(user_id, game_url) WHERE game_url IS NOT NULL;

-- Add index for game analysis lookups
CREATE INDEX IF NOT EXISTS idx_game_analyses_platform ON game_analyses(platform);
CREATE INDEX IF NOT EXISTS idx_game_analyses_sync_job_id ON game_analyses(sync_job_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sync_jobs_updated_at 
    BEFORE UPDATE ON sync_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 