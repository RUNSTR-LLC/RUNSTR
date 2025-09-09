/**
 * Debug script to check user database consistency
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jdkpydfxbimvahynycxo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impka3B5ZGZ4YmltdmFoeW55Y3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5MjA2ODAsImV4cCI6MjA0MDQ5NjY4MH0.XvdAM8KgeTzfVevvk3aVxdWGGIZNRF1PH5TLb0sj6yM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserDatabase() {
  console.log('🔍 Debugging user database state...\n');

  // Check all users in database
  console.log('--- Users in database ---');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, npub, role, created_at')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    console.log('Found users:', users?.length || 0);
    users?.forEach(user => {
      console.log(`- ID: ${user.id}, Name: ${user.name}, Role: ${user.role || 'null'}`);
      console.log(`  NPub: ${user.npub?.substring(0, 20)}...`);
      console.log('');
    });
  }

  // Check specific problematic user ID
  const problematicId = 'de0a8249-9e18-4f2c-9daa-7515dbe2cb3b';
  console.log(`--- Checking specific user ID: ${problematicId} ---`);
  
  const { data: specificUser, error: specificError } = await supabase
    .from('users')
    .select('*')
    .eq('id', problematicId)
    .single();

  if (specificError) {
    console.log('❌ User not found in database:', specificError.message);
  } else {
    console.log('✅ Found user:', specificUser);
  }

  // Check auth users (if accessible)
  console.log('\n--- Checking Supabase Auth users ---');
  try {
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('No active auth session');
    } else {
      console.log('Current auth user:', authUser?.user?.id);
    }
  } catch (error) {
    console.log('Cannot check auth users directly');
  }

  // Check teams table
  console.log('\n--- Teams table ---');
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, captain_id')
    .limit(5);

  if (teamsError) {
    console.error('Error fetching teams:', teamsError);
  } else {
    console.log('Found teams:', teams?.length || 0);
    teams?.forEach(team => {
      console.log(`- Team: ${team.name}, Captain ID: ${team.captain_id}`);
    });
  }
}

debugUserDatabase()
  .then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });