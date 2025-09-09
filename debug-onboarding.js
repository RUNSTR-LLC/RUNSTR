#!/usr/bin/env node

/**
 * Debug script for onboarding flow issues
 * Tests database connections and basic operations
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Need: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOnboarding() {
  console.log('🔍 Debugging RUNSTR Onboarding Flow');
  console.log('================================');
  
  try {
    // Test 1: Check Supabase connection
    console.log('\n1. Testing Supabase connection...');
    const { data: connTest, error: connError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (connError) {
      console.error('❌ Supabase connection failed:', connError.message);
      return;
    }
    console.log('✅ Supabase connection working');

    // Test 2: Check if teams table exists and has data
    console.log('\n2. Checking teams table...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .limit(5);
    
    if (teamsError) {
      console.error('❌ Teams table error:', teamsError.message);
    } else {
      console.log(`✅ Teams table exists with ${teams?.length || 0} teams`);
      if (teams && teams.length > 0) {
        console.log('📋 Sample team:', teams[0]);
      } else {
        console.log('ℹ️  No teams found - this is why team discovery shows empty state');
      }
    }

    // Test 3: Check if users table exists  
    console.log('\n3. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(3);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
    } else {
      console.log(`✅ Users table exists with ${users?.length || 0} users`);
      if (users && users.length > 0) {
        console.log('📋 Sample user roles:', users.map(u => `${u.name}: ${u.role || 'no role'}`));
      }
    }

    // Test 4: Check discoverable teams issue
    console.log('\n4. Testing team discovery query...');
    const { data: discoverableTeams, error: discoverError } = await supabase
      .from('teams')
      .select('*')
      .eq('is_active', true)
      .eq('is_discoverable', true);
    
    if (discoverError) {
      console.error('❌ Discoverable teams error:', discoverError.message);
      console.log('ℹ️  This explains why TeamDiscoveryService returns no teams!');
      
      // Try without is_discoverable filter
      console.log('\n5. Testing without is_discoverable filter...');
      const { data: activeTeams, error: activeError } = await supabase
        .from('teams')
        .select('*')
        .eq('is_active', true);
      
      if (!activeError && activeTeams) {
        console.log(`✅ Found ${activeTeams.length} active teams without discoverable filter`);
      }
    } else {
      console.log(`✅ Found ${discoverableTeams?.length || 0} discoverable teams`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugOnboarding();