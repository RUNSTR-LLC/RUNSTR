/**
 * Update February 5K Challenge competition in Supabase
 *
 * Sets scoring to fastest_time (lowest 5K time wins)
 * Top 10 finishers each earn 5,000 sats
 *
 * Usage: node scripts/update-february-5k.cjs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not found, using anon key (may fail due to RLS)');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateFebruary5K() {
  const EXTERNAL_ID = 'february-5k-challenge';

  // First check if the competition exists
  const { data: existing, error: findError } = await supabase
    .from('competitions')
    .select('*')
    .eq('external_id', EXTERNAL_ID)
    .single();

  if (findError) {
    console.error('Error finding competition:', findError);
    console.log('\nIf the competition does not exist yet, create it first.');
    process.exit(1);
  }

  console.log('Found competition:', existing.name);
  console.log('Current scoring_method:', existing.scoring_method);
  console.log('Current config:', JSON.stringify(existing.config, null, 2));

  // Update to fastest_time scoring with prizes
  const { data, error } = await supabase
    .from('competitions')
    .update({
      scoring_method: 'fastest_time',
      prize_pool_sats: 50000, // 10 × 5,000
      config: {
        ...existing.config,
        activity_types: ['running'],
        score_unit: 'seconds',
        target_distance_km: 5.0,
        distance_tolerance_km: 0.5,
        winner_count: 10,
        rules: 'Run a 5K and post your fastest time! Workouts between 4.5–5.5 km qualify. Top 10 fastest times each win 5,000 sats.',
        prizes: [
          { place: 1, amount_sats: 5000, label: '1st Place' },
          { place: 2, amount_sats: 5000, label: '2nd Place' },
          { place: 3, amount_sats: 5000, label: '3rd Place' },
          { place: 4, amount_sats: 5000, label: '4th Place' },
          { place: 5, amount_sats: 5000, label: '5th Place' },
          { place: 6, amount_sats: 5000, label: '6th Place' },
          { place: 7, amount_sats: 5000, label: '7th Place' },
          { place: 8, amount_sats: 5000, label: '8th Place' },
          { place: 9, amount_sats: 5000, label: '9th Place' },
          { place: 10, amount_sats: 5000, label: '10th Place' },
        ],
      },
    })
    .eq('external_id', EXTERNAL_ID)
    .select()
    .single();

  if (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }

  console.log('\n✅ Updated successfully!');
  console.log('Name:', data.name);
  console.log('Scoring:', data.scoring_method);
  console.log('Prize pool:', data.prize_pool_sats, 'sats');
  console.log('Config:', JSON.stringify(data.config, null, 2));
}

updateFebruary5K().catch(console.error);
