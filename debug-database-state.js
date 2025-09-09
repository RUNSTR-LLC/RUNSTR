/**
 * Advanced database state debugging for Supabase inconsistency
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jdkpydfxbimvahynycxo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impka3B5ZGZ4YmltdmFoeW55Y3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5MjA2ODAsImV4cCI6MjA0MDQ5NjY4MH0.XvdAM8KgeTzfVevvk3aVxdWGGIZNRF1PH5TLb0sj6yM';

const problematicUserId = 'de0a8249-9e18-4f2c-9daa-7515dbe2cb3b';

async function debugDatabaseState() {
  console.log('🔍 ULTRA DEBUGGING: Database State Analysis');
  console.log('=' .repeat(60));
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Test 1: Check if user exists with different query methods
  console.log('\n📊 TEST 1: User Existence Check');
  console.log(`Target User ID: ${problematicUserId}`);
  
  try {
    // Method 1: Single user query
    const { data: user1, error: error1 } = await supabase
      .from('users')
      .select('*')
      .eq('id', problematicUserId)
      .single();
    
    console.log('Method 1 - Single query:', error1 ? `❌ ${error1.message}` : `✅ Found: ${user1.name}`);

    // Method 2: Count query
    const { count, error: error2 } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('id', problematicUserId);
    
    console.log('Method 2 - Count query:', error2 ? `❌ ${error2.message}` : `Count: ${count}`);

    // Method 3: All users with limit
    const { data: allUsers, error: error3 } = await supabase
      .from('users')
      .select('id, name')
      .limit(10);
    
    if (!error3) {
      console.log('Method 3 - All users:');
      allUsers?.forEach(u => {
        const isTarget = u.id === problematicUserId;
        console.log(`  ${isTarget ? '🎯' : '📄'} ${u.id} - ${u.name}`);
      });
    }

  } catch (error) {
    console.error('❌ User existence check failed:', error.message);
  }

  // Test 2: Check teams table structure and constraints
  console.log('\n📊 TEST 2: Teams Table Structure');
  try {
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .limit(3);
    
    if (!teamsError) {
      console.log('✅ Teams table accessible');
      console.log('Sample teams:', teams?.map(t => ({ id: t.id, name: t.name, captain_id: t.captain_id })));
    } else {
      console.log('❌ Teams table error:', teamsError.message);
    }
  } catch (error) {
    console.error('❌ Teams table check failed:', error.message);
  }

  // Test 3: Try to create a team with a known good user ID
  console.log('\n📊 TEST 3: Foreign Key Constraint Test');
  try {
    // First, try to insert a dummy team with the problematic user ID
    const { data: testTeam, error: testError } = await supabase
      .from('teams')
      .insert({
        name: 'DEBUG_TEST_TEAM_DELETE_ME',
        about: 'Test team for debugging',
        captain_id: problematicUserId,
        difficulty_level: 'intermediate',
        prize_pool: 0,
        is_active: true,
        is_featured: false,
        member_count: 1,
      })
      .select('id')
      .single();

    if (!testError) {
      console.log('✅ Test team creation SUCCESS:', testTeam.id);
      // Clean up - delete the test team
      await supabase.from('teams').delete().eq('id', testTeam.id);
      console.log('🗑️ Test team cleaned up');
    } else {
      console.log('❌ Test team creation FAILED:', testError.message);
      console.log('Error details:', testError);
    }
  } catch (error) {
    console.error('❌ Foreign key test failed:', error.message);
  }

  // Test 4: Check RLS policies
  console.log('\n📊 TEST 4: Authentication State');
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session status:', session ? '✅ Authenticated' : '❌ Not authenticated');
    if (sessionError) {
      console.log('Session error:', sessionError.message);
    }
  } catch (error) {
    console.error('❌ Session check failed:', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎯 ANALYSIS COMPLETE');
}

debugDatabaseState()
  .then(() => {
    console.log('✅ Debug script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Debug script failed:', error);
    process.exit(1);
  });