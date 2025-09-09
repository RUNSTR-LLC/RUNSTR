/**
 * Apply Stored Procedure Fix
 * Updates the create_team_with_captain function to handle npub properly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function applyStoredProcedureFix() {
  console.log('🔧 Applying Stored Procedure Fix');
  console.log('=================================\n');

  try {
    // 1. Read the fixed SQL
    console.log('📖 Reading fixed stored procedure...');
    const fixedSQL = fs.readFileSync('./fix-stored-procedure.sql', 'utf8');
    console.log('✅ SQL file loaded');

    // 2. Apply the fix by executing the SQL
    console.log('\n⚙️ Executing stored procedure update...');
    
    // Note: We need to execute this as raw SQL, but Supabase client doesn't directly support DDL
    // Instead, let's test if we can call an updated version
    
    console.log('📝 Manual step required:');
    console.log('1. Copy the contents of fix-stored-procedure.sql');
    console.log('2. Go to your Supabase dashboard > SQL Editor');
    console.log('3. Paste and execute the SQL to update the function');
    console.log('\nAlternatively, testing current function behavior...\n');

    // 3. Test the current function with the problematic user
    console.log('🧪 Testing current stored procedure...');
    
    const testResult = await supabase.rpc('create_team_with_captain', {
      p_team_name: 'Fix Test Team',
      p_team_about: 'Testing the npub fix for stored procedure',
      p_captain_id: 'de0a8249-9e18-4f2c-9daa-7515dbe2cb3b',
      p_captain_name: 'Hustle',
      p_difficulty: 'intermediate',
      p_prize_pool: 2500
    });

    if (testResult.error) {
      console.log(`❌ Function still has issues: ${testResult.error.message}`);
      console.log('\n🚨 CRITICAL: The stored procedure needs to be updated manually');
      console.log('\nThe issue is in line 22-23 of the current function:');
      console.log('   INSERT INTO users (id, name, role, created_at, updated_at)');
      console.log('\nThis is missing the npub field, which has a NOT NULL constraint.');
      console.log('\nFixed version includes:');
      console.log('   INSERT INTO users (id, name, npub, role, created_at, updated_at)');
      console.log('   VALUES (p_captain_id, p_captain_name, \'placeholder_\' || p_captain_id::TEXT, \'captain\', NOW(), NOW())');
      
      return {
        success: false,
        issue: 'stored_procedure_needs_manual_update',
        fixFile: 'fix-stored-procedure.sql'
      };
    } else {
      console.log('✅ Stored procedure working correctly!');
      console.log('Result:', testResult.data);
      
      // Clean up test team if successful
      if (testResult.data?.success && testResult.data?.team_id) {
        console.log('🧹 Cleaning up test team...');
        await supabase
          .from('teams')
          .delete()
          .eq('id', testResult.data.team_id);
        console.log('✅ Test team cleaned up');
      }
      
      return {
        success: true,
        result: testResult.data
      };
    }

  } catch (error) {
    console.error('💥 Fix application failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the fix
if (require.main === module) {
  applyStoredProcedureFix().then(result => {
    if (!result.success) {
      console.log('\n📋 MANUAL FIX REQUIRED:');
      console.log('1. Open Supabase Dashboard');
      console.log('2. Go to SQL Editor');
      console.log('3. Execute the contents of fix-stored-procedure.sql');
      console.log('4. Run this script again to test');
    } else {
      console.log('\n🎉 Team creation should now work!');
      console.log('Try creating a team in your app now.');
    }
  }).catch(console.error);
}

module.exports = { applyStoredProcedureFix };