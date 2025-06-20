-- Updated Supabase Migration: Create sync_jobs table matching existing schema
-- This works with your current tables: users, game_analysis, recommendations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sync_jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Add new columns to existing game_analysis table
-- Note: Using your table name "game_analysis" (singular)
DO $$ 
BEGIN
    -- Add platform column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'game_analysis' AND column_name = 'platform') THEN
        ALTER TABLE game_analysis ADD COLUMN platform VARCHAR(50);
        COMMENT ON COLUMN game_analysis.platform IS 'Chess platform: chess.com or lichess';
    END IF;
    
    -- Add game_url column if it doesn't exist  
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'game_analysis' AND column_name = 'game_url') THEN
        ALTER TABLE game_analysis ADD COLUMN game_url TEXT;
        COMMENT ON COLUMN game_analysis.game_url IS 'URL of the original game on the platform';
    END IF;
    
    -- Add sync_job_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'game_analysis' AND column_name = 'sync_job_id') THEN
        ALTER TABLE game_analysis ADD COLUMN sync_job_id UUID REFERENCES sync_jobs(id) ON DELETE SET NULL;
        COMMENT ON COLUMN game_analysis.sync_job_id IS 'Reference to the sync job that imported this game';
    END IF;
    
    -- Add pgn column if it doesn't exist (for storing full game notation)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'game_analysis' AND column_name = 'pgn') THEN
        ALTER TABLE game_analysis ADD COLUMN pgn TEXT;
        COMMENT ON COLUMN game_analysis.pgn IS 'Full PGN notation of the game';
    END IF;
    
    -- Add key_moments column if it doesn't exist (for storing analyzed moments)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'game_analysis' AND column_name = 'key_moments') THEN
        ALTER TABLE game_analysis ADD COLUMN key_moments JSONB;
        COMMENT ON COLUMN game_analysis.key_moments IS 'JSON array of analyzed key moments in the game';
    END IF;
    
    RAISE NOTICE 'Successfully added new columns to game_analysis table';
END $$;

-- Create unique constraint to prevent duplicate game analysis
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_analysis_unique_game 
ON game_analysis(user_id, game_url) WHERE game_url IS NOT NULL;

-- Add indices for game analysis lookups
CREATE INDEX IF NOT EXISTS idx_game_analysis_platform ON game_analysis(platform);
CREATE INDEX IF NOT EXISTS idx_game_analysis_sync_job_id ON game_analysis(sync_job_id);
CREATE INDEX IF NOT EXISTS idx_game_analysis_game_url ON game_analysis(game_url);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Auto-update trigger for sync_jobs
DROP TRIGGER IF EXISTS update_sync_jobs_updated_at ON sync_jobs;
CREATE TRIGGER update_sync_jobs_updated_at 
    BEFORE UPDATE ON sync_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for sync_jobs
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync_jobs
-- Users can only see/modify their own sync jobs
CREATE POLICY "Users can view own sync jobs" ON sync_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync jobs" ON sync_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync jobs" ON sync_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role permissions (for backend operations)
GRANT ALL ON sync_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE ON sync_jobs TO authenticated;

-- Update RLS policies for game_analysis table to include new columns
-- (Assuming you want users to only see their own game analyses)
DO $$
BEGIN
    -- Check if RLS is enabled on game_analysis
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'game_analysis' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        -- RLS is already enabled, policies might exist
        RAISE NOTICE 'RLS already enabled on game_analysis table';
    ELSE
        -- Enable RLS and create basic policies
        ALTER TABLE game_analysis ENABLE ROW LEVEL SECURITY;
        
        -- Create policies if they don't exist
        CREATE POLICY "Users can view own game analysis" ON game_analysis
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can insert own game analysis" ON game_analysis
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Users can update own game analysis" ON game_analysis
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Grant permissions for game_analysis
GRANT ALL ON game_analysis TO service_role;
GRANT SELECT, INSERT, UPDATE ON game_analysis TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE sync_jobs IS 'Tracks background sync jobs from chess platforms (chess.com, lichess)';
COMMENT ON COLUMN sync_jobs.platform IS 'Chess platform: chess.com or lichess';
COMMENT ON COLUMN sync_jobs.status IS 'Current status: pending, fetching, analyzing, completed, failed';
COMMENT ON COLUMN sync_jobs.games_found IS 'Total number of games found from platform';
COMMENT ON COLUMN sync_jobs.games_analyzed IS 'Number of games successfully analyzed';
COMMENT ON COLUMN sync_jobs.months_requested IS 'Number of months of games requested for sync';

-- Verify the migration worked
SELECT 
    'Migration completed successfully!' AS status,
    COUNT(*) AS sync_jobs_count 
FROM sync_jobs;

-- Show the updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sync_jobs' 
ORDER BY ordinal_position;

-- Show new columns added to game_analysis
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'game_analysis' 
AND column_name IN ('platform', 'game_url', 'sync_job_id', 'pgn', 'key_moments')
ORDER BY column_name; 