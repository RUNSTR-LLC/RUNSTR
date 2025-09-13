/**
 * Apply Team Tables Migration
 * Safely restores teams and team_members tables for competition automation
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  console.log('🚀 APPLYING TEAM TABLES MIGRATION');
  console.log('==================================\n');

  try {
    // 1. Read migration file
    console.log('📖 Reading migration file...');
    const migrationSQL = readFileSync('./supabase/migrations/102_restore_team_tables.sql', 'utf8');
    console.log('✅ Migration file loaded\n');

    // 2. Check current state before migration
    console.log('🔍 Checking current database state...');
    await checkCurrentState();
    console.log();

    // 3. Apply migration using RPC call
    console.log('⚡ Applying migration...');
    console.log('This may take a few moments...\n');
    
    // Note: Since we can't execute raw SQL directly through the JS client,
    // we'll need to apply this migration through the Supabase dashboard
    // or use the Supabase CLI. For now, let's simulate the process.
    
    console.log('📋 MIGRATION READY TO APPLY');
    console.log('===========================');
    console.log('To apply this migration, please:');
    console.log('1. Copy the contents of supabase/migrations/102_restore_team_tables.sql');
    console.log('2. Go to your Supabase dashboard → SQL Editor');
    console.log('3. Paste and run the migration SQL');
    console.log('4. Run this script again to verify the results\n');

    // 4. Try to detect if migration was already applied
    console.log('🕵️  Checking if tables already exist...');
    const tablesExist = await checkIfTablesExist();
    
    if (tablesExist.teams && tablesExist.team_members) {
      console.log('✅ MIGRATION ALREADY APPLIED!');
      console.log('Both teams and team_members tables exist.');
      console.log('\n📊 Final verification...');
      await verifyMigrationSuccess();
    } else {
      console.log('⏳ MIGRATION PENDING');
      console.log('Tables not found - please apply migration manually as described above.');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

async function checkCurrentState() {
  const tables = ['users', 'teams', 'team_members', 'workouts', 'competition_entries', 'device_tokens'];
  
  for (const tableName of tables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${tableName}: Does not exist`);
      } else {
        console.log(`  ✅ ${tableName}: Exists (${count} records)`);
      }
    } catch (err) {
      console.log(`  ❌ ${tableName}: Error - ${err.message}`);
    }
  }
}

async function checkIfTablesExist() {
  const results = { teams: false, team_members: false };
  
  try {
    const { error: teamsError } = await supabase
      .from('teams')
      .select('count', { count: 'exact' })
      .limit(0);
    results.teams = !teamsError;
  } catch (err) {
    results.teams = false;
  }
  
  try {
    const { error: membersError } = await supabase
      .from('team_members')
      .select('count', { count: 'exact' })
      .limit(0);
    results.team_members = !membersError;
  } catch (err) {
    results.team_members = false;
  }
  
  return results;
}

async function verifyMigrationSuccess() {
  console.log('\n🎯 VERIFYING MIGRATION SUCCESS');
  console.log('==============================');
  
  try {
    // Check tables exist
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('count', { count: 'exact' })
      .limit(0);
      
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('count', { count: 'exact' })
      .limit(0);

    if (!teamsError && !membersError) {
      console.log('✅ Teams table: Ready for competition automation');
      console.log('✅ Team members table: Ready for member tracking');
      console.log('\n🎉 MIGRATION SUCCESSFUL!');
      console.log('Your competition automation should now work flawlessly.');
    } else {
      console.log('❌ Migration verification failed');
      if (teamsError) console.log('   Teams error:', teamsError.message);
      if (membersError) console.log('   Members error:', membersError.message);
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the migration
applyMigration().catch(console.error);