/**
 * Test Team Creation After Fix
 * Verifies that team creation works after applying the stored procedure fix
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testTeamCreation() {
  console.log('🧪 Testing Team Creation After Fix');
  console.log('==================================\n');

  try {
    // Use the actual user ID from your database
    const captainId = 'de0a8249-9e18-4f2c-9daa-7515dbe2cb3b';
    
    console.log(`👤 Testing with captain ID: ${captainId}`);
    
    // Test team creation
    const { data: result, error } = await supabase.rpc('create_team_with_captain', {
      p_team_name: 'My Awesome Team',
      p_team_about: 'A test team to verify the npub constraint fix is working properly',
      p_captain_id: captainId,
      p_captain_name: 'Hustle',
      p_difficulty: 'intermediate',
      p_prize_pool: 5000
    });

    if (error) {
      console.log('❌ Team creation FAILED:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
      
      if (error.message.includes('npub') && error.message.includes('not-null')) {
        console.log('\n🚨 The stored procedure still needs to be fixed!');
        console.log('   Make sure you executed the fix-stored-procedure.sql in Supabase');
      }
      
      return false;
    }

    console.log('📊 Function result:', result);
    
    if (result.success) {
      console.log('✅ TEAM CREATION SUCCESSFUL!');
      console.log(`   Team ID: ${result.team_id}`);
      console.log(`   Message: ${result.message}`);
      
      // Verify the team was actually created
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', result.team_id)
        .single();
      
      if (teamError) {
        console.log('⚠️  Warning: Could not verify team creation');
      } else {
        console.log('✅ Team verified in database:');
        console.log(`   Name: ${team.name}`);
        console.log(`   Captain: ${team.captain_id}`);
        console.log(`   Prize Pool: ${team.prize_pool} sats`);
      }
      
      // Check team membership
      const { data: membership } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', result.team_id);
      
      console.log(`✅ Team membership records: ${membership?.length || 0}`);
      
      return true;
    } else {
      console.log('❌ Team creation returned failure:');
      console.log(`   Error: ${result.error}`);
      console.log(`   Message: ${result.message}`);
      return false;
    }

  } catch (error) {
    console.error('💥 Test failed with exception:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testTeamCreation().then(success => {
    if (success) {
      console.log('\n🎉 SUCCESS! Your team creation is now working!');
      console.log('🚀 Try creating a team in your app now.');
    } else {
      console.log('\n❌ Team creation is still not working.');
      console.log('📋 Make sure you applied the stored procedure fix first.');
    }
  }).catch(console.error);
}

module.exports = { testTeamCreation };