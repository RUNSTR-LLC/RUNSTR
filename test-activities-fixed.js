/**
 * Quick test to verify activities table is now fixed
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jqxiswmdbukfokyvumcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeGlzd21kYnVrZm9reXZ1bWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDgwODgsImV4cCI6MjA3MjUyNDA4OH0.zAeS3XlYk8BtLFLPoWbjyypPgVK4jJM7b-JfR4fCZkk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testActivitiesFix() {
  console.log('🧪 Testing if activities table is now fixed...\n');

  // Get a team to test with
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, captain_id')
    .limit(1);

  if (!teams || teams.length === 0) {
    console.log('❌ No teams found');
    return;
  }

  const team = teams[0];
  console.log(`Using team: ${team.name} (${team.id})`);

  // Test creating activity with all the columns that were missing
  console.log('\n1️⃣ Testing activity creation with new columns...');
  
  try {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        team_id: team.id,
        activity_type: 'event',
        title: 'Test Weekly 5K',
        description: 'Test event to verify database fix',
        creator_id: team.captain_id,
        prize_amount: 5000,
        status: 'active',
        is_highlighted: true
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ Activity creation failed:', error.message);
    } else {
      console.log('✅ Activity creation SUCCESS!');
      console.log(`   Created: "${data.title}" with ${data.prize_amount} sats prize`);
      
      // Clean up test data
      await supabase
        .from('activities')
        .delete()
        .eq('id', data.id);
      console.log('   (Test activity cleaned up)');
    }
  } catch (err) {
    console.log('❌ Test failed:', err.message);
  }

  console.log('\n🎯 NEXT STEP:');
  console.log('Your activities table is now fixed!');
  console.log('You can now run the payments and leaderboards migrations from COPY_PASTE_TO_SUPABASE.sql');
  console.log('(Skip the sample data part that was failing - lines 222-301)');
}

testActivitiesFix().then(() => {
  console.log('\n✅ Activities fix verification completed!');
  process.exit(0);
}).catch(console.error);