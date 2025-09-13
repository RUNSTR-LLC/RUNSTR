/**
 * Supabase Database Inspector
 * Checks current schema, tables, and data in the database
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

async function inspectDatabase() {
  console.log('🔍 SUPABASE DATABASE INSPECTION');
  console.log('================================\n');

  try {
    // 1. Check what tables exist
    console.log('📋 EXISTING TABLES:');
    console.log('===================');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('❌ Error fetching tables:', tablesError);
      // Try alternative approach
      console.log('🔄 Trying alternative table detection...');
      await checkTablesDirectly();
    } else if (tables && tables.length > 0) {
      tables.forEach(table => {
        console.log(`  ✓ ${table.table_name}`);
      });
      console.log(`\n📊 Total tables found: ${tables.length}\n`);
    } else {
      console.log('  ⚠️  No tables found in public schema\n');
    }

    // 2. Check specific tables our code expects
    console.log('🎯 CHECKING EXPECTED TABLES:');
    console.log('============================');
    
    const expectedTables = ['users', 'teams', 'team_members', 'workouts', 'competition_entries', 'device_tokens'];
    
    for (const tableName of expectedTables) {
      await checkTableExists(tableName);
    }

    // 3. Check data in existing tables
    console.log('\n📊 TABLE DATA SUMMARY:');
    console.log('======================');
    
    for (const tableName of expectedTables) {
      await checkTableData(tableName);
    }

    console.log('\n✅ Database inspection complete!');

  } catch (error) {
    console.error('💥 Database inspection failed:', error);
  }
}

async function checkTablesDirectly() {
  const expectedTables = ['users', 'teams', 'team_members', 'workouts', 'competition_entries', 'device_tokens'];
  
  console.log('Checking tables directly...');
  for (const tableName of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count', { count: 'exact' })
        .limit(0);
      
      if (error) {
        console.log(`  ❌ ${tableName} - Does not exist (${error.message})`);
      } else {
        console.log(`  ✓ ${tableName} - Exists`);
      }
    } catch (err) {
      console.log(`  ❌ ${tableName} - Error checking: ${err.message}`);
    }
  }
}

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('count', { count: 'exact' })
      .limit(0);
    
    if (error) {
      console.log(`  ❌ ${tableName} - Does not exist`);
      console.log(`     Error: ${error.message}`);
      return false;
    } else {
      console.log(`  ✅ ${tableName} - Exists (${data?.length ?? 0} rows available)`);
      return true;
    }
  } catch (err) {
    console.log(`  ⚠️  ${tableName} - Unknown status (${err.message})`);
    return false;
  }
}

async function checkTableData(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`  📋 ${tableName}: Table does not exist`);
    } else {
      console.log(`  📋 ${tableName}: ${count} records`);
      
      // Show sample data for small tables
      if (count > 0 && count <= 5) {
        const { data: sampleData } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);
        
        if (sampleData && sampleData.length > 0) {
          console.log(`     Sample: ${JSON.stringify(sampleData[0], null, 2).substring(0, 100)}...`);
        }
      }
    }
  } catch (err) {
    console.log(`  📋 ${tableName}: Error checking data - ${err.message}`);
  }
}

// Run the inspection
inspectDatabase().catch(console.error);