-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    rating INTEGER DEFAULT 1200,
    playstyle VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create GameAnalysis table
CREATE TABLE IF NOT EXISTS game_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_url VARCHAR NOT NULL,
    platform VARCHAR NOT NULL,
    pgn TEXT,
    key_moments JSONB,
    sync_job_id UUID,
    game_id VARCHAR,
    analysis TEXT,
    strengths TEXT,
    weaknesses TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_game_analysis_user_id ON game_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_game_analysis_id ON recommendations(game_analysis_id); 