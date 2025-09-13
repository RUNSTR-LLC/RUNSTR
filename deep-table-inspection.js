/**
 * Deep Table Inspection
 * Thoroughly checks what's actually in the database
 */

import { createClient } from '@supabase/supabase-js';
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

async function deepInspection() {
  console.log('🔬 DEEP DATABASE INSPECTION');
  console.log('===========================\n');

  const tablesToCheck = ['users', 'teams', 'team_members', 'workouts', 'competition_entries', 'device_tokens'];

  for (const tableName of tablesToCheck) {
    console.log(`🔍 Inspecting: ${tableName}`);
    console.log('─'.repeat(40));

    try {
      // Method 1: Try to select with count
      const { data: countData, error: countError, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`  ❌ SELECT COUNT failed: ${countError.message}`);
        console.log(`  📋 Error details: ${JSON.stringify(countError, null, 2)}`);
      } else {
        console.log(`  ✅ SELECT COUNT success: ${count} records`);
      }

      // Method 2: Try to select actual data
      const { data: selectData, error: selectError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (selectError) {
        console.log(`  ❌ SELECT DATA failed: ${selectError.message}`);
        console.log(`  📋 Error details: ${JSON.stringify(selectError, null, 2)}`);
      } else {
        console.log(`  ✅ SELECT DATA success: Retrieved ${selectData?.length || 0} records`);
        if (selectData && selectData.length > 0) {
          console.log(`  📄 Sample data keys: ${Object.keys(selectData[0]).join(', ')}`);
        }
      }

      // Method 3: Try to describe the table structure
      try {
        const { data: insertData, error: insertError } = await supabase
          .from(tableName)
          .insert({})
          .select();

        // We expect this to fail, but the error might tell us about the schema
        if (insertError) {
          console.log(`  ⚡ Schema hint from insert error: ${insertError.message}`);
        }
      } catch (insertErr) {
        console.log(`  ⚡ Insert test error: ${insertErr.message}`);
      }

    } catch (globalError) {
      console.log(`  💥 Global error: ${globalError.message}`);
    }

    console.log(); // Empty line for readability
  }

  // Additional: Try to create a test team to see what happens
  console.log('🧪 TESTING TEAM CREATION');
  console.log('=========================');
  
  try {
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: 'Test Team',
        about: 'Test team for schema validation',
        captain_id: 'test-captain',
        is_active: true
      })
      .select();

    if (teamError) {
      console.log(`❌ Team creation failed: ${teamError.message}`);
      console.log(`📋 Error details: ${JSON.stringify(teamError, null, 2)}`);
    } else {
      console.log(`✅ Team creation success!`);
      console.log(`📄 Created team: ${JSON.stringify(teamData, null, 2)}`);
      
      // Clean up test data
      if (teamData && teamData.length > 0) {
        await supabase.from('teams').delete().eq('id', teamData[0].id);
        console.log('🧹 Test team cleaned up');
      }
    }
  } catch (error) {
    console.log(`💥 Team creation test failed: ${error.message}`);
  }
}

// Run the inspection
deepInspection().catch(console.error);