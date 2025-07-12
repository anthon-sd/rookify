#!/usr/bin/env python3
"""
Run migration to add chess platform username fields to users table
"""

import os
from supabase import create_client, Client

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL and SUPABASE_KEY environment variables are required")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

# Migration SQL
migration_sql = """
-- Add chess platform username fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS chess_com_username VARCHAR,
ADD COLUMN IF NOT EXISTS lichess_username VARCHAR;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_chess_com_username ON users(chess_com_username);
CREATE INDEX IF NOT EXISTS idx_users_lichess_username ON users(lichess_username);
"""

def main():
    print("Running migration: add_chess_usernames_to_users")
    
    try:
        # Execute the migration
        result = supabase.rpc('exec_sql', {'sql': migration_sql})
        print("✅ Migration completed successfully!")
        print(f"Result: {result}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        
        # Try executing each statement individually
        statements = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS chess_com_username VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS lichess_username VARCHAR",
            "CREATE INDEX IF NOT EXISTS idx_users_chess_com_username ON users(chess_com_username)",
            "CREATE INDEX IF NOT EXISTS idx_users_lichess_username ON users(lichess_username)"
        ]
        
        for stmt in statements:
            try:
                print(f"Executing: {stmt}")
                result = supabase.rpc('exec_sql', {'sql': stmt})
                print(f"✅ Success: {stmt}")
            except Exception as stmt_error:
                print(f"❌ Failed: {stmt} - {stmt_error}")

if __name__ == "__main__":
    main() 