require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  try {
    console.log('Testing users table functionality...');

    // 1. Insert a test user
    const testUser = {
      id: uuidv4(),
      username: 'testuser123',
      email: 'testuser123@example.com',
      rating: 1500,
      playstyle: 'casual',
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('users')
      .insert([testUser]);

    if (insertError) {
      console.error('Error inserting test user:', insertError.message);
      return;
    }
    console.log('✓ Test user inserted successfully');

    // 2. Query the test user
    const { data, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUser.id);

    if (queryError) {
      console.error('Error querying test user:', queryError.message);
      return;
    }
    console.log('✓ Test user queried successfully');
    console.log('Retrieved user:', data);

    // 3. Clean up - delete the test user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', testUser.id);

    if (deleteError) {
      console.error('Error cleaning up test user:', deleteError.message);
      return;
    }
    console.log('✓ Test user cleaned up successfully');

    console.log('\nAll users table operations completed successfully!');
    console.log('PostgreSQL users table via Supabase is fully functional.');

  } catch (err) {
    console.error('Unexpected error during users table test:', err.message);
  }
}

testDatabase(); 