/**
 * Test Team Membership Creation
 * Debug why team membership records are not being created
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testMembershipCreation() {
  console.log('👥 Testing Team Membership Creation');
  console.log('==================================\n');

  const captainId = '6da92af7-284b-4465-aef2-59ed6c824163';
  const teamId = 'a076d672-f015-4e5f-9288-02b76716329e'; // From previous test

  try {
    console.log('🔍 Step 1: Testing direct membership insert...');
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .insert({
        user_id: captainId,
        team_id: teamId,
        role: 'captain',
        joined_at: new Date().toISOString(),
        is_active: true,
        total_workouts: 0,
        total_distance_meters: 0,
      })
      .select('*');

    if (memberError) {
      console.log('❌ Membership creation FAILED:', memberError.message);
      console.log('   Code:', memberError.code);
      console.log('   Details:', memberError.details);
      
      if (memberError.code === '23503') {
        console.log('\n🚨 FOREIGN KEY CONSTRAINT VIOLATION:');
        console.log('   The team_members table FK constraints are still blocked!');
        console.log('   This is the same RLS issue we had with teams table');
      }
      
      return false;
    }

    console.log('✅ Membership created successfully:', membership);
    return true;

  } catch (error) {
    console.error('💥 Membership test failed:', error.message);
    return false;
  }
}

// Run test
if (require.main === module) {
  testMembershipCreation().then(success => {
    if (success) {
      console.log('\n🎉 MEMBERSHIP CREATION WORKS!');
      console.log('The issue was fixed by the complete nuclear database fix.');
    } else {
      console.log('\n❌ MEMBERSHIP CREATION STILL FAILING');
      console.log('Need to apply the complete nuclear database fix to team_members table.');
    }
  }).catch(console.error);
}

module.exports = { testMembershipCreation };
