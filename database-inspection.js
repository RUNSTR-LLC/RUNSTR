/**
 * Database Inspection Script
 * Comprehensive analysis of current Supabase database state
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectDatabase() {
  console.log('🔍 RUNSTR Database Inspection Report');
  console.log('=====================================\n');

  try {
    // 1. Check what tables exist
    console.log('📋 AVAILABLE TABLES:');
    console.log('-------------------');
    
    // Try to query each expected table to see if it exists
    const tablesToCheck = ['users', 'teams', 'team_members', 'activities', 'payments'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: EXISTS (sample record count: ${data?.length || 0})`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Detailed USERS table inspection
    console.log('👥 USERS TABLE ANALYSIS:');
    console.log('------------------------');
    
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(10);

      if (usersError) {
        console.log(`❌ Users query failed: ${usersError.message}`);
        console.log('   Details:', usersError.details);
        console.log('   Code:', usersError.code);
      } else {
        console.log(`📊 Total users found: ${users.length}`);
        
        if (users.length > 0) {
          console.log('\n🔎 Sample user record:');
          console.log(JSON.stringify(users[0], null, 2));
          
          console.log('\n📝 User table schema analysis:');
          const sampleUser = users[0];
          Object.keys(sampleUser).forEach(key => {
            const value = sampleUser[key];
            const type = value === null ? 'NULL' : typeof value;
            console.log(`   ${key}: ${type} = ${JSON.stringify(value)}`);
          });

          // Check for npub field specifically
          const npubUsers = users.filter(u => u.npub);
          console.log(`\n🔑 Users with npub: ${npubUsers.length}`);
          
          // Check for role assignments
          const captains = users.filter(u => u.role === 'captain');
          const members = users.filter(u => u.role === 'member');
          console.log(`👑 Captains: ${captains.length}`);
          console.log(`🏃 Members: ${members.length}`);
          console.log(`❓ No role: ${users.filter(u => !u.role).length}`);
        }
      }
    } catch (err) {
      console.log(`💥 Users table inspection failed: ${err.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Detailed TEAMS table inspection
    console.log('⚽ TEAMS TABLE ANALYSIS:');
    console.log('-----------------------');
    
    try {
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .limit(5);

      if (teamsError) {
        console.log(`❌ Teams query failed: ${teamsError.message}`);
        console.log('   Details:', teamsError.details);
        console.log('   Code:', teamsError.code);
      } else {
        console.log(`📊 Total teams found: ${teams.length}`);
        
        if (teams.length > 0) {
          console.log('\n🔎 Sample team record:');
          console.log(JSON.stringify(teams[0], null, 2));

          // Check captain_id references
          const teamsWithCaptains = teams.filter(t => t.captain_id);
          console.log(`\n👑 Teams with captain_id: ${teamsWithCaptains.length}`);
          
          if (teamsWithCaptains.length > 0) {
            console.log('🔍 Captain ID analysis:');
            for (const team of teamsWithCaptains) {
              console.log(`   Team "${team.name}": captain_id = ${team.captain_id}`);
              
              // Check if captain exists in users table
              try {
                const { data: captain, error: captainError } = await supabase
                  .from('users')
                  .select('id, name, role')
                  .eq('id', team.captain_id)
                  .single();
                
                if (captainError) {
                  console.log(`     ❌ Captain not found: ${captainError.message}`);
                } else {
                  console.log(`     ✅ Captain found: ${captain.name} (role: ${captain.role})`);
                }
              } catch (err) {
                console.log(`     💥 Captain lookup failed: ${err.message}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.log(`💥 Teams table inspection failed: ${err.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Check for stored procedures/functions
    console.log('⚙️ STORED PROCEDURES ANALYSIS:');
    console.log('-----------------------------');
    
    try {
      // Try to call the stored procedure with test parameters to see if it exists
      const { data: functionResult, error: functionError } = await supabase
        .rpc('create_team_with_captain', {
          p_team_name: 'TEST_FUNCTION_EXISTS',
          p_team_about: 'Test',
          p_captain_id: '00000000-0000-0000-0000-000000000000',
          p_captain_name: 'Test'
        });
      
      if (functionError) {
        if (functionError.code === '42883') {
          console.log('❌ create_team_with_captain function does NOT exist');
        } else {
          console.log('✅ create_team_with_captain function EXISTS');
          console.log(`   Test call result: ${functionError.message}`);
        }
      } else {
        console.log('✅ create_team_with_captain function EXISTS and executed');
        console.log('   Result:', functionResult);
      }
    } catch (err) {
      console.log(`💥 Function test failed: ${err.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 5. Auth vs Database consistency check
    console.log('🔐 AUTH CONSISTENCY CHECK:');
    console.log('-------------------------');
    
    try {
      // Get current auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.log('❌ No authenticated user found');
        console.log('   This is expected for a standalone script');
      } else if (authUser) {
        console.log(`✅ Auth user found: ${authUser.id}`);
        
        // Check if auth user exists in users table
        const { data: dbUser, error: dbUserError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (dbUserError) {
          console.log('❌ Auth user NOT found in users table');
          console.log(`   Auth ID: ${authUser.id}`);
          console.log(`   Error: ${dbUserError.message}`);
        } else {
          console.log('✅ Auth user found in users table');
          console.log(`   Name: ${dbUser.name}`);
          console.log(`   Role: ${dbUser.role}`);
        }
      }
    } catch (err) {
      console.log(`💥 Auth check failed: ${err.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 6. Specific error case investigation
    console.log('🚨 ERROR CASE INVESTIGATION:');
    console.log('---------------------------');
    
    // Look for the specific user ID from the error logs
    const problemUserId = 'de0a8249-9e18-4f2c-9daa-7515dbe2cb3b';
    
    console.log(`🔍 Looking for problematic user ID: ${problemUserId}`);
    
    try {
      const { data: problemUser, error: problemError } = await supabase
        .from('users')
        .select('*')
        .eq('id', problemUserId);
      
      if (problemError) {
        console.log(`❌ Error querying problem user: ${problemError.message}`);
      } else if (problemUser.length === 0) {
        console.log('❌ Problem user NOT FOUND in database');
        console.log('   This explains the foreign key constraint failure!');
      } else {
        console.log('✅ Problem user FOUND in database:');
        console.log(JSON.stringify(problemUser[0], null, 2));
      }
    } catch (err) {
      console.log(`💥 Problem user lookup failed: ${err.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');
    console.log('🏁 Database inspection complete!');
    console.log('\nNext steps based on findings:');
    console.log('1. Review any missing tables or schema mismatches');
    console.log('2. Check foreign key constraint configurations');
    console.log('3. Verify stored procedure existence and permissions');
    console.log('4. Address any auth/database user ID inconsistencies');

  } catch (error) {
    console.error('💥 Database inspection failed:', error);
  }
}

// Run the inspection
if (require.main === module) {
  inspectDatabase().catch(console.error);
}

module.exports = { inspectDatabase };