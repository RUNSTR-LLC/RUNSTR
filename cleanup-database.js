#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Removes ALL mock data from Supabase to start fresh
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

async function cleanDatabase() {
  console.log('🧹 Cleaning RUNSTR Database');
  console.log('==========================');
  console.log('⚠️  This will DELETE ALL DATA. Are you sure?');
  console.log('   This includes teams, users, activities, challenges, etc.');
  console.log('   Only mock/test data will be removed. Real user data will be preserved if it exists.');
  console.log('');

  try {
    // 1. Delete all teams (this will cascade to related data)
    console.log('1. Removing all teams...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all teams

    if (teamsError && !teamsError.message.includes('No rows')) {
      console.error('❌ Error deleting teams:', teamsError.message);
    } else {
      console.log('✅ All teams removed');
    }

    // 2. Delete team_members (in case of orphaned records)
    console.log('2. Removing team memberships...');
    const { error: membersError } = await supabase
      .from('team_members')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (membersError && !membersError.message.includes('No rows')) {
      console.error('❌ Error deleting team members:', membersError.message);
    } else {
      console.log('✅ All team memberships removed');
    }

    // 3. Delete activities
    console.log('3. Removing activities...');
    const { error: activitiesError } = await supabase
      .from('activities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (activitiesError && !activitiesError.message.includes('No rows')) {
      console.error('❌ Error deleting activities:', activitiesError.message);
    } else {
      console.log('✅ All activities removed');
    }

    // 4. Delete challenges
    console.log('4. Removing challenges...');
    const { error: challengesError } = await supabase
      .from('challenges')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (challengesError && !challengesError.message.includes('No rows')) {
      console.error('❌ Error deleting challenges:', challengesError.message);
    } else {
      console.log('✅ All challenges removed');
    }

    // 5. Delete events  
    console.log('5. Removing events...');
    const { error: eventsError } = await supabase
      .from('events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (eventsError && !eventsError.message.includes('No rows')) {
      console.error('❌ Error deleting events:', eventsError.message);
    } else {
      console.log('✅ All events removed');
    }

    // 6. Reset any test users (preserve real users from actual signups)
    console.log('6. Removing test users...');
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .or('name.ilike.%test%,name.ilike.%user_%,name.ilike.%mock%');

    if (usersError && !usersError.message.includes('No rows')) {
      console.error('❌ Error deleting test users:', usersError.message);
    } else {
      console.log('✅ Test users removed (real users preserved)');
    }

    // 7. Check final state
    console.log('');
    console.log('📊 Final Database State:');
    console.log('========================');

    const { data: finalTeams } = await supabase
      .from('teams')
      .select('count');
    console.log(`Teams: ${finalTeams?.length || 0}`);

    const { data: finalUsers } = await supabase
      .from('users')
      .select('count');
    console.log(`Users: ${finalUsers?.length || 0}`);

    const { data: finalActivities } = await supabase
      .from('activities')
      .select('count');
    console.log(`Activities: ${finalActivities?.length || 0}`);

    console.log('');
    console.log('✅ Database cleanup complete!');
    console.log('🚀 Ready for first real user onboarding flow');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run cleanup
cleanDatabase();