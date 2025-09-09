/**
 * Test Supabase Connection
 * Quick script to verify database connectivity and see what data exists
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jqxiswmdbukfokyvumcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeGlzd21kYnVrZm9reXZ1bWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDgwODgsImV4cCI6MjA3MjUyNDA4OH0.zAeS3XlYk8BtLFLPoWbjyypPgVK4jJM7b-JfR4fCZkk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  try {
    // Test 1: Check if we can connect
    console.log('1️⃣ Testing basic connectivity...');
    const { data, error } = await supabase.from('teams').select('count', { count: 'exact' });
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
      return;
    }
    console.log('✅ Connected successfully!');
    console.log(`📊 Teams table has ${data.length} records\n`);

    // Test 2: Check what tables exist and have data
    console.log('2️⃣ Checking table contents...\n');
    
    const tables = ['users', 'teams', 'team_members', 'workouts', 'activities'];
    
    for (const table of tables) {
      try {
        const { data: tableData, error: tableError, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(3);
        
        if (tableError) {
          console.log(`❌ ${table}: Error - ${tableError.message}`);
        } else {
          console.log(`✅ ${table}: ${count || 0} records`);
          if (tableData && tableData.length > 0) {
            console.log(`   Sample: ${JSON.stringify(tableData[0], null, 2).substring(0, 200)}...`);
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
      console.log('');
    }

    // Test 3: Try team discovery query (what the app actually uses)
    console.log('3️⃣ Testing team discovery query...');
    const { data: discoveryData, error: discoveryError } = await supabase
      .from('teams')
      .select(`
        *,
        activities!inner(
          id,
          activity_type,
          title,
          description,
          prize_amount,
          participant_count,
          status,
          created_at,
          is_highlighted
        )
      `)
      .eq('is_active', true)
      .limit(2);
    
    if (discoveryError) {
      console.log('❌ Team discovery query failed:', discoveryError.message);
    } else {
      console.log('✅ Team discovery query works!');
      console.log(`📋 Found ${discoveryData?.length || 0} teams with activities`);
    }

    // Test 4: Check authentication
    console.log('\n4️⃣ Testing authentication...');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log('Auth status:', authError ? 'Not authenticated' : 'Has session');

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
  }
}

testConnection().then(() => {
  console.log('\n✅ Connection test completed!');
  process.exit(0);
}).catch(console.error);