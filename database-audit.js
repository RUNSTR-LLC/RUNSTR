/**
 * RUNSTR Database Schema Audit
 * Comprehensive check of current vs required database structure
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jqxiswmdbukfokyvumcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeGlzd21kYnVrZm9reXZ1bWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDgwODgsImV4cCI6MjA3MjUyNDA4OH0.zAeS3XlYk8BtLFLPoWbjyypPgVK4jJM7b-JfR4fCZkk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define what we SHOULD have in the database
const REQUIRED_SCHEMA = {
  // Core tables that should exist
  tables: {
    'users': {
      required_columns: [
        'id', 'name', 'email', 'npub', 'nsec_encrypted', 'role',
        'personal_wallet_address', 'current_team_id', 'created_at', 'updated_at'
      ],
      optional_columns: ['avatar', 'last_sync_at', 'fitness_stats']
    },
    'teams': {
      required_columns: [
        'id', 'name', 'description', 'captain_id', 'prize_pool', 
        'member_count', 'avg_pace_seconds', 'difficulty_level',
        'is_active', 'is_featured', 'created_at', 'updated_at'
      ],
      optional_columns: ['about', 'join_reward', 'exit_fee', 'sponsored_by', 'avatar']
    },
    'team_members': {
      required_columns: [
        'id', 'team_id', 'user_id', 'role', 'joined_at', 'is_active'
      ],
      optional_columns: [
        'total_workouts', 'total_distance_meters', 'total_duration_seconds',
        'avg_pace_seconds', 'last_workout_at'
      ]
    },
    'activities': {
      required_columns: [
        'id', 'team_id', 'activity_type', 'title', 'description', 
        'creator_id', 'prize_amount', 'status', 'created_at'
      ],
      optional_columns: [
        'start_date', 'end_date', 'participant_count', 'is_highlighted',
        'requirements_json', 'challenger_id', 'challenged_id'
      ]
    },
    'workouts': {
      required_columns: [
        'id', 'user_id', 'team_id', 'type', 'source', 
        'distance_meters', 'duration_seconds', 'start_time', 'synced_at'
      ],
      optional_columns: [
        'calories', 'end_time', 'activity_id', 'counts_for_competition', 'metadata'
      ]
    },
    'payments': {
      required_columns: [
        'id', 'from_user_id', 'to_user_id', 'amount_sats', 
        'transaction_type', 'status', 'created_at'
      ],
      optional_columns: [
        'activity_id', 'team_id', 'lightning_invoice', 'payment_hash',
        'paid_at', 'description'
      ]
    },
    'leaderboards': {
      required_columns: [
        'team_id', 'user_id', 'period', 'rank', 
        'total_distance', 'total_workouts', 'updated_at'
      ],
      optional_columns: ['avg_pace', 'points_earned']
    }
  }
};

async function auditDatabase() {
  console.log('🔍 RUNSTR Database Schema Audit');
  console.log('=====================================\n');

  const auditResults = {
    existing_tables: {},
    missing_tables: [],
    column_issues: {},
    data_status: {},
    migration_needed: []
  };

  // Check each required table
  for (const [tableName, schema] of Object.entries(REQUIRED_SCHEMA.tables)) {
    console.log(`📋 Checking table: ${tableName}`);
    
    try {
      // Try to query the table
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`   ❌ MISSING: ${tableName}`);
        auditResults.missing_tables.push(tableName);
        auditResults.migration_needed.push(`CREATE_TABLE_${tableName.toUpperCase()}`);
      } else {
        console.log(`   ✅ EXISTS: ${tableName} (${count || 0} records)`);
        auditResults.existing_tables[tableName] = count || 0;
        
        if (data && data.length > 0) {
          const existingColumns = Object.keys(data[0]);
          const missingColumns = schema.required_columns.filter(col => !existingColumns.includes(col));
          const extraColumns = existingColumns.filter(col => 
            !schema.required_columns.includes(col) && 
            !schema.optional_columns.includes(col)
          );
          
          if (missingColumns.length > 0) {
            console.log(`   ⚠️  MISSING COLUMNS: ${missingColumns.join(', ')}`);
            auditResults.column_issues[tableName] = { missing: missingColumns, extra: extraColumns };
            auditResults.migration_needed.push(`ADD_COLUMNS_${tableName.toUpperCase()}`);
          }
          
          if (extraColumns.length > 0) {
            console.log(`   📝 EXTRA COLUMNS: ${extraColumns.join(', ')}`);
            if (!auditResults.column_issues[tableName]) {
              auditResults.column_issues[tableName] = { missing: [], extra: extraColumns };
            }
          }
          
          if (missingColumns.length === 0 && extraColumns.length === 0) {
            console.log(`   ✅ SCHEMA PERFECT`);
          }
        } else if (count === 0) {
          console.log(`   📝 EMPTY: Needs sample data`);
          auditResults.data_status[tableName] = 'EMPTY';
        }
      }
    } catch (err) {
      console.log(`   💥 ERROR: ${err.message}`);
      auditResults.missing_tables.push(tableName);
    }
    
    console.log('');
  }

  // Summary Report
  console.log('📊 AUDIT SUMMARY');
  console.log('=================');
  console.log(`✅ Existing tables: ${Object.keys(auditResults.existing_tables).length}/${Object.keys(REQUIRED_SCHEMA.tables).length}`);
  console.log(`❌ Missing tables: ${auditResults.missing_tables.length}`);
  console.log(`⚠️  Tables with column issues: ${Object.keys(auditResults.column_issues).length}`);
  console.log(`📝 Empty tables: ${Object.keys(auditResults.data_status).length}\n`);

  if (auditResults.missing_tables.length > 0) {
    console.log('🚨 MISSING TABLES:');
    auditResults.missing_tables.forEach(table => console.log(`   - ${table}`));
    console.log('');
  }

  if (Object.keys(auditResults.column_issues).length > 0) {
    console.log('⚠️  COLUMN ISSUES:');
    Object.entries(auditResults.column_issues).forEach(([table, issues]) => {
      console.log(`   ${table}:`);
      if (issues.missing.length > 0) {
        console.log(`     Missing: ${issues.missing.join(', ')}`);
      }
      if (issues.extra.length > 0) {
        console.log(`     Extra: ${issues.extra.join(', ')}`);
      }
    });
    console.log('');
  }

  // Generate Migration Plan
  console.log('🛠️  MIGRATION PLAN:');
  if (auditResults.migration_needed.length === 0) {
    console.log('   🎉 NO MIGRATIONS NEEDED - Database is perfect!');
  } else {
    console.log('   The following migration scripts will be generated:');
    auditResults.migration_needed.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration.replace(/_/g, ' ').toLowerCase()}`);
    });
  }

  return auditResults;
}

// Run the audit
auditDatabase().then((results) => {
  console.log('\n✅ Database audit completed!');
  console.log(`📁 Run 'node generate-migrations.js' to create SQL scripts for ${results.migration_needed.length} needed migrations`);
  process.exit(0);
}).catch(console.error);