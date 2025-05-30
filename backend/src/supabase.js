require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test the connection
async function testConnection() {
  try {
    // Simple health check
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error connecting to Supabase:', error.message);
      return;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Connection status:', data ? 'Authenticated' : 'Anonymous');
  } catch (err) {
    console.error('Failed to connect to Supabase:', err.message);
  }
}

testConnection();

module.exports = supabase; 