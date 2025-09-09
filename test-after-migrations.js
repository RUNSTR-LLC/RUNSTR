/**
 * Test Script: Run AFTER deploying migrations
 * Verifies that database migrations deployed successfully
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jqxiswmdbukfokyvumcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeGlzd21kYnVrZm9reXZ1bWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDgwODgsImV4cCI6MjA3MjUyNDA4OH0.zAeS3XlYk8BtLFLPoWbjyypPgVK4jJM7b-JfR4fCZkk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testMigrations() {
  console.log('🧪 Testing Database After Migrations...\n');

  // Test 1: Verify payments table exists and has correct structure
  console.log('1️⃣ Testing payments table...');
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Payments table error:', error.message);
    } else {
      console.log('✅ Payments table exists');
      
      // Test expected columns
      const expectedColumns = ['id', 'from_user_id', 'to_user_id', 'amount_sats', 'transaction_type', 'status'];
      if (data.length === 0) {
        console.log('   📝 Table is empty (expected)');
      } else {
        const actualColumns = Object.keys(data[0]);
        const missingCols = expectedColumns.filter(col => !actualColumns.includes(col));
        if (missingCols.length === 0) {
          console.log('   ✅ All required columns present');
        } else {
          console.log('   ⚠️ Missing columns:', missingCols.join(', '));
        }
      }
    }
  } catch (err) {
    console.log('❌ Payments test failed:', err.message);
  }

  // Test 2: Verify leaderboards table exists
  console.log('\n2️⃣ Testing leaderboards table...');
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Leaderboards table error:', error.message);
    } else {
      console.log('✅ Leaderboards table exists');
      
      if (data.length === 0) {
        console.log('   📝 Table is empty (expected until workouts are added)');
      } else {
        console.log(`   📊 Found ${data.length} leaderboard entries`);
        console.log(`   Sample entry: Team ${data[0].team_id}, Rank ${data[0].rank}, Distance ${data[0].total_distance}m`);
      }
    }
  } catch (err) {
    console.log('❌ Leaderboards test failed:', err.message);
  }

  // Test 3: Check if leaderboard function exists
  console.log('\n3️⃣ Testing leaderboard calculation function...');
  try {
    // Try to call the function (it should work even with empty data)
    const { data, error } = await supabase.rpc('recalculate_team_leaderboard', {
      target_team_id: '148067d4-f822-4c74-b563-61b2b4d98b9e', // Bitcoin Runners team ID from audit
      target_period: 'weekly'
    });
    
    if (error) {
      console.log('❌ Leaderboard function error:', error.message);
    } else {
      console.log('✅ Leaderboard calculation function works');
    }
  } catch (err) {
    console.log('❌ Function test failed:', err.message);
  }

  // Test 4: Verify team discovery query now works with activities
  console.log('\n4️⃣ Testing team discovery with activities...');
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        member_count,
        activities(
          id,
          title,
          activity_type,
          prize_amount,
          status
        )
      `)
      .eq('is_active', true)
      .limit(2);
    
    if (error) {
      console.log('❌ Team discovery error:', error.message);
      console.log('   💡 This means TeamService needs updating to use "activities" not "team_activities"');
    } else {
      console.log('✅ Team discovery query works');
      data.forEach(team => {
        console.log(`   - ${team.name}: ${team.activities?.length || 0} activities`);
        if (team.activities && team.activities.length > 0) {
          team.activities.forEach(activity => {
            console.log(`     • ${activity.title} (${activity.activity_type}, ${activity.prize_amount} sats)`);
          });
        }
      });
    }
  } catch (err) {
    console.log('❌ Team discovery test failed:', err.message);
  }

  // Test 5: Check sample data if it was created
  console.log('\n5️⃣ Checking for sample data...');
  try {
    const { data: memberships } = await supabase
      .from('team_members')
      .select('*')
      .limit(5);
    
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .limit(5);
      
    const { data: workouts } = await supabase
      .from('workouts')
      .select('*')
      .limit(5);

    console.log(`   Team memberships: ${memberships?.length || 0}`);
    console.log(`   Activities: ${activities?.length || 0}`);
    console.log(`   Workouts: ${workouts?.length || 0}`);
    
    if ((memberships?.length || 0) > 0) {
      console.log('✅ Sample data was created');
    } else {
      console.log('📝 No sample data (production-ready state)');
    }
  } catch (err) {
    console.log('❌ Sample data check failed:', err.message);
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('===============');
  console.log('1. If all tests pass: Database is production ready! 🎉');
  console.log('2. Update TeamService.ts to use "activities" instead of "team_activities"');
  console.log('3. Test team joining flow in the app');
  console.log('4. Connect HealthKit to populate workouts table');
  console.log('5. Test payment distribution with real CoinOS integration');
}

testMigrations().then(() => {
  console.log('\n✅ Migration testing completed!');
  process.exit(0);
}).catch(console.error);