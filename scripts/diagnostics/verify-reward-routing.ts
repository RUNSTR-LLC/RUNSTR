#!/usr/bin/env tsx
/**
 * Diagnostic Script: Verify Reward Routing
 *
 * Checks that reward routing is working correctly in Supabase:
 * 1. Verifies TheWildHustle's workout leaderboard_date and reward-related tags
 * 2. Scans recent workouts for missing lightning tags (those won't get rewards)
 * 3. Checks the daily_rewards view for zap_to_address population
 *
 * Usage: npx tsx scripts/diagnostics/verify-reward-routing.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// TheWildHustle's workout
const TARGET_WORKOUT_ID = 'f9d85b5f-f57f-4ce0-8213-869f18934c46';
const EXPECTED_LEADERBOARD_DATE = '2026-02-10';

// --- Supabase REST helper ---
async function supabaseGet<T>(path: string): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY!,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    let data: T | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // not JSON
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? null : text,
    };
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err.message };
  }
}

// --- Types ---
interface WorkoutRow {
  id: string;
  event_id: string;
  npub: string;
  activity_type: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  calories: number | null;
  created_at: string;
  leaderboard_date: string | null;
  verified: boolean | null;
  verification_status: string | null;
  source: string | null;
  profile_name: string | null;
  raw_event: Record<string, unknown> | null;
}

// --- Helpers ---
function extractTag(rawEvent: Record<string, unknown> | null, tagName: string): string[] | null {
  if (!rawEvent) return null;
  const tags = rawEvent.tags as string[][] | undefined;
  if (!tags || !Array.isArray(tags)) return null;
  return tags.find((t: string[]) => t[0] === tagName) || null;
}

function extractAllTags(rawEvent: Record<string, unknown> | null, tagName: string): string[][] {
  if (!rawEvent) return [];
  const tags = rawEvent.tags as string[][] | undefined;
  if (!tags || !Array.isArray(tags)) return [];
  return tags.filter((t: string[]) => t[0] === tagName);
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '??:??:??';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.round(s)).padStart(2, '0')}`;
}

function metersToKm(meters: number | null): string {
  if (!meters && meters !== 0) return '?.??';
  return (meters / 1000).toFixed(2);
}

let passCount = 0;
let failCount = 0;

function check(label: string, pass: boolean, detail: string) {
  if (pass) {
    passCount++;
    console.log(`  PASS: ${label}`);
    if (detail) console.log(`        ${detail}`);
  } else {
    failCount++;
    console.log(`  FAIL: ${label}`);
    if (detail) console.log(`        ${detail}`);
  }
}

// --- Main ---
async function main() {
  console.log('='.repeat(100));
  console.log('REWARD ROUTING DIAGNOSTIC');
  console.log('='.repeat(100));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  // ====================================================================
  // SECTION 1: TheWildHustle's specific workout
  // ====================================================================
  console.log('SECTION 1: TheWildHustle Workout Check');
  console.log(`  Target ID: ${TARGET_WORKOUT_ID}`);
  console.log('-'.repeat(100));

  const targetResult = await supabaseGet<WorkoutRow[]>(
    `workout_submissions?id=eq.${TARGET_WORKOUT_ID}&select=*`
  );

  if (!targetResult.ok || !targetResult.data?.length) {
    console.log(`  ERROR: Could not fetch workout ${TARGET_WORKOUT_ID}`);
    console.log(`  HTTP ${targetResult.status}: ${targetResult.error}`);
    failCount++;
  } else {
    const w = targetResult.data[0];

    console.log(`  npub:              ${w.npub}`);
    console.log(`  activity_type:     ${w.activity_type}`);
    console.log(`  distance:          ${metersToKm(w.distance_meters)} km`);
    console.log(`  duration:          ${formatDuration(w.duration_seconds)}`);
    console.log(`  created_at:        ${w.created_at}`);
    console.log(`  leaderboard_date:  ${w.leaderboard_date}`);
    console.log(`  source:            ${w.source}`);
    console.log('');

    // Check 1: leaderboard_date
    check(
      'leaderboard_date is correct',
      w.leaderboard_date === EXPECTED_LEADERBOARD_DATE,
      `Expected '${EXPECTED_LEADERBOARD_DATE}', got '${w.leaderboard_date}'`
    );

    // Check 2: raw_event tags
    console.log('');
    console.log('  Raw event tag analysis:');

    const lightningTag = extractTag(w.raw_event, 'lightning');
    const teamTag = extractTag(w.raw_event, 'team');
    const charityTag = extractTag(w.raw_event, 'charity');
    const rewardDestTag = extractTag(w.raw_event, 'reward_destination');
    const exerciseTag = extractTag(w.raw_event, 'exercise');
    const distanceTag = extractTag(w.raw_event, 'distance');
    const durationTag = extractTag(w.raw_event, 'duration');

    console.log(`    lightning tag:          ${lightningTag ? JSON.stringify(lightningTag) : 'NOT FOUND'}`);
    console.log(`    team tag:               ${teamTag ? JSON.stringify(teamTag) : 'NOT FOUND'}`);
    console.log(`    charity tag:            ${charityTag ? JSON.stringify(charityTag) : 'NOT FOUND'}`);
    console.log(`    reward_destination tag: ${rewardDestTag ? JSON.stringify(rewardDestTag) : 'NOT FOUND'}`);
    console.log(`    exercise tag:           ${exerciseTag ? JSON.stringify(exerciseTag) : 'NOT FOUND'}`);
    console.log(`    distance tag:           ${distanceTag ? JSON.stringify(distanceTag) : 'NOT FOUND'}`);
    console.log(`    duration tag:           ${durationTag ? JSON.stringify(durationTag) : 'NOT FOUND'}`);
    console.log('');

    check(
      'lightning tag exists (needed for reward delivery)',
      lightningTag !== null,
      lightningTag ? `Lightning address: ${lightningTag[1]}` : 'No lightning tag -- rewards CANNOT be delivered!'
    );

    check(
      'team tag exists',
      teamTag !== null,
      teamTag ? `Team: ${teamTag[1]}` : 'No team tag (user may not have selected a charity)'
    );

    check(
      'exercise tag exists',
      exerciseTag !== null,
      exerciseTag ? `Exercise: ${exerciseTag[1]}` : 'Missing exercise tag'
    );

    // Print all tags for full visibility
    if (w.raw_event) {
      const allTags = w.raw_event.tags as string[][] | undefined;
      if (allTags && Array.isArray(allTags)) {
        console.log('');
        console.log(`  All tags in raw_event (${allTags.length} total):`);
        for (const tag of allTags) {
          console.log(`    ${JSON.stringify(tag)}`);
        }
      }
    }
  }

  console.log('');

  // ====================================================================
  // SECTION 2: Recent workouts (last 24 hours)
  // ====================================================================
  console.log('='.repeat(100));
  console.log('SECTION 2: Recent Workouts (last 24 hours)');
  console.log('-'.repeat(100));

  // Get workouts from the last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const recentResult = await supabaseGet<WorkoutRow[]>(
    `workout_submissions?created_at=gte.${twentyFourHoursAgo}&select=id,npub,activity_type,leaderboard_date,source,created_at,raw_event,profile_name,distance_meters,duration_seconds&order=created_at.desc&limit=50`
  );

  if (!recentResult.ok || !recentResult.data) {
    console.log(`  ERROR: Could not fetch recent workouts`);
    console.log(`  HTTP ${recentResult.status}: ${recentResult.error}`);
  } else {
    const recent = recentResult.data;
    console.log(`  Found ${recent.length} workouts in last 24 hours`);
    console.log('');

    if (recent.length === 0) {
      console.log('  No recent workouts to analyze.');
    } else {
      // Header
      console.log(
        '  ' +
        'npub'.padEnd(24) +
        'name'.padEnd(16) +
        'activity'.padEnd(12) +
        'lb_date'.padEnd(14) +
        'source'.padEnd(14) +
        'lightning'.padEnd(30) +
        'team'.padEnd(20) +
        'reward_dest'
      );
      console.log('  ' + '-'.repeat(140));

      let missingLightning = 0;
      let totalWithLightning = 0;

      for (const w of recent) {
        const npubShort = (w.npub || '').slice(0, 22) + '..';
        const name = (w.profile_name || '').slice(0, 14).padEnd(16);
        const activity = (w.activity_type || 'unknown').padEnd(12);
        const lbDate = (w.leaderboard_date || 'null').padEnd(14);
        const source = (w.source || 'null').padEnd(14);

        const lightningTag = extractTag(w.raw_event, 'lightning');
        const teamTag = extractTag(w.raw_event, 'team');
        const rewardDestTag = extractTag(w.raw_event, 'reward_destination');

        const lightningVal = lightningTag ? lightningTag[1]?.slice(0, 28) : 'MISSING';
        const teamVal = teamTag ? teamTag[1]?.slice(0, 18) : '-';
        const rewardVal = rewardDestTag ? rewardDestTag[1]?.slice(0, 28) : '-';

        const flag = lightningTag === null ? ' ** NO LIGHTNING **' : '';

        if (lightningTag) {
          totalWithLightning++;
        } else {
          missingLightning++;
        }

        console.log(
          '  ' +
          npubShort.padEnd(24) +
          name +
          activity +
          lbDate +
          source +
          lightningVal.padEnd(30) +
          teamVal.padEnd(20) +
          rewardVal +
          flag
        );
      }

      console.log('  ' + '-'.repeat(140));
      console.log('');
      console.log(`  Summary:`);
      console.log(`    Total workouts:           ${recent.length}`);
      console.log(`    With lightning tag:        ${totalWithLightning}`);
      console.log(`    Missing lightning tag:     ${missingLightning}`);

      check(
        'All recent workouts have lightning tag',
        missingLightning === 0,
        missingLightning > 0
          ? `${missingLightning} workout(s) are MISSING lightning tag and will NOT receive rewards`
          : 'All workouts can receive rewards'
      );

      // Check for diverse sources
      const sources = new Set(recent.map(w => w.source || 'null'));
      console.log(`    Unique sources:           ${Array.from(sources).join(', ')}`);

      // Check leaderboard_date distribution
      const dates = new Map<string, number>();
      for (const w of recent) {
        const d = w.leaderboard_date || 'null';
        dates.set(d, (dates.get(d) || 0) + 1);
      }
      console.log('    Leaderboard dates:');
      for (const [d, count] of Array.from(dates.entries()).sort()) {
        console.log(`      ${d}: ${count} workout(s)`);
      }
    }
  }

  console.log('');

  // ====================================================================
  // SECTION 3: daily_rewards view
  // ====================================================================
  console.log('='.repeat(100));
  console.log('SECTION 3: daily_rewards View Check');
  console.log('-'.repeat(100));

  const dailyRewardsResult = await supabaseGet<any[]>(
    `daily_rewards?select=*&limit=10`
  );

  if (!dailyRewardsResult.ok) {
    if (dailyRewardsResult.status === 404 || dailyRewardsResult.error?.includes('relation') || dailyRewardsResult.error?.includes('does not exist')) {
      console.log('  daily_rewards view does NOT exist (404 or relation not found)');
      console.log(`  HTTP ${dailyRewardsResult.status}: ${dailyRewardsResult.error?.slice(0, 200)}`);
      check('daily_rewards view exists', false, 'View not found -- rewards may be handled differently');
    } else {
      console.log(`  ERROR querying daily_rewards: HTTP ${dailyRewardsResult.status}`);
      console.log(`  ${dailyRewardsResult.error?.slice(0, 300)}`);
      check('daily_rewards view accessible', false, `HTTP ${dailyRewardsResult.status}`);
    }
  } else if (dailyRewardsResult.data && dailyRewardsResult.data.length > 0) {
    console.log(`  daily_rewards view EXISTS with ${dailyRewardsResult.data.length} rows returned`);
    check('daily_rewards view exists', true, `Found ${dailyRewardsResult.data.length} rows`);

    // Show column names from the first row
    const columns = Object.keys(dailyRewardsResult.data[0]);
    console.log(`  Columns: ${columns.join(', ')}`);
    console.log('');

    // Check for zap_to_address column
    const hasZapToAddress = columns.includes('zap_to_address');
    check(
      'daily_rewards has zap_to_address column',
      hasZapToAddress,
      hasZapToAddress ? 'Column found' : `Available columns: ${columns.join(', ')}`
    );

    // Print recent rows
    console.log('');
    console.log('  Recent daily_rewards rows:');
    for (let i = 0; i < Math.min(dailyRewardsResult.data.length, 10); i++) {
      const row = dailyRewardsResult.data[i];
      console.log(`  Row ${i + 1}:`);
      for (const [key, value] of Object.entries(row)) {
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'null');
        console.log(`    ${key}: ${valStr.slice(0, 80)}`);
      }
      console.log('');
    }

    // If zap_to_address exists, check how many are populated
    if (hasZapToAddress) {
      const populated = dailyRewardsResult.data.filter((r: any) => r.zap_to_address && r.zap_to_address !== '');
      const empty = dailyRewardsResult.data.filter((r: any) => !r.zap_to_address || r.zap_to_address === '');

      console.log(`  zap_to_address populated: ${populated.length}/${dailyRewardsResult.data.length}`);
      console.log(`  zap_to_address empty:     ${empty.length}/${dailyRewardsResult.data.length}`);

      check(
        'zap_to_address is populated in daily_rewards',
        populated.length > 0,
        populated.length > 0
          ? `${populated.length} row(s) have zap_to_address set`
          : 'No rows have zap_to_address -- rewards cannot be routed!'
      );
    }
  } else {
    console.log('  daily_rewards view exists but returned 0 rows');
    check('daily_rewards has data', false, 'View is empty');
  }

  // ====================================================================
  // FINAL SUMMARY
  // ====================================================================
  console.log('');
  console.log('='.repeat(100));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(100));
  console.log(`  Total checks: ${passCount + failCount}`);
  console.log(`  PASS: ${passCount}`);
  console.log(`  FAIL: ${failCount}`);
  console.log('');

  if (failCount === 0) {
    console.log('  ALL CHECKS PASSED -- Reward routing appears healthy.');
  } else {
    console.log(`  ${failCount} CHECK(S) FAILED -- Review the details above.`);
  }

  console.log('');
  console.log('='.repeat(100));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(100));

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
