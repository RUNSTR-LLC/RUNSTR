/**
 * Check activities table schema and fix team service
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jqxiswmdbukfokyvumcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeGlzd21kYnVrZm9reXZ1bWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDgwODgsImV4cCI6MjA3MjUyNDA4OH0.zAeS3XlYk8BtLFLPoWbjyypPgVK4jJM7b-JfR4fCZkk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkActivitiesSchema() {
  console.log('🔍 Checking activities table schema...\n');

  // Try to insert a test record to see what columns exist
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .limit(1);

  if (!teams || teams.length === 0) {
    console.log('❌ No teams found');
    return;
  }

  const teamId = teams[0].id;

  // Try different column structures to figure out what exists
  const testStructures = [
    // Structure 1: Simple activities
    {
      name: 'Simple Structure',
      data: {
        team_id: teamId,
        title: 'Test Event',
        description: 'Test description'
      }
    },
    // Structure 2: With type
    {
      name: 'With Activity Type',
      data: {
        team_id: teamId,
        activity_type: 'event',
        title: 'Test Event',
        description: 'Test description'
      }
    },
    // Structure 3: Full structure
    {
      name: 'Full Structure',
      data: {
        team_id: teamId,
        activity_type: 'event',
        title: 'Test Event',
        description: 'Test description',
        prize_pool: 5000,
        status: 'active'
      }
    }
  ];

  for (const structure of testStructures) {
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert(structure.data)
        .select()
        .single();
      
      if (error) {
        console.log(`❌ ${structure.name}: ${error.message}`);
      } else {
        console.log(`✅ ${structure.name}: SUCCESS!`);
        console.log('   Created record:', JSON.stringify(data, null, 2));
        
        // Clean up - delete the test record
        await supabase
          .from('activities')
          .delete()
          .eq('id', data.id);
        
        console.log('   (Test record deleted)\n');
        break; // Found working structure
      }
    } catch (err) {
      console.log(`❌ ${structure.name}: ${err.message}`);
    }
  }

  // Now let's see what the team service query needs
  console.log('🔍 Testing team discovery with activities...\n');
  
  // Create a real test activity first
  const { data: testActivity, error: createError } = await supabase
    .from('activities')
    .insert({
      team_id: teamId,
      title: 'Weekly 5K Challenge',
      description: 'Complete a 5K run this week to earn Bitcoin rewards'
    })
    .select()
    .single();

  if (createError) {
    console.log('❌ Could not create test activity:', createError.message);
    return;
  }

  console.log('✅ Created test activity:', testActivity.title);

  // Now test the team discovery query
  const { data: discoveryData, error: discoveryError } = await supabase
    .from('teams')
    .select(`
      *,
      activities(*)
    `)
    .eq('is_active', true)
    .limit(2);
  
  if (discoveryError) {
    console.log('❌ Team discovery query failed:', discoveryError.message);
  } else {
    console.log('✅ Team discovery with activities works!');
    discoveryData.forEach(team => {
      console.log(`   - ${team.name}: ${team.activities?.length || 0} activities`);
      if (team.activities && team.activities.length > 0) {
        team.activities.forEach(activity => {
          console.log(`     • ${activity.title}`);
        });
      }
    });
  }

  // Clean up test data
  if (testActivity?.id) {
    await supabase
      .from('activities')
      .delete()
      .eq('id', testActivity.id);
    console.log('   (Cleaned up test activity)');
  }
}

checkActivitiesSchema().then(() => {
  console.log('\n✅ Schema check completed!');
  process.exit(0);
}).catch(console.error);