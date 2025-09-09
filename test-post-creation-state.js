/**
 * Test Post-Creation State
 * Verifies user authentication state and team association after team creation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testPostCreationState() {
  console.log('🔍 Testing Post-Creation State');
  console.log('=============================\n');

  const captainId = '6da92af7-284b-4465-aef2-59ed6c824163';

  try {
    // Step 1: Check user's current_team_id
    console.log('👤 Step 1: Checking user current_team_id...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, role, current_team_id')
      .eq('id', captainId)
      .single();

    if (userError) {
      console.log('❌ User query failed:', userError.message);
      return false;
    }

    console.log('✅ User data:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   Current Team ID:', user.current_team_id);

    if (!user.current_team_id) {
      console.log('🚨 ISSUE: User has no current_team_id set!');
      console.log('   This explains why the app doesn\'t recognize them as team captain');
      return false;
    }

    // Step 2: Verify team membership exists
    console.log('\n👥 Step 2: Checking team membership...');
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', captainId)
      .eq('team_id', user.current_team_id);

    if (memberError) {
      console.log('❌ Membership query failed:', memberError.message);
      return false;
    }

    if (!membership || membership.length === 0) {
      console.log('🚨 ISSUE: No team membership record found!');
      console.log('   User has current_team_id but no membership record');
      return false;
    }

    console.log('✅ Team membership found:');
    console.log('   User ID:', membership[0].user_id);
    console.log('   Team ID:', membership[0].team_id);
    console.log('   Role:', membership[0].role);
    console.log('   Active:', membership[0].is_active);
    console.log('   Joined:', membership[0].joined_at);

    // Step 3: Verify team exists and captain_id matches
    console.log('\n🏗️ Step 3: Verifying team details...');
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', user.current_team_id)
      .single();

    if (teamError) {
      console.log('❌ Team query failed:', teamError.message);
      return false;
    }

    console.log('✅ Team verified:');
    console.log('   Team ID:', team.id);
    console.log('   Name:', team.name);
    console.log('   Captain ID:', team.captain_id);
    console.log('   Active:', team.is_active);

    if (team.captain_id !== captainId) {
      console.log('🚨 ISSUE: Team captain_id does not match user ID!');
      return false;
    }

    // Step 4: Check if this explains the navigation issues
    console.log('\n🔍 Step 4: Analyzing potential navigation issues...');
    
    const hasValidTeamState = (
      user.current_team_id && 
      membership.length > 0 && 
      membership[0].role === 'captain' &&
      membership[0].is_active &&
      team.captain_id === captainId
    );

    if (hasValidTeamState) {
      console.log('✅ User team state is VALID - should be able to access team dashboard');
      console.log('🤔 The issue might be in the frontend navigation logic');
    } else {
      console.log('❌ User team state is INVALID - this explains the navigation issues');
    }

    return hasValidTeamState;

  } catch (error) {
    console.error('💥 Post-creation state test failed:', error.message);
    return false;
  }
}

// Run test
if (require.main === module) {
  testPostCreationState().then(isValid => {
    if (isValid) {
      console.log('\n🎉 USER TEAM STATE IS VALID!');
      console.log('💡 The issue is likely in frontend navigation/authentication checking');
      console.log('🔧 Need to investigate:');
      console.log('   1. How the app checks if user is team captain');
      console.log('   2. Navigation logic after team creation wizard');
      console.log('   3. User session state synchronization');
    } else {
      console.log('\n❌ USER TEAM STATE IS BROKEN');
      console.log('🔧 Need to fix:');
      console.log('   1. Ensure current_team_id is set correctly');
      console.log('   2. Ensure team membership record exists');
      console.log('   3. Ensure all foreign key relationships are correct');
    }
  }).catch(console.error);
}

module.exports = { testPostCreationState };