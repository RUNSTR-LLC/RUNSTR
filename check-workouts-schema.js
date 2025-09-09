/**
 * Check Workouts Table Schema
 * Verify what columns actually exist in the workouts table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkWorkoutsSchema() {
  console.log('🏃 Checking Workouts Table Schema');
  console.log('================================\n');

  try {
    // Try to select from workouts table to see actual columns
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Workouts table query failed:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      
      if (error.code === '42P01') {
        console.log('   Table does not exist');
      } else if (error.code === '42703') {
        console.log('   Column does not exist');
        console.log('   This confirms the start_time column issue');
      }
      
      return { exists: false, error: error.message };
    }

    console.log(`✅ Workouts table exists with ${data.length} sample records`);
    
    if (data && data.length > 0) {
      console.log('\n📋 Workouts table columns:');
      const columns = Object.keys(data[0]);
      columns.forEach(col => console.log(`   - ${col}`));
      
      // Check specific columns that ProfileService expects
      const expectedColumns = ['start_time', 'user_id', 'duration', 'distance'];
      console.log('\n🔍 Expected columns check:');
      expectedColumns.forEach(col => {
        if (columns.includes(col)) {
          console.log(`   ✅ ${col}: EXISTS`);
        } else {
          console.log(`   ❌ ${col}: MISSING`);
          
          // Suggest alternatives
          if (col === 'start_time') {
            const alternatives = columns.filter(c => c.includes('time') || c.includes('start'));
            if (alternatives.length > 0) {
              console.log(`      Possible alternatives: ${alternatives.join(', ')}`);
            }
          }
        }
      });
      
      return { exists: true, columns, data: data[0] };
    } else {
      console.log('ℹ️  Workouts table exists but is empty');
      return { exists: true, columns: [], data: null };
    }

  } catch (err) {
    console.error('💥 Schema check failed:', err.message);
    return { exists: false, error: err.message };
  }
}

// Run the check
if (require.main === module) {
  checkWorkoutsSchema().then(result => {
    if (!result.exists) {
      console.log('\n📝 RECOMMENDATIONS:');
      console.log('1. Check if workouts table exists in Supabase');
      console.log('2. If it exists, verify the column names match code expectations');
      console.log('3. Consider updating ProfileService to use correct column names');
    } else if (result.columns && !result.columns.includes('start_time')) {
      console.log('\n🔧 COLUMN NAME MISMATCH DETECTED:');
      console.log('ProfileService expects "start_time" but table has different columns');
      console.log('Update ProfileService queries to use correct column names');
    }
  }).catch(console.error);
}

module.exports = { checkWorkoutsSchema };