/**
 * Debug Post-Fixes Team Creation
 * Investigate why team creation still fails after applying SQL fixes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugPostFixes() {
  console.log('🔍 Debug Post-Fixes Analysis');
  console.log('===========================\n');

  const captainId = '6da92af7-284b-4465-aef2-59ed6c824163';

  try {
    // Step 1: Verify RLS status on critical tables
    console.log('🔒 Step 1: Check RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('check_rls_status')
      .select();

    if (rlsError && !rlsError.message.includes('does not exist')) {
      console.log('❌ RLS check failed:', rlsError.message);
    } else {
      console.log('ℹ️  RLS check function not available (expected)');
    }

    // Step 2: Test if user is visible to foreign key constraints
    console.log('👤 Step 2: Verify user visibility to FK constraints...');
    
    // Try to reference the user from another table context
    const { data: userFromSelect, error: selectError } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', captainId);

    if (selectError) {
      console.log('❌ User select failed:', selectError.message);
      return;
    }

    console.log('✅ User visible via select:', userFromSelect.length > 0);
    
    // Step 3: Check function status after fixes
    console.log('⚙️ Step 3: Verify function status...');
    const { data: functions, error: funcError } = await supabase
      .rpc('check_function_signatures')
      .select();

    if (funcError && !funcError.message.includes('does not exist')) {
      console.log('❌ Function check failed:', funcError.message);
    }

    // Step 4: Try minimal team insert to isolate the FK issue
    console.log('🏗️ Step 4: Test minimal team insert...');
    
    const { data: minimalTeam, error: minimalError } = await supabase
      .from('teams')
      .insert({
        name: 'FK Test Team',
        about: 'Testing FK constraint after fixes',
        captain_id: captainId,
        prize_pool: 1000,
        is_active: true,
        is_featured: false,
        member_count: 1
      })
      .select('id');

    if (minimalError) {
      console.log('❌ Minimal team insert STILL FAILING:', minimalError.message);
      console.log('   Code:', minimalError.code);
      console.log('   Details:', minimalError.details);
      
      if (minimalError.code === '23503') {
        console.log('\n🚨 FOREIGN KEY STILL BLOCKED:');
        console.log('   This means either:');
        console.log('   1. RLS policies were not properly disabled');
        console.log('   2. The foreign key constraint has a deeper issue');
        console.log('   3. The user record is in a different schema/context');
      }
    } else {
      console.log('✅ Minimal team insert SUCCESS:', minimalTeam);
      
      // Clean up test team
      if (minimalTeam && minimalTeam.length > 0) {
        await supabase.from('teams').delete().eq('id', minimalTeam[0].id);
        console.log('🧹 Test team cleaned up');
      }
    }

    // Step 5: Check if the issue is with the stored procedure vs direct insert
    console.log('\n🔄 Step 5: Test stored procedure specifically...');
    const { data: procResult, error: procError } = await supabase
      .rpc('create_team_with_captain', {
        p_team_name: 'Procedure Test Team',
        p_team_about: 'Testing procedure after fixes',
        p_captain_id: captainId,
        p_captain_name: 'TestCaptain',
        p_prize_pool: 2000
      });

    if (procError) {
      console.log('❌ Stored procedure still failing:', procError.message);
    } else {
      console.log('📊 Stored procedure result:', procResult);
      
      if (procResult && procResult.success && procResult.team_id) {
        // Clean up
        await supabase.from('teams').delete().eq('id', procResult.team_id);
        console.log('🧹 Procedure test team cleaned up');
      }
    }

  } catch (error) {
    console.error('💥 Debug analysis failed:', error.message);
  }
}

// Run debug
if (require.main === module) {
  debugPostFixes().catch(console.error);
}

module.exports = { debugPostFixes };