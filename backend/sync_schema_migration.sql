-- Migration to add sync functionality columns to existing tables
-- Run this in Supabase SQL Editor

-- First, add new columns to game_analysis table
ALTER TABLE game_analysis 
ADD COLUMN IF NOT EXISTS game_url VARCHAR,
ADD COLUMN IF NOT EXISTS platform VARCHAR,
ADD COLUMN IF NOT EXISTS pgn TEXT,
ADD COLUMN IF NOT EXISTS key_moments JSONB,
ADD COLUMN IF NOT EXISTS sync_job_id UUID;

-- Make game_url NOT NULL for new rows (but allow existing NULL values)
-- Update the constraint to allow either game_id OR game_url
ALTER TABLE game_analysis 
DROP CONSTRAINT IF EXISTS game_analysis_game_id_key,
ALTER COLUMN game_id DROP NOT NULL;

-- Rename date column to created_at for consistency
ALTER TABLE game_analysis 
RENAME COLUMN date TO created_at;

-- Create sync_jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR NOT NULL,
    username VARCHAR NOT NULL,
    months_requested INTEGER DEFAULT 1,
    status VARCHAR DEFAULT 'pending',
    games_found INTEGER DEFAULT 0,
    games_analyzed INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_analysis_platform ON game_analysis(platform);
CREATE INDEX IF NOT EXISTS idx_game_analysis_sync_job_id ON game_analysis(sync_job_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id ON sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);

-- Add Row Level Security policies for sync_jobs
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync jobs" ON sync_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync jobs" ON sync_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync jobs" ON sync_jobs
    FOR UPDATE USING (auth.uid() = user_id); 