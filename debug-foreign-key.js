/**
 * Debug Foreign Key Constraint Issue
 * Investigate why teams.captain_id foreign key constraint is failing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugForeignKeyIssue() {
  console.log('🔍 Debug Foreign Key Constraint Issue');
  console.log('===================================\n');

  const captainId = '6da92af7-284b-4465-aef2-59ed6c824163';

  try {
    // Step 1: Verify user exists in users table
    console.log('👤 Step 1: Check user exists in users table...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, role, npub')
      .eq('id', captainId);

    if (userError) {
      console.log('❌ User query error:', userError.message);
      return;
    }

    console.log(`✅ User query returned ${user?.length || 0} records`);
    if (user && user.length > 0) {
      console.log('   User data:', user[0]);
    }

    // Step 2: Check teams table structure and constraints
    console.log('\n🏗️ Step 2: Check teams table foreign key constraints...');
    
    // Try to get table schema info
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_table_constraints', { table_name: 'teams' })
      .select();

    if (constraintError && !constraintError.message.includes('function get_table_constraints() does not exist')) {
      console.log('❌ Constraint query error:', constraintError.message);
    }

    // Step 3: Try direct insert to teams table (bypassing stored procedure)
    console.log('\n⚡ Step 3: Test direct team insert...');
    
    const teamData = {
      name: 'Direct Test Team',
      about: 'Testing direct insert to teams table', 
      captain_id: captainId,
      prize_pool: 5000,
      is_active: true,
      is_featured: false,
      member_count: 1
    };

    const { data: teamInsert, error: teamError } = await supabase
      .from('teams')
      .insert([teamData])
      .select();

    if (teamError) {
      console.log('❌ Direct team insert failed:', teamError.message);
      console.log('   Code:', teamError.code);
      console.log('   Details:', teamError.details);
      
      if (teamError.code === '23503') {
        console.log('\n🚨 FOREIGN KEY VIOLATION DETECTED:');
        console.log('   The captain_id exists in users table but FK constraint is still failing');
        console.log('   This suggests either:');
        console.log('   1. Row Level Security (RLS) is preventing the reference');
        console.log('   2. The FK constraint references wrong column/table');
        console.log('   3. User record is not actually committed to database');
      }
    } else {
      console.log('✅ Direct team insert SUCCESS:', teamInsert);
      
      // Clean up test team
      if (teamInsert && teamInsert.length > 0) {
        await supabase.from('teams').delete().eq('id', teamInsert[0].id);
        console.log('🧹 Test team cleaned up');
      }
    }

    // Step 4: Check if user was created in a transaction that wasn't committed
    console.log('\n🔄 Step 4: Verify user record is committed...');
    
    const { count, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('id', captainId);

    if (countError) {
      console.log('❌ Count query error:', countError.message);
    } else {
      console.log(`✅ User count query: ${count} records found`);
    }

  } catch (error) {
    console.error('💥 Debug failed:', error.message);
  }
}

// Run debug
if (require.main === module) {
  debugForeignKeyIssue().catch(console.error);
}

module.exports = { debugForeignKeyIssue };