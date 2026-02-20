#!/usr/bin/env tsx
/**
 * Diagnostic Script: Check Jose Sammut's Supabase Workout Data
 *
 * Queries Supabase directly (via REST API) to see exactly what the
 * backend has for Jose's workouts and flagged entries.
 *
 * Usage: npx tsx scripts/diagnostics/check-jose-supabase.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env
dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Jose Sammut's identifiers
const JOSE_NPUB = 'npub1yj69jq9f977y2f7vl96m6stf3rjyf3hym8ekf3g4senlqamz8l3qfsvhk7';
const JOSE_HEX = '24b45900a92fbc4527ccf975bd416988e444c6e4d9f364c5158667f077623fe2';

// --- Supabase REST helper ---
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return response.json();
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
  verified: boolean | null;
  verification_status: string | null;
  source: string | null;
  raw_event: Record<string, unknown> | null;
  leaderboard_date: string | null;
}

interface FlaggedRow {
  id: string;
  event_id: string;
  npub: string;
  reason: string;
  activity_type: string | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  created_at: string;
}

// --- Formatting helpers ---
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

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string): string {
  const labels: Record<string, string> = {
    '2025-12': 'December 2025',
    '2026-01': 'January 2026',
    '2026-02': 'February 2026',
    '2026-03': 'March 2026',
  };
  return labels[key] || key;
}

// --- Main ---
async function main() {
  console.log('='.repeat(80));
  console.log('JOSE SAMMUT - SUPABASE WORKOUT DIAGNOSTIC');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`npub:      ${JOSE_NPUB}`);
  console.log(`hex:       ${JOSE_HEX}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  // ====================================================================
  // 1. Query workout_submissions for Jose (try npub format first)
  // ====================================================================
  console.log('1. Querying workout_submissions...');
  console.log('');

  // Try npub format
  const npubUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${JOSE_NPUB}&select=*&order=created_at.asc`;
  let workouts = await fetchJson<WorkoutRow[]>(npubUrl);

  console.log(`   Results with npub format: ${workouts.length}`);

  // If no results, try hex format
  if (workouts.length === 0) {
    console.log('   No results with npub. Trying hex pubkey...');
    const hexUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${JOSE_HEX}&select=*&order=created_at.asc`;
    workouts = await fetchJson<WorkoutRow[]>(hexUrl);
    console.log(`   Results with hex format: ${workouts.length}`);
  }

  if (workouts.length === 0) {
    console.log('');
    console.log('   NO WORKOUTS FOUND for Jose in workout_submissions.');
    console.log('   Possible causes:');
    console.log('   - Jose has not submitted any workouts to competitions');
    console.log('   - Workouts stored under a different npub');
    console.log('   - All workouts were flagged and moved to flagged_workouts');
  }

  // ====================================================================
  // 2. Print each workout
  // ====================================================================
  if (workouts.length > 0) {
    console.log('');
    console.log('='.repeat(80));
    console.log('ALL WORKOUT SUBMISSIONS (chronological)');
    console.log('='.repeat(80));
    console.log('');

    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i];
      const date = new Date(w.created_at);
      const dateStr = date.toISOString().replace('T', ' ').slice(0, 19);
      const distKm = metersToKm(w.distance_meters);
      const dur = formatDuration(w.duration_seconds);
      const month = getMonthKey(w.created_at);

      console.log(`Workout #${i + 1}`);
      console.log(`  Date:                ${dateStr} UTC`);
      console.log(`  Month:               ${getMonthLabel(month)}`);
      console.log(`  Activity:            ${w.activity_type}`);
      console.log(`  Distance:            ${distKm} km (${w.distance_meters ?? 0} m)`);
      console.log(`  Duration:            ${dur} (${w.duration_seconds ?? 0}s)`);
      console.log(`  Verified:            ${w.verified}`);
      console.log(`  Verification Status: ${w.verification_status}`);
      console.log(`  Source:              ${w.source}`);
      console.log(`  Event ID:            ${w.event_id}`);
      console.log(`  Leaderboard Date:    ${w.leaderboard_date || 'N/A'}`);

      // Check raw_event for team/charity tags
      if (w.raw_event) {
        const tags = w.raw_event.tags as string[][] | undefined;
        if (tags && Array.isArray(tags)) {
          const teamTag = tags.find((t: string[]) => t[0] === 'team');
          if (teamTag) {
            console.log(`  Team Tag:            ${teamTag[1]}`);
          }
        }
      }

      console.log('');
    }
  }

  // ====================================================================
  // 3. Query flagged_workouts for Jose
  // ====================================================================
  console.log('='.repeat(80));
  console.log('FLAGGED WORKOUTS');
  console.log('='.repeat(80));
  console.log('');

  // Try npub format
  const flaggedNpubUrl = `${SUPABASE_URL}/rest/v1/flagged_workouts?npub=eq.${JOSE_NPUB}&select=*&order=created_at.asc`;
  let flagged = await fetchJson<FlaggedRow[]>(flaggedNpubUrl);

  console.log(`   Results with npub format: ${flagged.length}`);

  // If no results, try hex format
  if (flagged.length === 0) {
    const flaggedHexUrl = `${SUPABASE_URL}/rest/v1/flagged_workouts?npub=eq.${JOSE_HEX}&select=*&order=created_at.asc`;
    flagged = await fetchJson<FlaggedRow[]>(flaggedHexUrl);
    console.log(`   Results with hex format: ${flagged.length}`);
  }

  if (flagged.length > 0) {
    console.log('');
    for (let i = 0; i < flagged.length; i++) {
      const f = flagged[i];
      const date = new Date(f.created_at);
      const dateStr = date.toISOString().replace('T', ' ').slice(0, 19);
      const distKm = metersToKm(f.distance_meters);
      const dur = formatDuration(f.duration_seconds);

      console.log(`Flagged #${i + 1}`);
      console.log(`  Date:      ${dateStr} UTC`);
      console.log(`  Activity:  ${f.activity_type}`);
      console.log(`  Distance:  ${distKm} km (${f.distance_meters ?? 0} m)`);
      console.log(`  Duration:  ${dur} (${f.duration_seconds ?? 0}s)`);
      console.log(`  Reason:    ${f.reason}`);
      console.log(`  Event ID:  ${f.event_id}`);
      console.log('');
    }
  } else {
    console.log('   No flagged workouts found for Jose.');
    console.log('');
  }

  // ====================================================================
  // 4. Analysis: Totals by month
  // ====================================================================
  console.log('='.repeat(80));
  console.log('ANALYSIS BY MONTH');
  console.log('='.repeat(80));
  console.log('');

  const byMonth = new Map<string, WorkoutRow[]>();
  for (const w of workouts) {
    const month = getMonthKey(w.created_at);
    const existing = byMonth.get(month) || [];
    existing.push(w);
    byMonth.set(month, existing);
  }

  // Sort months chronologically
  const sortedMonths = Array.from(byMonth.keys()).sort();

  for (const month of sortedMonths) {
    const monthWorkouts = byMonth.get(month)!;
    const totalDistMeters = monthWorkouts.reduce((sum, w) => sum + (w.distance_meters || 0), 0);
    const totalDurSec = monthWorkouts.reduce((sum, w) => sum + (w.duration_seconds || 0), 0);

    console.log(`${getMonthLabel(month)}:`);
    console.log(`  Workouts: ${monthWorkouts.length}`);
    console.log(`  Total Distance: ${metersToKm(totalDistMeters)} km`);
    console.log(`  Total Duration: ${formatDuration(totalDurSec)}`);

    // Break down by activity type
    const byType = new Map<string, { count: number; distMeters: number; durSec: number }>();
    for (const w of monthWorkouts) {
      const t = w.activity_type || 'unknown';
      const existing = byType.get(t) || { count: 0, distMeters: 0, durSec: 0 };
      existing.count++;
      existing.distMeters += w.distance_meters || 0;
      existing.durSec += w.duration_seconds || 0;
      byType.set(t, existing);
    }

    for (const [type, data] of byType) {
      console.log(`    ${type}: ${data.count} workouts, ${metersToKm(data.distMeters)} km, ${formatDuration(data.durSec)}`);
    }
    console.log('');
  }

  // ====================================================================
  // 5. Running totals (what the running leaderboard should show)
  // ====================================================================
  console.log('='.repeat(80));
  console.log('RUNNING WORKOUT TOTALS (Leaderboard Calculation)');
  console.log('='.repeat(80));
  console.log('');

  const runningWorkouts = workouts.filter(w =>
    w.activity_type?.toLowerCase() === 'running'
  );

  const totalRunningDist = runningWorkouts.reduce((sum, w) => sum + (w.distance_meters || 0), 0);
  const totalRunningDur = runningWorkouts.reduce((sum, w) => sum + (w.duration_seconds || 0), 0);

  console.log(`Total Running Workouts: ${runningWorkouts.length}`);
  console.log(`Total Running Distance: ${metersToKm(totalRunningDist)} km`);
  console.log(`Total Running Duration: ${formatDuration(totalRunningDur)}`);
  console.log('');

  // Running by month
  const runByMonth = new Map<string, { count: number; distMeters: number }>();
  for (const w of runningWorkouts) {
    const month = getMonthKey(w.created_at);
    const existing = runByMonth.get(month) || { count: 0, distMeters: 0 };
    existing.count++;
    existing.distMeters += w.distance_meters || 0;
    runByMonth.set(month, existing);
  }

  for (const [month, data] of Array.from(runByMonth.entries()).sort()) {
    console.log(`  ${getMonthLabel(month)}: ${data.count} runs, ${metersToKm(data.distMeters)} km`);
  }
  console.log('');

  // ====================================================================
  // 6. Leaderboard simulation (using same dedup logic as app)
  // ====================================================================
  console.log('='.repeat(80));
  console.log('LEADERBOARD SIMULATION (with dedup logic)');
  console.log('='.repeat(80));
  console.log('');

  // The app uses MAX(steps, GPS) per day and deduplicates by (npub, roundedDist, date)
  // Let's replicate both approaches

  // Approach A: Simple sum (no dedup)
  const simpleSum = runningWorkouts.reduce((sum, w) => sum + (w.distance_meters || 0), 0);

  // Approach B: Dedup by (npub, roundedDist, date) -- same as SupabaseCompetitionService
  const seenKeys = new Set<string>();
  let dedupSum = 0;
  let dedupCount = 0;
  let skippedDuplicates = 0;

  for (const w of runningWorkouts) {
    const roundedDist = Math.round((w.distance_meters || 0) / 10) * 10;
    const dateStr = w.created_at ? w.created_at.split('T')[0] : 'unknown';
    const key = `${w.npub}:${roundedDist}:${dateStr}`;

    if (seenKeys.has(key)) {
      skippedDuplicates++;
      console.log(`  DUPLICATE SKIPPED: ${dateStr} - ${metersToKm(w.distance_meters)} km (key: ${roundedDist}m on ${dateStr})`);
      continue;
    }
    seenKeys.add(key);
    dedupSum += w.distance_meters || 0;
    dedupCount++;
  }

  // Approach C: MAX(steps, GPS) per day -- same as SupabaseCompetitionService for distance competitions
  const dailyData = new Map<string, { gpsKm: number; stepKm: number; gpsCount: number }>();

  for (const w of runningWorkouts) {
    // Check for duplicate first
    const roundedDist = Math.round((w.distance_meters || 0) / 10) * 10;
    const dateStr = w.created_at ? w.created_at.split('T')[0] : 'unknown';
    const isStepWorkout = w.event_id?.startsWith('steps_');
    const distKm = (w.distance_meters || 0) / 1000;

    const current = dailyData.get(dateStr) || { gpsKm: 0, stepKm: 0, gpsCount: 0 };

    if (isStepWorkout) {
      current.stepKm += distKm;
    } else {
      current.gpsKm += distKm;
      current.gpsCount++;
    }

    dailyData.set(dateStr, current);
  }

  let maxPerDaySum = 0;
  for (const [date, daily] of Array.from(dailyData.entries()).sort()) {
    const dayMax = Math.max(daily.stepKm, daily.gpsKm);
    maxPerDaySum += dayMax;
    if (daily.stepKm > 0 && daily.gpsKm > 0) {
      console.log(`  ${date}: GPS=${daily.gpsKm.toFixed(2)}km, Steps=${daily.stepKm.toFixed(2)}km -> MAX=${dayMax.toFixed(2)}km`);
    }
  }

  console.log('');
  console.log('LEADERBOARD RESULTS:');
  console.log(`  A) Simple sum (all running):         ${metersToKm(simpleSum)} km (${runningWorkouts.length} workouts)`);
  console.log(`  B) After dedup (roundedDist+date):   ${metersToKm(dedupSum)} km (${dedupCount} unique, ${skippedDuplicates} dupes)`);
  console.log(`  C) MAX(steps,GPS) per day:           ${maxPerDaySum.toFixed(2)} km`);
  console.log('');

  // ====================================================================
  // 7. All activity types summary
  // ====================================================================
  console.log('='.repeat(80));
  console.log('ALL ACTIVITY TYPES SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  const allByType = new Map<string, { count: number; distMeters: number }>();
  for (const w of workouts) {
    const t = w.activity_type || 'unknown';
    const existing = allByType.get(t) || { count: 0, distMeters: 0 };
    existing.count++;
    existing.distMeters += w.distance_meters || 0;
    allByType.set(t, existing);
  }

  const totalDistAll = workouts.reduce((sum, w) => sum + (w.distance_meters || 0), 0);

  for (const [type, data] of allByType) {
    console.log(`  ${type}: ${data.count} workouts, ${metersToKm(data.distMeters)} km`);
  }
  console.log(`  TOTAL: ${workouts.length} workouts, ${metersToKm(totalDistAll)} km`);
  console.log('');

  // ====================================================================
  // 8. Verification & source breakdown
  // ====================================================================
  console.log('='.repeat(80));
  console.log('VERIFICATION & SOURCE BREAKDOWN');
  console.log('='.repeat(80));
  console.log('');

  const byVerified = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byVerifStatus = new Map<string, number>();

  for (const w of workouts) {
    const v = String(w.verified ?? 'null');
    byVerified.set(v, (byVerified.get(v) || 0) + 1);

    const s = w.source || 'null';
    bySource.set(s, (bySource.get(s) || 0) + 1);

    const vs = w.verification_status || 'null';
    byVerifStatus.set(vs, (byVerifStatus.get(vs) || 0) + 1);
  }

  console.log('By verified flag:');
  for (const [k, v] of byVerified) console.log(`  ${k}: ${v}`);
  console.log('');

  console.log('By source:');
  for (const [k, v] of bySource) console.log(`  ${k}: ${v}`);
  console.log('');

  console.log('By verification_status:');
  for (const [k, v] of byVerifStatus) console.log(`  ${k}: ${v}`);
  console.log('');

  console.log('='.repeat(80));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(80));
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
