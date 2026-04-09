#!/usr/bin/env tsx
/**
 * Diagnostic Script: Complete Jose Sammut Supabase Audit
 *
 * Queries EVERY record for Jose across workout_submissions AND flagged_workouts
 * to find missing workouts compared to his local history.
 *
 * Local history (from his device):
 *   - February 2026: 7 workouts, 48.4 km
 *   - January 2026: 4 workouts, 19.8 km
 *   - Total: 11 workouts, 68.2 km
 *
 * Leaderboard shows: 59.8 km with "8 Runs"
 *
 * Usage: npx tsx scripts/diagnostics/check-jose-all-supabase.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const JOSE_NPUB = 'npub1yj69jq9f977y2f7vl96m6stf3rjyf3hym8ekf3g4senlqamz8l3qfsvhk7';
const JOSE_HEX = '24b45900a92fbc4527ccf975bd416988e444c6e4d9f364c5158667f077623fe2';

// His local totals for comparison
const LOCAL_TOTALS = {
  jan2026: { workouts: 4, km: 19.8 },
  feb2026: { workouts: 7, km: 48.4 },
  total: { workouts: 11, km: 68.2 },
};
const LEADERBOARD_SHOWS = { km: 59.8, runs: 8 };

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
  raw_event: Record<string, unknown> | null;
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
  console.log('='.repeat(90));
  console.log('JOSE SAMMUT - COMPLETE SUPABASE AUDIT (workout_submissions + flagged_workouts)');
  console.log('='.repeat(90));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`npub:      ${JOSE_NPUB}`);
  console.log(`hex:       ${JOSE_HEX}`);
  console.log('');
  console.log('LOCAL DEVICE HISTORY:');
  console.log(`  January 2026:  ${LOCAL_TOTALS.jan2026.workouts} workouts, ${LOCAL_TOTALS.jan2026.km} km`);
  console.log(`  February 2026: ${LOCAL_TOTALS.feb2026.workouts} workouts, ${LOCAL_TOTALS.feb2026.km} km`);
  console.log(`  Total:         ${LOCAL_TOTALS.total.workouts} workouts, ${LOCAL_TOTALS.total.km} km`);
  console.log('');
  console.log(`LEADERBOARD SHOWS: ${LEADERBOARD_SHOWS.km} km, ${LEADERBOARD_SHOWS.runs} Runs`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  // ====================================================================
  // 1. Query ALL workout_submissions for Jose
  // ====================================================================
  console.log('='.repeat(90));
  console.log('SECTION 1: ALL WORKOUT SUBMISSIONS');
  console.log('='.repeat(90));
  console.log('');

  // Try npub format first
  let workoutsUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${JOSE_NPUB}&select=*&order=created_at.asc`;
  let workouts = await fetchJson<WorkoutRow[]>(workoutsUrl);
  console.log(`  Query by npub: ${workouts.length} results`);

  // Also try hex format
  const hexWorkoutsUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${JOSE_HEX}&select=*&order=created_at.asc`;
  const hexWorkouts = await fetchJson<WorkoutRow[]>(hexWorkoutsUrl);
  console.log(`  Query by hex:  ${hexWorkouts.length} results`);

  // Merge (dedup by id)
  if (hexWorkouts.length > 0) {
    const existingIds = new Set(workouts.map(w => w.id));
    for (const hw of hexWorkouts) {
      if (!existingIds.has(hw.id)) {
        workouts.push(hw);
      }
    }
    workouts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  console.log(`  Total unique workout_submissions: ${workouts.length}`);
  console.log('');

  // Print each workout in detail
  if (workouts.length > 0) {
    console.log('-'.repeat(90));
    console.log('  #  | Date/Time (UTC)      | Activity  | Dist (km) | Duration  | Source      | Verified | Status');
    console.log('-'.repeat(90));

    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i];
      const date = new Date(w.created_at);
      const dateStr = date.toISOString().replace('T', ' ').slice(0, 19);
      const distKm = metersToKm(w.distance_meters);
      const dur = formatDuration(w.duration_seconds);
      const src = (w.source || 'null').padEnd(11);
      const verified = String(w.verified ?? 'null').padEnd(8);
      const status = (w.verification_status || 'null');
      const activity = (w.activity_type || 'unknown').padEnd(9);

      console.log(`  ${String(i + 1).padStart(2)} | ${dateStr} | ${activity} | ${distKm.padStart(9)} | ${dur} | ${src} | ${verified} | ${status}`);
    }
    console.log('-'.repeat(90));
    console.log('');

    // Detailed breakdown of each workout
    console.log('DETAILED WORKOUT RECORDS:');
    console.log('');
    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i];
      const date = new Date(w.created_at);
      const dateStr = date.toISOString().replace('T', ' ').slice(0, 19);

      console.log(`  Workout #${i + 1}:`);
      console.log(`    Date:                ${dateStr} UTC`);
      console.log(`    Month:               ${getMonthLabel(getMonthKey(w.created_at))}`);
      console.log(`    Activity:            ${w.activity_type}`);
      console.log(`    Distance:            ${metersToKm(w.distance_meters)} km (${w.distance_meters ?? 0} meters)`);
      console.log(`    Duration:            ${formatDuration(w.duration_seconds)} (${w.duration_seconds ?? 0} sec)`);
      console.log(`    Calories:            ${w.calories ?? 'N/A'}`);
      console.log(`    Verified:            ${w.verified}`);
      console.log(`    Verification Status: ${w.verification_status}`);
      console.log(`    Source:              ${w.source}`);
      console.log(`    Event ID:            ${w.event_id}`);
      console.log(`    Leaderboard Date:    ${w.leaderboard_date || 'N/A'}`);
      console.log(`    DB Row ID:           ${w.id}`);
      console.log('');
    }
  } else {
    console.log('  ** NO workout_submissions found for Jose **');
    console.log('');
  }

  // ====================================================================
  // 2. Query ALL flagged_workouts for Jose
  // ====================================================================
  console.log('='.repeat(90));
  console.log('SECTION 2: ALL FLAGGED WORKOUTS');
  console.log('='.repeat(90));
  console.log('');

  // Try npub format
  const flaggedNpubUrl = `${SUPABASE_URL}/rest/v1/flagged_workouts?npub=eq.${JOSE_NPUB}&select=*&order=created_at.asc`;
  let flagged = await fetchJson<FlaggedRow[]>(flaggedNpubUrl);
  console.log(`  Query by npub: ${flagged.length} results`);

  // Also try hex format
  const flaggedHexUrl = `${SUPABASE_URL}/rest/v1/flagged_workouts?npub=eq.${JOSE_HEX}&select=*&order=created_at.asc`;
  const hexFlagged = await fetchJson<FlaggedRow[]>(flaggedHexUrl);
  console.log(`  Query by hex:  ${hexFlagged.length} results`);

  // Merge (dedup by id)
  if (hexFlagged.length > 0) {
    const existingIds = new Set(flagged.map(f => f.id));
    for (const hf of hexFlagged) {
      if (!existingIds.has(hf.id)) {
        flagged.push(hf);
      }
    }
    flagged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  console.log(`  Total unique flagged_workouts: ${flagged.length}`);
  console.log('');

  if (flagged.length > 0) {
    console.log('-'.repeat(90));
    console.log('  #  | Date/Time (UTC)      | Activity  | Dist (km) | Duration  | Reason');
    console.log('-'.repeat(90));

    for (let i = 0; i < flagged.length; i++) {
      const f = flagged[i];
      const date = new Date(f.created_at);
      const dateStr = date.toISOString().replace('T', ' ').slice(0, 19);
      const distKm = metersToKm(f.distance_meters);
      const dur = formatDuration(f.duration_seconds);
      const activity = (f.activity_type || 'unknown').padEnd(9);

      console.log(`  ${String(i + 1).padStart(2)} | ${dateStr} | ${activity} | ${distKm.padStart(9)} | ${dur} | ${f.reason}`);
    }
    console.log('-'.repeat(90));
    console.log('');

    // Detailed breakdown
    console.log('DETAILED FLAGGED RECORDS:');
    console.log('');
    for (let i = 0; i < flagged.length; i++) {
      const f = flagged[i];
      const date = new Date(f.created_at);
      const dateStr = date.toISOString().replace('T', ' ').slice(0, 19);

      console.log(`  Flagged #${i + 1}:`);
      console.log(`    Date:       ${dateStr} UTC`);
      console.log(`    Month:      ${getMonthLabel(getMonthKey(f.created_at))}`);
      console.log(`    Activity:   ${f.activity_type}`);
      console.log(`    Distance:   ${metersToKm(f.distance_meters)} km (${f.distance_meters ?? 0} meters)`);
      console.log(`    Duration:   ${formatDuration(f.duration_seconds)} (${f.duration_seconds ?? 0} sec)`);
      console.log(`    Reason:     ${f.reason}`);
      console.log(`    Event ID:   ${f.event_id}`);
      console.log(`    DB Row ID:  ${f.id}`);
      console.log('');
    }
  } else {
    console.log('  ** NO flagged_workouts found for Jose **');
    console.log('');
  }

  // ====================================================================
  // 3. COMBINED TIMELINE (submissions + flags merged chronologically)
  // ====================================================================
  console.log('='.repeat(90));
  console.log('SECTION 3: COMBINED TIMELINE (Submissions + Flags, Chronological)');
  console.log('='.repeat(90));
  console.log('');

  type TimelineEntry = {
    date: string;
    table: 'workout_submissions' | 'flagged_workouts';
    activity: string;
    distKm: number;
    duration: string;
    source: string;
    verified: string;
    status: string;
    reason: string;
    eventId: string;
  };

  const timeline: TimelineEntry[] = [];

  for (const w of workouts) {
    timeline.push({
      date: new Date(w.created_at).toISOString().replace('T', ' ').slice(0, 19),
      table: 'workout_submissions',
      activity: w.activity_type || 'unknown',
      distKm: (w.distance_meters || 0) / 1000,
      duration: formatDuration(w.duration_seconds),
      source: w.source || 'null',
      verified: String(w.verified ?? 'null'),
      status: w.verification_status || 'null',
      reason: '-',
      eventId: w.event_id,
    });
  }

  for (const f of flagged) {
    timeline.push({
      date: new Date(f.created_at).toISOString().replace('T', ' ').slice(0, 19),
      table: 'flagged_workouts',
      activity: f.activity_type || 'unknown',
      distKm: (f.distance_meters || 0) / 1000,
      duration: formatDuration(f.duration_seconds),
      source: '-',
      verified: '-',
      status: 'FLAGGED',
      reason: f.reason,
      eventId: f.event_id,
    });
  }

  // Sort by date
  timeline.sort((a, b) => a.date.localeCompare(b.date));

  console.log('  #  | Date/Time (UTC)      | Table               | Activity  | Dist (km) | Duration  | Status/Reason');
  console.log('-'.repeat(120));

  for (let i = 0; i < timeline.length; i++) {
    const t = timeline[i];
    const tableLabel = t.table === 'workout_submissions' ? 'SUBMISSION' : 'FLAGGED   ';
    const distStr = t.distKm.toFixed(2).padStart(9);
    const activity = t.activity.padEnd(9);
    const statusOrReason = t.table === 'flagged_workouts' ? `FLAGGED: ${t.reason}` : `verified=${t.verified}, status=${t.status}`;

    console.log(`  ${String(i + 1).padStart(2)} | ${t.date} | ${tableLabel}  | ${activity} | ${distStr} | ${t.duration} | ${statusOrReason}`);
  }

  console.log('-'.repeat(120));
  console.log('');

  // ====================================================================
  // 4. TOTALS AND COMPARISON
  // ====================================================================
  console.log('='.repeat(90));
  console.log('SECTION 4: TOTALS AND COMPARISON WITH LOCAL HISTORY');
  console.log('='.repeat(90));
  console.log('');

  // Running workouts in submissions
  const runningSubmissions = workouts.filter(w => w.activity_type?.toLowerCase() === 'running');
  const totalRunningDistSubmissions = runningSubmissions.reduce((sum, w) => sum + (w.distance_meters || 0), 0);
  const totalRunningDurSubmissions = runningSubmissions.reduce((sum, w) => sum + (w.duration_seconds || 0), 0);

  // All workouts in submissions
  const totalAllDistSubmissions = workouts.reduce((sum, w) => sum + (w.distance_meters || 0), 0);

  // Running workouts in flagged
  const runningFlagged = flagged.filter(f => f.activity_type?.toLowerCase() === 'running');
  const totalRunningDistFlagged = runningFlagged.reduce((sum, f) => sum + (f.distance_meters || 0), 0);

  // All workouts in flagged
  const totalAllDistFlagged = flagged.reduce((sum, f) => sum + (f.distance_meters || 0), 0);

  console.log('WORKOUT_SUBMISSIONS:');
  console.log(`  Total records:            ${workouts.length}`);
  console.log(`  Running workouts:         ${runningSubmissions.length}`);
  console.log(`  Running distance:         ${metersToKm(totalRunningDistSubmissions)} km`);
  console.log(`  Running duration:         ${formatDuration(totalRunningDurSubmissions)}`);
  console.log(`  All-activity distance:    ${metersToKm(totalAllDistSubmissions)} km`);
  console.log('');

  console.log('FLAGGED_WORKOUTS:');
  console.log(`  Total records:            ${flagged.length}`);
  console.log(`  Running workouts:         ${runningFlagged.length}`);
  console.log(`  Running distance:         ${metersToKm(totalRunningDistFlagged)} km`);
  console.log(`  All-activity distance:    ${metersToKm(totalAllDistFlagged)} km`);
  console.log('');

  console.log('COMBINED (Submissions + Flagged):');
  const combinedRunCount = runningSubmissions.length + runningFlagged.length;
  const combinedRunDist = totalRunningDistSubmissions + totalRunningDistFlagged;
  const combinedAllCount = workouts.length + flagged.length;
  const combinedAllDist = totalAllDistSubmissions + totalAllDistFlagged;
  console.log(`  Total records:            ${combinedAllCount}`);
  console.log(`  Running workouts:         ${combinedRunCount}`);
  console.log(`  Running distance:         ${metersToKm(combinedRunDist)} km`);
  console.log(`  All-activity distance:    ${metersToKm(combinedAllDist)} km`);
  console.log('');

  // ====================================================================
  // Monthly breakdown across both tables
  // ====================================================================
  console.log('MONTHLY BREAKDOWN (submissions only):');
  const subsByMonth = new Map<string, { count: number; runCount: number; distMeters: number; runDistMeters: number }>();
  for (const w of workouts) {
    const month = getMonthKey(w.created_at);
    const existing = subsByMonth.get(month) || { count: 0, runCount: 0, distMeters: 0, runDistMeters: 0 };
    existing.count++;
    existing.distMeters += w.distance_meters || 0;
    if (w.activity_type?.toLowerCase() === 'running') {
      existing.runCount++;
      existing.runDistMeters += w.distance_meters || 0;
    }
    subsByMonth.set(month, existing);
  }

  for (const [month, data] of Array.from(subsByMonth.entries()).sort()) {
    console.log(`  ${getMonthLabel(month)}: ${data.count} total (${data.runCount} running), ${metersToKm(data.distMeters)} km total, ${metersToKm(data.runDistMeters)} km running`);
  }
  console.log('');

  console.log('MONTHLY BREAKDOWN (flagged only):');
  const flagsByMonth = new Map<string, { count: number; runCount: number; distMeters: number; runDistMeters: number }>();
  for (const f of flagged) {
    const month = getMonthKey(f.created_at);
    const existing = flagsByMonth.get(month) || { count: 0, runCount: 0, distMeters: 0, runDistMeters: 0 };
    existing.count++;
    existing.distMeters += f.distance_meters || 0;
    if (f.activity_type?.toLowerCase() === 'running') {
      existing.runCount++;
      existing.runDistMeters += f.distance_meters || 0;
    }
    flagsByMonth.set(month, existing);
  }

  if (flagsByMonth.size > 0) {
    for (const [month, data] of Array.from(flagsByMonth.entries()).sort()) {
      console.log(`  ${getMonthLabel(month)}: ${data.count} total (${data.runCount} running), ${metersToKm(data.distMeters)} km total, ${metersToKm(data.runDistMeters)} km running`);
    }
  } else {
    console.log('  (none)');
  }
  console.log('');

  // ====================================================================
  // 5. GAP ANALYSIS
  // ====================================================================
  console.log('='.repeat(90));
  console.log('SECTION 5: GAP ANALYSIS - LOCAL vs SUPABASE');
  console.log('='.repeat(90));
  console.log('');

  const janSubs = subsByMonth.get('2026-01') || { count: 0, runCount: 0, distMeters: 0, runDistMeters: 0 };
  const febSubs = subsByMonth.get('2026-02') || { count: 0, runCount: 0, distMeters: 0, runDistMeters: 0 };
  const janFlags = flagsByMonth.get('2026-01') || { count: 0, runCount: 0, distMeters: 0, runDistMeters: 0 };
  const febFlags = flagsByMonth.get('2026-02') || { count: 0, runCount: 0, distMeters: 0, runDistMeters: 0 };

  console.log('JANUARY 2026:');
  console.log(`  Local:       ${LOCAL_TOTALS.jan2026.workouts} workouts, ${LOCAL_TOTALS.jan2026.km} km`);
  console.log(`  Submissions: ${janSubs.count} workouts, ${metersToKm(janSubs.distMeters)} km`);
  console.log(`  Flagged:     ${janFlags.count} workouts, ${metersToKm(janFlags.distMeters)} km`);
  console.log(`  MISSING:     ${LOCAL_TOTALS.jan2026.workouts - janSubs.count - janFlags.count} workouts, ${(LOCAL_TOTALS.jan2026.km - (janSubs.distMeters + janFlags.distMeters) / 1000).toFixed(2)} km`);
  console.log('');

  console.log('FEBRUARY 2026:');
  console.log(`  Local:       ${LOCAL_TOTALS.feb2026.workouts} workouts, ${LOCAL_TOTALS.feb2026.km} km`);
  console.log(`  Submissions: ${febSubs.count} workouts, ${metersToKm(febSubs.distMeters)} km`);
  console.log(`  Flagged:     ${febFlags.count} workouts, ${metersToKm(febFlags.distMeters)} km`);
  console.log(`  MISSING:     ${LOCAL_TOTALS.feb2026.workouts - febSubs.count - febFlags.count} workouts, ${(LOCAL_TOTALS.feb2026.km - (febSubs.distMeters + febFlags.distMeters) / 1000).toFixed(2)} km`);
  console.log('');

  console.log('OVERALL:');
  const totalSubsCount = workouts.length;
  const totalFlagsCount = flagged.length;
  const totalSubsDist = totalAllDistSubmissions / 1000;
  const totalFlagsDist = totalAllDistFlagged / 1000;
  console.log(`  Local:       ${LOCAL_TOTALS.total.workouts} workouts, ${LOCAL_TOTALS.total.km} km`);
  console.log(`  Submissions: ${totalSubsCount} workouts, ${totalSubsDist.toFixed(2)} km`);
  console.log(`  Flagged:     ${totalFlagsCount} workouts, ${totalFlagsDist.toFixed(2)} km`);
  console.log(`  Combined:    ${totalSubsCount + totalFlagsCount} workouts, ${(totalSubsDist + totalFlagsDist).toFixed(2)} km`);
  console.log(`  MISSING:     ${LOCAL_TOTALS.total.workouts - totalSubsCount - totalFlagsCount} workouts, ${(LOCAL_TOTALS.total.km - totalSubsDist - totalFlagsDist).toFixed(2)} km`);
  console.log('');

  // ====================================================================
  // 6. LEADERBOARD COMPARISON
  // ====================================================================
  console.log('='.repeat(90));
  console.log('SECTION 6: LEADERBOARD COMPARISON');
  console.log('='.repeat(90));
  console.log('');

  console.log(`Leaderboard shows:         ${LEADERBOARD_SHOWS.km} km, ${LEADERBOARD_SHOWS.runs} Runs`);
  console.log(`Submissions (running only): ${metersToKm(totalRunningDistSubmissions)} km, ${runningSubmissions.length} Runs`);
  console.log('');

  if (runningSubmissions.length !== LEADERBOARD_SHOWS.runs) {
    console.log(`** MISMATCH: Leaderboard says ${LEADERBOARD_SHOWS.runs} runs but Supabase has ${runningSubmissions.length} running submissions`);
  }

  const subRunKm = totalRunningDistSubmissions / 1000;
  if (Math.abs(subRunKm - LEADERBOARD_SHOWS.km) > 0.5) {
    console.log(`** MISMATCH: Leaderboard says ${LEADERBOARD_SHOWS.km} km but Supabase submissions total ${subRunKm.toFixed(2)} km running`);
  }

  // Check for duplicates by event_id
  const eventIds = workouts.map(w => w.event_id);
  const uniqueEventIds = new Set(eventIds);
  if (eventIds.length !== uniqueEventIds.size) {
    console.log('');
    console.log(`** DUPLICATE EVENT IDS DETECTED: ${eventIds.length} records but only ${uniqueEventIds.size} unique event_ids`);
    const counts = new Map<string, number>();
    for (const eid of eventIds) {
      counts.set(eid, (counts.get(eid) || 0) + 1);
    }
    for (const [eid, count] of counts) {
      if (count > 1) {
        console.log(`   Event ID ${eid}: appears ${count} times`);
      }
    }
  }

  // Check for shared event_ids between submissions and flagged
  const flagEventIds = new Set(flagged.map(f => f.event_id));
  const sharedEventIds = [...uniqueEventIds].filter(eid => flagEventIds.has(eid));
  if (sharedEventIds.length > 0) {
    console.log('');
    console.log(`** EVENT IDS IN BOTH TABLES: ${sharedEventIds.length} event_ids appear in both workout_submissions and flagged_workouts`);
    for (const eid of sharedEventIds) {
      console.log(`   ${eid}`);
    }
  }

  console.log('');
  console.log('='.repeat(90));
  console.log('AUDIT COMPLETE');
  console.log('='.repeat(90));
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
