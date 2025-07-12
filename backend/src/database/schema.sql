-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    rating INTEGER DEFAULT 1200,
    playstyle VARCHAR,
    chess_com_username VARCHAR,
    lichess_username VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create GameAnalysis table with enhanced schema for Pinecone compatibility
CREATE TABLE IF NOT EXISTS game_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_url VARCHAR NOT NULL,
    platform VARCHAR NOT NULL,
    game_id VARCHAR,
    pgn TEXT,
    
    -- Chess.com/Lichess specific fields
    white_username VARCHAR,
    black_username VARCHAR,
    white_rating INTEGER,
    black_rating INTEGER,
    user_color VARCHAR CHECK (user_color IN ('white', 'black')),
    result VARCHAR CHECK (result IN ('1-0', '0-1', '1/2-1/2')),
    time_control VARCHAR,
    game_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Opening information
    opening_name VARCHAR,
    eco_code VARCHAR,
    
    -- Analysis results
    key_moments JSONB,
    analysis TEXT,
    strengths TEXT,
    weaknesses TEXT,
    
    -- Average game metrics
    avg_accuracy FLOAT,
    total_moves INTEGER,
    blunders_count INTEGER DEFAULT 0,
    mistakes_count INTEGER DEFAULT 0,
    inaccuracies_count INTEGER DEFAULT 0,
    
    -- Processing metadata
    sync_job_id UUID,
    pinecone_uploaded BOOLEAN DEFAULT FALSE,
    pinecone_vector_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create Sync Jobs table
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

-- Create Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_analysis_id UUID REFERENCES game_analysis(id) ON DELETE CASCADE,
    recommendation TEXT,
    priority INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'pending',
    
    -- Enhanced recommendation metadata for better matching
    skill_category VARCHAR,
    sub_skill VARCHAR,
    phase VARCHAR,
    confidence FLOAT,
    position_fen TEXT,
    move VARCHAR,
    accuracy_class VARCHAR,
    delta_cp FLOAT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_game_analysis_user_id ON game_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_game_analysis_platform ON game_analysis(platform);
CREATE INDEX IF NOT EXISTS idx_game_analysis_user_color ON game_analysis(user_color);
CREATE INDEX IF NOT EXISTS idx_game_analysis_pinecone_uploaded ON game_analysis(pinecone_uploaded);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_game_analysis_id ON recommendations(game_analysis_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_skill_category ON recommendations(skill_category);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for game_analysis table
CREATE TRIGGER update_game_analysis_updated_at BEFORE UPDATE ON game_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 