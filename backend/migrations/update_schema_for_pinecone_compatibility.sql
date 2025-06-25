-- Migration: Update schema for Pinecone compatibility
-- This migration adds columns to the game_analysis table to store additional metadata
-- required for Pinecone vector database compatibility

-- Add new columns to game_analysis table
ALTER TABLE game_analysis 
ADD COLUMN IF NOT EXISTS white_username VARCHAR,
ADD COLUMN IF NOT EXISTS black_username VARCHAR,
ADD COLUMN IF NOT EXISTS white_rating INTEGER,
ADD COLUMN IF NOT EXISTS black_rating INTEGER,
ADD COLUMN IF NOT EXISTS user_color VARCHAR CHECK (user_color IN ('white', 'black')),
ADD COLUMN IF NOT EXISTS result VARCHAR CHECK (result IN ('1-0', '0-1', '1/2-1/2')),
ADD COLUMN IF NOT EXISTS time_control VARCHAR,
ADD COLUMN IF NOT EXISTS game_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS opening_name VARCHAR,
ADD COLUMN IF NOT EXISTS eco_code VARCHAR,
ADD COLUMN IF NOT EXISTS avg_accuracy FLOAT,
ADD COLUMN IF NOT EXISTS total_moves INTEGER,
ADD COLUMN IF NOT EXISTS blunders_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mistakes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS inaccuracies_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pinecone_uploaded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinecone_vector_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Add new columns to recommendations table
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS skill_category VARCHAR,
ADD COLUMN IF NOT EXISTS sub_skill VARCHAR,
ADD COLUMN IF NOT EXISTS phase VARCHAR,
ADD COLUMN IF NOT EXISTS confidence FLOAT,
ADD COLUMN IF NOT EXISTS position_fen TEXT,
ADD COLUMN IF NOT EXISTS move VARCHAR,
ADD COLUMN IF NOT EXISTS accuracy_class VARCHAR,
ADD COLUMN IF NOT EXISTS delta_cp FLOAT;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_game_analysis_platform ON game_analysis(platform);
CREATE INDEX IF NOT EXISTS idx_game_analysis_user_color ON game_analysis(user_color);
CREATE INDEX IF NOT EXISTS idx_game_analysis_pinecone_uploaded ON game_analysis(pinecone_uploaded);
CREATE INDEX IF NOT EXISTS idx_recommendations_skill_category ON recommendations(skill_category);

-- Create function to automatically update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for game_analysis table (if not exists)
DROP TRIGGER IF EXISTS update_game_analysis_updated_at ON game_analysis;
CREATE TRIGGER update_game_analysis_updated_at BEFORE UPDATE ON game_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to have updated_at as current timestamp
UPDATE game_analysis SET updated_at = created_at WHERE updated_at IS NULL; 