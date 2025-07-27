-- Migration: Add is_admin field to users table
-- This adds administrative access control for MCP endpoints

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Update existing users to have admin status (optional - you can set specific users as admin)
-- UPDATE users SET is_admin = TRUE WHERE email = 'admin@example.com'; 