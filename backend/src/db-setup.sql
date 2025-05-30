-- Function to create a test table
CREATE OR REPLACE FUNCTION create_test_table(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', table_name);
END;
$$;

-- Function to drop a test table
CREATE OR REPLACE FUNCTION drop_test_table(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('DROP TABLE IF EXISTS %I', table_name);
END;
$$; 