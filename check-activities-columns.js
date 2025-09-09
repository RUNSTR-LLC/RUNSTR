/**
 * Check actual activities table schema
 * Figure out what columns exist vs what we need
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jqxiswmdbukfokyvumcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeGlzd21kYnVrZm9reXZ1bWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDgwODgsImV4cCI6MjA3MjUyNDA4OH0.zAeS3XlYk8BtLFLPoWbjyypPgVK4jJM7b-JfR4fCZkk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkActivitiesSchema() {
  console.log('🔍 Checking actual activities table schema...\n');

  // Method 1: Try to insert minimal data to see what columns are required
  console.log('1️⃣ Testing basic columns...');
  
  const { data: teams } = await supabase
    .from('teams')
    .select('id, captain_id')
    .limit(1);

  if (!teams || teams.length === 0) {
    console.log('❌ No teams found');
    return;
  }

  const teamId = teams[0].id;
  const captainId = teams[0].captain_id;

  // Try different column combinations to figure out what exists
  const testCombinations = [
    {
      name: 'Minimal',
      data: {
        team_id: teamId,
        title: 'Test Activity'
      }
    },
    {
      name: 'With description',
      data: {
        team_id: teamId,
        title: 'Test Activity',
        description: 'Test description'
      }
    },
    {
      name: 'With activity_type',
      data: {
        team_id: teamId,
        activity_type: 'event',
        title: 'Test Activity',
        description: 'Test description'
      }
    },
    {
      name: 'With creator_id',
      data: {
        team_id: teamId,
        activity_type: 'event',
        title: 'Test Activity',
        description: 'Test description',
        creator_id: captainId
      }
    },
    {
      name: 'With prize_amount',
      data: {
        team_id: teamId,
        activity_type: 'event',
        title: 'Test Activity',
        description: 'Test description',
        prize_amount: 5000
      }
    },
    {
      name: 'With status',
      data: {
        team_id: teamId,
        activity_type: 'event',
        title: 'Test Activity',
        description: 'Test description',
        status: 'active'
      }
    }
  ];

  let workingStructure = null;
  let existingColumns = [];

  for (const test of testCombinations) {
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert(test.data)
        .select()
        .single();
      
      if (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        
        // If it's a column not found error, extract the column name
        if (error.message.includes('does not exist')) {
          const match = error.message.match(/column "([^"]+)"/);
          if (match) {
            console.log(`   Missing column: ${match[1]}`);
          }
        }
      } else {
        console.log(`✅ ${test.name}: SUCCESS!`);
        existingColumns = Object.keys(data);
        workingStructure = test.data;
        
        // Clean up test record
        await supabase
          .from('activities')
          .delete()
          .eq('id', data.id);
        
        break; // Found a working structure
      }
    } catch (err) {
      console.log(`❌ ${test.name}: ${err.message}`);
    }
  }

  console.log('\n2️⃣ Actual table structure:');
  if (existingColumns.length > 0) {
    console.log('✅ Existing columns:', existingColumns.join(', '));
  } else {
    console.log('❌ Could not determine table structure');
  }

  // Check what columns we need vs what exists
  console.log('\n3️⃣ Column analysis:');
  
  const requiredColumns = [
    'id', 'team_id', 'activity_type', 'title', 'description',
    'creator_id', 'prize_amount', 'status', 'created_at'
  ];
  
  const optionalColumns = [
    'start_date', 'end_date', 'participant_count', 'is_highlighted',
    'challenger_id', 'challenged_id'
  ];

  const missingRequired = requiredColumns.filter(col => !existingColumns.includes(col));
  const missingOptional = optionalColumns.filter(col => !existingColumns.includes(col));

  if (missingRequired.length > 0) {
    console.log('❌ Missing required columns:', missingRequired.join(', '));
  } else {
    console.log('✅ All required columns exist');
  }

  if (missingOptional.length > 0) {
    console.log('📝 Missing optional columns:', missingOptional.join(', '));
  }

  // Generate ALTER TABLE statements for missing columns
  if (missingRequired.length > 0 || missingOptional.length > 0) {
    console.log('\n🛠️  SQL to add missing columns:');
    console.log('=====================================');
    
    // Required columns first
    missingRequired.forEach(col => {
      let sqlType = 'TEXT';
      let constraints = '';
      
      switch(col) {
        case 'creator_id':
          sqlType = 'UUID REFERENCES auth.users(id)';
          break;
        case 'prize_amount':
          sqlType = 'BIGINT DEFAULT 0';
          break;
        case 'activity_type':
          sqlType = "VARCHAR(20) DEFAULT 'event'";
          constraints = "CHECK (activity_type IN ('event', 'challenge', 'announcement'))";
          break;
        case 'status':
          sqlType = "VARCHAR(20) DEFAULT 'active'";
          constraints = "CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled'))";
          break;
        case 'created_at':
          sqlType = 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
          break;
      }
      
      console.log(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS ${col} ${sqlType}${constraints ? ' ' + constraints : ''};`);
    });
    
    // Optional columns
    missingOptional.forEach(col => {
      let sqlType = 'TEXT';
      
      switch(col) {
        case 'start_date':
        case 'end_date':
          sqlType = 'TIMESTAMP WITH TIME ZONE';
          break;
        case 'participant_count':
          sqlType = 'INTEGER DEFAULT 0';
          break;
        case 'is_highlighted':
          sqlType = 'BOOLEAN DEFAULT false';
          break;
        case 'challenger_id':
        case 'challenged_id':
          sqlType = 'UUID REFERENCES auth.users(id)';
          break;
      }
      
      console.log(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS ${col} ${sqlType};`);
    });
  }

  return { existingColumns, missingRequired, missingOptional };
}

checkActivitiesSchema().then(() => {
  console.log('\n✅ Activities schema check completed!');
  process.exit(0);
}).catch(console.error);