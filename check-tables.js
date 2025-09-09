/**
 * Check what tables actually exist
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jqxiswmdbukfokyvumcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeGlzd21kYnVrZm9reXZ1bWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDgwODgsImV4cCI6MjA3MjUyNDA4OH0.zAeS3XlYk8BtLFLPoWbjyypPgVK4jJM7b-JfR4fCZkk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  console.log('🔍 Checking what tables actually exist...\n');

  const possibleTables = [
    'users', 
    'teams', 
    'team_members', 
    'team_activities', 
    'team_payouts',
    'team_stats',
    'workouts',
    'activities'  // Maybe it's called just 'activities'
  ];

  for (const table of possibleTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: EXISTS with ${count || 0} records`);
        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`   Columns: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`);
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  // Try to create some sample team activities if the table exists
  console.log('\n🧪 Testing if we can create sample data...');
  
  try {
    // First, let's see if we can get team IDs
    const { data: teamIds } = await supabase
      .from('teams')
      .select('id, name')
      .limit(2);
    
    if (teamIds && teamIds.length > 0) {
      console.log(`Found teams: ${teamIds.map(t => t.name).join(', ')}`);
      
      // Try to insert into activities table (whatever it's called)
      for (const tableName of ['activities', 'team_activities']) {
        try {
          const { error: insertError } = await supabase
            .from(tableName)
            .insert({
              team_id: teamIds[0].id,
              activity_type: 'event',
              title: 'Test Weekly 5K',
              description: 'Test event to verify database functionality',
              prize_amount: 5000,
              status: 'active'
            });
          
          if (!insertError) {
            console.log(`✅ Successfully created test activity in ${tableName}`);
            break;
          } else {
            console.log(`❌ ${tableName} insert failed: ${insertError.message}`);
          }
        } catch (err) {
          console.log(`❌ ${tableName} insert error: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.log(`❌ Sample data creation failed: ${err.message}`);
  }
}

checkTables().then(() => {
  console.log('\n✅ Table check completed!');
  process.exit(0);
}).catch(console.error);