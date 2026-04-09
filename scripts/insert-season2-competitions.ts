/**
 * Insert Season 2 Competition Records
 *
 * Run with: npx tsx scripts/insert-season2-competitions.ts
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env file
dotenv.config();

// Use the same env vars as the app
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cvoepeskjueskdfrpsnv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_KEY) {
  console.error('❌ No Supabase key found.');
  console.error('   Set SUPABASE_SERVICE_ROLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SEASON_2_COMPETITIONS = [
  {
    external_id: 'season2-running',
    name: 'Season 2: Running',
    activity_type: 'running',
    scoring_method: 'total_distance',
    start_date: '2026-01-01T00:00:00Z',
    end_date: '2026-03-01T23:59:59Z',
  },
  {
    external_id: 'season2-walking',
    name: 'Season 2: Walking',
    activity_type: 'walking',
    scoring_method: 'total_distance',
    start_date: '2026-01-01T00:00:00Z',
    end_date: '2026-03-01T23:59:59Z',
  },
  {
    external_id: 'season2-cycling',
    name: 'Season 2: Cycling',
    activity_type: 'cycling',
    scoring_method: 'total_distance',
    start_date: '2026-01-01T00:00:00Z',
    end_date: '2026-03-01T23:59:59Z',
  },
];

async function main() {
  console.log('🚀 Inserting Season 2 competitions...\n');

  for (const competition of SEASON_2_COMPETITIONS) {
    const { data, error } = await supabase
      .from('competitions')
      .upsert(competition, { onConflict: 'external_id' })
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to insert ${competition.external_id}:`, error.message);
    } else {
      console.log(`✅ ${competition.name}`);
      console.log(`   ID: ${data.id}`);
      console.log(`   External ID: ${data.external_id}`);
    }
  }

  // Verify
  console.log('\n📋 Verification:');
  const { data: all, error: listError } = await supabase
    .from('competitions')
    .select('external_id, name, activity_type')
    .order('activity_type');

  if (listError) {
    console.error('❌ Failed to list competitions:', listError.message);
  } else {
    console.log(`Found ${all?.length || 0} competitions:`);
    all?.forEach(c => console.log(`   - ${c.external_id}: ${c.name}`));
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
