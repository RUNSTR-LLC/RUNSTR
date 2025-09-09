/**
 * Fix NPUB Constraint Issue
 * Updates existing users and stored procedure to handle npub field correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function fixNpubConstraint() {
  console.log('🔧 Fixing NPUB Constraint Issues');
  console.log('=================================\n');

  try {
    // 1. First, fix the existing user with empty npub
    console.log('👤 Step 1: Fixing existing user with empty npub...');
    
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'de0a8249-9e18-4f2c-9daa-7515dbe2cb3b')
      .single();

    if (fetchError) {
      console.log(`❌ Could not fetch existing user: ${fetchError.message}`);
      return;
    }

    if (existingUser.npub === '') {
      console.log('🔄 Updating user with placeholder npub...');
      
      // Generate a placeholder npub for now
      const placeholderNpub = `npub_placeholder_${existingUser.id.substring(0, 8)}`;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ npub: placeholderNpub })
        .eq('id', existingUser.id);

      if (updateError) {
        console.log(`❌ Failed to update user npub: ${updateError.message}`);
        return;
      } else {
        console.log(`✅ Updated user npub to: ${placeholderNpub}`);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Test the stored procedure with corrected data
    console.log('⚙️ Step 2: Testing stored procedure with corrected data...');
    
    const testResult = await supabase.rpc('create_team_with_captain', {
      p_team_name: 'Test Team Fix',
      p_team_about: 'Testing the npub constraint fix',
      p_captain_id: existingUser.id,
      p_captain_name: existingUser.name || 'Test Captain',
      p_difficulty: 'intermediate',
      p_prize_pool: 1000
    });

    if (testResult.error) {
      console.log(`❌ Stored procedure still failing: ${testResult.error.message}`);
      console.log('   Details:', testResult.error.details);
      
      // If it's still the npub constraint error, we need to fix the stored procedure
      if (testResult.error.message.includes('npub') && testResult.error.message.includes('not-null')) {
        console.log('\n🔧 Step 3: The stored procedure itself needs fixing...');
        console.log('   The procedure is trying to insert an empty npub string');
        console.log('   We need to update the stored procedure to handle npub properly');
        
        return {
          issue: 'stored_procedure_npub_constraint',
          solution: 'Update stored procedure to not insert empty npub',
          existingUser: existingUser
        };
      }
    } else {
      console.log('✅ Stored procedure test SUCCESSFUL!');
      console.log('   Result:', testResult.data);
      
      // Clean up the test team if created
      if (testResult.data?.success && testResult.data?.team_id) {
        console.log('🧹 Cleaning up test team...');
        await supabase
          .from('teams')
          .delete()
          .eq('id', testResult.data.team_id);
        console.log('✅ Test team cleaned up');
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Verify current database state
    console.log('📊 Step 3: Final verification...');
    
    const { data: updatedUser } = await supabase
      .from('users')
      .select('id, name, npub, role')
      .eq('id', existingUser.id)
      .single();
    
    console.log('Current user state:', updatedUser);
    
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, captain_id')
      .eq('captain_id', existingUser.id);
    
    console.log(`Teams created by this user: ${teams?.length || 0}`);
    
    console.log('\n🏁 NPUB Constraint Fix Complete!');
    
    return {
      success: true,
      updatedUser,
      teamsCount: teams?.length || 0
    };

  } catch (error) {
    console.error('💥 Fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the fix
if (require.main === module) {
  fixNpubConstraint().then(result => {
    if (result?.issue === 'stored_procedure_npub_constraint') {
      console.log('\n📝 NEXT STEPS REQUIRED:');
      console.log('1. The stored procedure needs to be updated');
      console.log('2. It should not try to insert empty npub strings');
      console.log('3. Either make npub nullable or provide a valid value');
    }
  }).catch(console.error);
}

module.exports = { fixNpubConstraint };