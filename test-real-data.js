/**
 * Test Real Data Operations
 * Check what actually works vs needs fixing
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jqxiswmdbukfokyvumcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeGlzd21kYnVrZm9reXZ1bWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDgwODgsImV4cCI6MjA3MjUyNDA4OH0.zAeS3XlYk8BtLFLPoWbjyypPgVK4jJM7b-JfR4fCZkk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRealData() {
  console.log('🔍 Testing Real Data vs Mock Data...\n');

  // Test 1: Check existing users
  console.log('1️⃣ Testing Users Table...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(5);
  
  if (usersError) {
    console.log('❌ Users error:', usersError.message);
  } else {
    console.log(`✅ Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.role || 'no role'}) - ${user.npub.substring(0, 20)}...`);
    });
  }
  
  // Test 2: Check teams with real structure
  console.log('\n2️⃣ Testing Teams Table...');
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .limit(5);
  
  if (teamsError) {
    console.log('❌ Teams error:', teamsError.message);
  } else {
    console.log(`✅ Found ${teams.length} teams:`);
    teams.forEach(team => {
      console.log(`   - ${team.name}: ${team.member_count} members, ${team.prize_pool} sats`);
      console.log(`     Difficulty: ${team.difficulty_level}, Featured: ${team.is_featured}`);
    });
  }

  // Test 3: Check activities (the correct table name)
  console.log('\n3️⃣ Testing Team Activities Table...');
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('*')
    .limit(5);
  
  if (activitiesError) {
    console.log('❌ Activities error:', activitiesError.message);
  } else {
    console.log(`✅ Found ${activities.length} activities:`);
    activities.forEach(activity => {
      console.log(`   - ${activity.title} (${activity.activity_type}) - ${activity.prize_amount} sats`);
    });
  }

  // Test 4: Try the actual team discovery query from the app
  console.log('\n4️⃣ Testing Team Discovery Query (from app code)...');
  const { data: discoveryData, error: discoveryError } = await supabase
    .from('teams')
    .select(`
      *,
      activities(
        id,
        activity_type,
        title,
        description,
        prize_amount,
        participant_count,
        status,
        created_at,
        is_highlighted
      ),
      team_payouts(
        amount_sats,
        paid_at,
        description
      )
    `)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('member_count', { ascending: false })
    .limit(3);
  
  if (discoveryError) {
    console.log('❌ Discovery query failed:', discoveryError.message);
  } else {
    console.log(`✅ Team discovery works! Found ${discoveryData.length} teams`);
    discoveryData.forEach(team => {
      console.log(`   - ${team.name}: ${team.activities?.length || 0} activities, ${team.team_payouts?.length || 0} payouts`);
    });
  }

  // Test 5: Check workouts table
  console.log('\n5️⃣ Testing Workouts Table...');
  const { data: workouts, error: workoutsError } = await supabase
    .from('workouts')
    .select('*')
    .limit(3);
  
  if (workoutsError) {
    console.log('❌ Workouts error:', workoutsError.message);
  } else {
    console.log(`✅ Found ${workouts.length} workouts`);
    if (workouts.length === 0) {
      console.log('   📝 Note: No workout data - HealthKit integration needed');
    }
  }

  // Test 6: Test team joining capability
  console.log('\n6️⃣ Testing Team Membership...');
  const { data: memberships, error: membershipsError } = await supabase
    .from('team_members')
    .select('*')
    .limit(3);
  
  if (membershipsError) {
    console.log('❌ Memberships error:', membershipsError.message);
  } else {
    console.log(`✅ Found ${memberships.length} memberships`);
    if (memberships.length === 0) {
      console.log('   📝 Note: No members joined yet - join flow needs testing');
    }
  }
}

testRealData().then(() => {
  console.log('\n✅ Real data analysis completed!');
  process.exit(0);
}).catch(console.error);