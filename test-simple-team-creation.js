/**
 * Test Simple Team Creation
 * Test the ultra-simplified team creation approach
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testSimpleTeamCreation() {
  console.log('🚀 Testing Simple Team Creation');
  console.log('===============================\n');

  const captainId = '6da92af7-284b-4465-aef2-59ed6c824163';
  const teamData = {
    name: 'Simple Test Team',
    about: 'Testing ultra-simple team creation approach',
    captainId: captainId,
    prizePool: 5000
  };

  try {
    // STEP 1: Ensure user exists with upsert (avoids FK issues)
    console.log('👤 Step 1: Upserting user...');
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: captainId,
        name: teamData.name.split(' ')[0] || 'Captain',
        npub: `simple_${captainId}`,
        role: 'captain',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      console.log('⚠️  User upsert had issue:', upsertError.message);
      console.log('   Continuing anyway - user might already exist');
    } else {
      console.log('✅ User upserted successfully');
    }

    // STEP 2: Create team directly (let FK work naturally)
    console.log('\n🏗️ Step 2: Creating team...');
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: teamData.name,
        about: teamData.about,
        captain_id: captainId,
        prize_pool: teamData.prizePool || 0,
        is_active: true,
        is_featured: false,
        member_count: 1,
      })
      .select('id')
      .single();

    if (teamError) {
      console.log('❌ Team creation FAILED:', teamError.message);
      console.log('   Code:', teamError.code);
      console.log('   Details:', teamError.details);
      return false;
    }

    const teamId = team.id;
    console.log('✅ Team created successfully:', teamId);

    console.log('\n🎉 SIMPLE TEAM CREATION SUCCESS!');
    return true;

  } catch (error) {
    console.error('💥 Simple team creation failed:', error.message);
    return false;
  }
}

// Run test
if (require.main === module) {
  testSimpleTeamCreation().then(success => {
    if (success) {
      console.log('\n🎊 SIMPLE APPROACH WORKS!');
      console.log('Your app should now be able to create teams successfully.');
    } else {
      console.log('\n❌ Simple approach also failed.');
      console.log('There may be deeper database configuration issues.');
    }
  }).catch(console.error);
}

module.exports = { testSimpleTeamCreation };
