/**
 * Check Database Tables and Schemas
 * Comprehensive check of what tables exist and their schemas
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabaseTables() {
  console.log('🔍 Checking Database Tables and Schemas');
  console.log('======================================\n');

  // Tables that the code expects to exist based on error messages
  const expectedTables = [
    'users', 
    'teams', 
    'team_members', 
    'activities', 
    'payments', 
    'workouts',  // This is causing the start_time error
    'leaderboards'
  ];

  for (const table of expectedTables) {
    console.log(`\n📋 Checking table: ${table}`);
    console.log('-'.repeat(30));
    
    try {
      // Try to get table info by querying it
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ Table "${table}" does NOT exist`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`⚠️  Table "${table}" exists but has issues:`);
          console.log(`   Error: ${error.message}`);
          console.log(`   Code: ${error.code}`);
        }
      } else {
        console.log(`✅ Table "${table}" EXISTS`);
        console.log(`   Sample records: ${data?.length || 0}`);
        
        // If there's data, show the column structure
        if (data && data.length > 0) {
          console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`💥 Error checking "${table}": ${err.message}`);
    }
  }

  // Specific check for teams table difficulty_level issue
  console.log('\n📊 Specific Teams Table Schema Check:');
  console.log('------------------------------------');
  
  try {
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .limit(1);
    
    if (teamsError) {
      console.log(`❌ Teams table error: ${teamsError.message}`);
    } else if (teamsData && teamsData.length > 0) {
      const teamColumns = Object.keys(teamsData[0]);
      console.log('✅ Teams table columns:', teamColumns);
      
      if (teamColumns.includes('difficulty_level')) {
        console.log('✅ difficulty_level column EXISTS in teams table');
      } else {
        console.log('❌ difficulty_level column MISSING from teams table');
        console.log('   Available columns:', teamColumns.join(', '));
      }
    } else {
      console.log('ℹ️  Teams table exists but is empty');
    }
  } catch (err) {
    console.log(`💥 Teams table check failed: ${err.message}`);
  }

  // Check the stored procedure with actual team creation
  console.log('\n⚙️ Testing Stored Procedure with Current Schema:');
  console.log('-----------------------------------------------');
  
  try {
    const testResult = await supabase.rpc('create_team_with_captain', {
      p_team_name: 'Schema Test Team',
      p_team_about: 'Testing what columns actually exist',
      p_captain_id: 'de0a8249-9e18-4f2c-9daa-7515dbe2cb3b',
      p_captain_name: 'Hustle',
      p_difficulty: 'intermediate',
      p_prize_pool: 1000
    });

    if (testResult.error) {
      console.log(`❌ Stored procedure error: ${testResult.error.message}`);
      
      // Check if it's the difficulty_level error
      if (testResult.error.message.includes('difficulty_level')) {
        console.log('🚨 ISSUE: difficulty_level column or type does not exist');
      }
      
      // Check if it's the foreign key error
      if (testResult.error.message.includes('not present in table')) {
        console.log('🚨 ISSUE: Foreign key constraint failure');
      }
    } else {
      console.log('✅ Stored procedure executed successfully');
      console.log('   Result:', testResult.data);
      
      // Clean up test team
      if (testResult.data?.success && testResult.data?.team_id) {
        await supabase.from('teams').delete().eq('id', testResult.data.team_id);
        console.log('🧹 Test team cleaned up');
      }
    }
  } catch (err) {
    console.log(`💥 Stored procedure test failed: ${err.message}`);
  }

  console.log('\n🏁 Database schema check complete!');
}

// Run the check
if (require.main === module) {
  checkDatabaseTables().catch(console.error);
}

module.exports = { checkDatabaseTables };