-- Migration: Add user memory and context tables for MCP
-- This creates a long-term memory store for personalized AI coaching

-- Create user_memory table for persistent context
CREATE TABLE IF NOT EXISTS user_memory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    memory_type VARCHAR NOT NULL DEFAULT 'profile',
    
    -- Core memory fields
    chess_level VARCHAR DEFAULT 'intermediate',
    rating_history JSONB DEFAULT '[]',
    playstyle_profile JSONB DEFAULT '{}',
    frequent_errors JSONB DEFAULT '[]',
    current_focus VARCHAR,
    
    -- Emotional intelligence fields
    emotional_profile JSONB DEFAULT '{}',
    frustration_tendency VARCHAR DEFAULT 'moderate',
    preferred_feedback_tone VARCHAR DEFAULT 'balanced',
    motivation_triggers JSONB DEFAULT '[]',
    
    -- Learning patterns
    learning_pace VARCHAR DEFAULT 'moderate',
    retention_patterns JSONB DEFAULT '{}',
    session_summaries JSONB DEFAULT '[]',
    breakthrough_moments JSONB DEFAULT '[]',
    
    -- Preferences
    ui_preferences JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    training_schedule JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create memory_snapshots for historical tracking
CREATE TABLE IF NOT EXISTS memory_snapshots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES user_memory(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    reason VARCHAR, -- 'milestone', 'breakthrough', 'periodic'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create session_context for short-term memory
CREATE TABLE IF NOT EXISTS session_context (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    context_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_type ON user_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_snapshots_user_id ON memory_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_session_context_user_id ON session_context(user_id);
CREATE INDEX IF NOT EXISTS idx_session_context_expires ON session_context(expires_at);

-- Trigger for updating timestamps
CREATE TRIGGER update_user_memory_updated_at BEFORE UPDATE ON user_memory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 