/**
 * Test Complete Team Creation Fix
 * Tests all the fixes we've applied for team creation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testCompleteFix() {
  console.log('🧪 Testing Complete Team Creation Fix');
  console.log('=====================================\n');

  const captainId = 'de0a8249-9e18-4f2c-9daa-7515dbe2cb3b';

  try {
    // Test 1: Check current user state
    console.log('👤 Step 1: Checking current user state...');
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', captainId)
      .single();

    if (userError) {
      console.log(`❌ User check failed: ${userError.message}`);
      return;
    }

    console.log('✅ Current user state:');
    console.log(`   ID: ${currentUser.id}`);
    console.log(`   Name: ${currentUser.name}`);
    console.log(`   Role: ${currentUser.role}`);
    console.log(`   NPUB: ${currentUser.npub}`);

    // Test 2: Test team creation with the fixed procedure
    console.log('\n⚙️ Step 2: Testing team creation...');
    
    const { data: result, error } = await supabase.rpc('create_team_with_captain', {
      p_team_name: 'Ultimate Test Team',
      p_team_about: 'Testing all fixes for team creation including npub and difficulty_level',
      p_captain_id: captainId,
      p_captain_name: currentUser.name,
      p_difficulty: 'intermediate',
      p_prize_pool: 10000
    });

    if (error) {
      console.log('❌ Team creation FAILED:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      
      if (error.message.includes('difficulty_level')) {
        console.log('\n🚨 DIFFICULTY_LEVEL ISSUE:');
        console.log('   The difficulty_level enum type still needs to be created');
        console.log('   Run the fix-difficulty-enum.sql in Supabase Dashboard');
      }
      
      if (error.message.includes('not present in table')) {
        console.log('\n🚨 FOREIGN KEY ISSUE:');
        console.log('   Captain ID foreign key constraint is still failing');
        console.log('   This might be an RLS or auth issue');
      }
      
      return false;
    }

    console.log('📊 Function result:', result);

    if (result.success) {
      console.log('🎉 TEAM CREATION SUCCESSFUL!');
      console.log(`   Team ID: ${result.team_id}`);
      
      // Verify the team was created
      const { data: createdTeam } = await supabase
        .from('teams')
        .select('*')
        .eq('id', result.team_id)
        .single();
      
      if (createdTeam) {
        console.log('\n✅ Team verification:');
        console.log(`   Name: ${createdTeam.name}`);
        console.log(`   Captain: ${createdTeam.captain_id}`);
        console.log(`   Difficulty: ${createdTeam.difficulty_level}`);
        console.log(`   Prize Pool: ${createdTeam.prize_pool} sats`);
      }
      
      // Check team membership
      const { data: membership } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', result.team_id);
      
      console.log(`✅ Team membership records: ${membership?.length || 0}`);
      if (membership && membership.length > 0) {
        console.log(`   Captain membership: ${membership[0].role}`);
      }

      // Test 3: Test ProfileService fitness calculation (workouts table)
      console.log('\n🏃 Step 3: Testing ProfileService fitness calculation...');
      try {
        const { data: workouts, error: workoutsError } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', captainId)
          .limit(1);

        if (workoutsError) {
          if (workoutsError.code === '42703') {
            console.log('❌ ProfileService error confirmed: workouts.start_time column issue');
            console.log(`   Error: ${workoutsError.message}`);
          } else {
            console.log(`⚠️  Workouts query error: ${workoutsError.message}`);
          }
        } else {
          console.log('✅ ProfileService workouts query successful');
          console.log(`   Found ${workouts.length} workouts for user`);
        }
      } catch (err) {
        console.log(`💥 ProfileService test failed: ${err.message}`);
      }

      return true;
    } else {
      console.log('❌ Team creation returned failure:');
      console.log(`   Error: ${result.error}`);
      return false;
    }

  } catch (error) {
    console.error('💥 Test failed with exception:', error);
    return false;
  }
}

// Run the complete test
if (require.main === module) {
  testCompleteFix().then(success => {
    if (success) {
      console.log('\n🎊 ALL FIXES WORKING! Team creation is now functional!');
      console.log('🚀 Your app should be able to create teams successfully now.');
    } else {
      console.log('\n❌ Some issues remain. Check the errors above.');
      console.log('\n📋 MANUAL STEPS STILL NEEDED:');
      console.log('1. Execute fix-difficulty-enum.sql in Supabase Dashboard');
      console.log('2. Check for any remaining RLS policy issues');
      console.log('3. Verify workouts table schema if ProfileService errors persist');
    }
  }).catch(console.error);
}

module.exports = { testCompleteFix };