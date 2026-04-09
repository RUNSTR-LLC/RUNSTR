#!/usr/bin/env tsx
/**
 * Diagnostic Script: Check user npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum
 *
 * Queries Supabase directly (via REST API) to find all records for this user:
 * 1. workout_submissions (by npub and hex)
 * 2. flagged_workouts (by npub and hex)
 * 3. competition_participants (by npub and hex) - Season 2 registration
 *
 * Usage: npx tsx scripts/diagnostics/check-user-xr8t.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// User identity
const USER_NPUB = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum';
const USER_HEX = '30ceb64e73197a05958c8bd92ab079c815bb44fbfbb3eb5d9766c5207f08bdf5';

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

interface ParticipantRow {
  id: string;
  competition_id: string;
  npub: string;
  name: string | null;
  picture: string | null;
  joined_at: string | null;
  created_at: string | null;
  [key: string]: unknown; // allow extra columns
}

interface CompetitionRow {
  id: string;
  external_id: string;
  name: string;
  activity_type: string | null;
  start_date: string | null;
  end_date: string | null;
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
    '2025-11': 'November 2025',
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
  console.log('USER DIAGNOSTIC: npub1xr8tvn...');
  console.log('='.repeat(90));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`npub:      ${USER_NPUB}`);
  console.log(`hex:       ${USER_HEX}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  // ====================================================================
  // 1. Query workout_submissions
  // ====================================================================
  console.log('='.repeat(90));
  console.log('SECTION 1: WORKOUT SUBMISSIONS');
  console.log('='.repeat(90));
  console.log('');

  // Try npub format
  const subsNpubUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${USER_NPUB}&select=*&order=created_at.asc`;
  let workouts = await fetchJson<WorkoutRow[]>(subsNpubUrl);
  console.log(`  Query by npub: ${workouts.length} results`);

  // Also try hex format
  const subsHexUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${USER_HEX}&select=*&order=created_at.asc`;
  const hexWorkouts = await fetchJson<WorkoutRow[]>(subsHexUrl);
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

  if (workouts.length > 0) {
    console.log('-'.repeat(110));
    console.log('  #  | Date/Time (UTC)      | Activity  | Dist (km) | Duration  | Source      | Verified | Status');
    console.log('-'.repeat(110));

    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i];
      const dateStr = new Date(w.created_at).toISOString().replace('T', ' ').slice(0, 19);
      const distKm = metersToKm(w.distance_meters);
      const dur = formatDuration(w.duration_seconds);
      const src = (w.source || 'null').padEnd(11);
      const verified = String(w.verified ?? 'null').padEnd(8);
      const status = (w.verification_status || 'null');
      const activity = (w.activity_type || 'unknown').padEnd(9);

      console.log(`  ${String(i + 1).padStart(2)} | ${dateStr} | ${activity} | ${distKm.padStart(9)} | ${dur} | ${src} | ${verified} | ${status}`);
    }
    console.log('-'.repeat(110));
    console.log('');

    // Detailed records
    console.log('DETAILED WORKOUT RECORDS:');
    console.log('');
    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i];
      const dateStr = new Date(w.created_at).toISOString().replace('T', ' ').slice(0, 19);

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
      console.log(`    npub stored as:      ${w.npub}`);
      console.log('');
    }

    // Monthly breakdown
    console.log('MONTHLY BREAKDOWN (workout_submissions):');
    const byMonth = new Map<string, { count: number; distMeters: number; durSec: number }>();
    for (const w of workouts) {
      const month = getMonthKey(w.created_at);
      const existing = byMonth.get(month) || { count: 0, distMeters: 0, durSec: 0 };
      existing.count++;
      existing.distMeters += w.distance_meters || 0;
      existing.durSec += w.duration_seconds || 0;
      byMonth.set(month, existing);
    }

    for (const [month, data] of Array.from(byMonth.entries()).sort()) {
      console.log(`  ${getMonthLabel(month)}: ${data.count} workouts, ${metersToKm(data.distMeters)} km, ${formatDuration(data.durSec)}`);
    }
    console.log('');

    // Activity type breakdown
    console.log('ACTIVITY TYPE BREAKDOWN:');
    const byType = new Map<string, { count: number; distMeters: number }>();
    for (const w of workouts) {
      const t = w.activity_type || 'unknown';
      const existing = byType.get(t) || { count: 0, distMeters: 0 };
      existing.count++;
      existing.distMeters += w.distance_meters || 0;
      byType.set(t, existing);
    }

    for (const [type, data] of byType) {
      console.log(`  ${type}: ${data.count} workouts, ${metersToKm(data.distMeters)} km`);
    }
    console.log('');
  } else {
    console.log('  ** NO workout_submissions found for this user **');
    console.log('');
  }

  // ====================================================================
  // 2. Query flagged_workouts
  // ====================================================================
  console.log('='.repeat(90));
  console.log('SECTION 2: FLAGGED WORKOUTS');
  console.log('='.repeat(90));
  console.log('');

  // Try npub format
  const flaggedNpubUrl = `${SUPABASE_URL}/rest/v1/flagged_workouts?npub=eq.${USER_NPUB}&select=*&order=created_at.asc`;
  let flagged = await fetchJson<FlaggedRow[]>(flaggedNpubUrl);
  console.log(`  Query by npub: ${flagged.length} results`);

  // Also try hex format
  const flaggedHexUrl = `${SUPABASE_URL}/rest/v1/flagged_workouts?npub=eq.${USER_HEX}&select=*&order=created_at.asc`;
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
    console.log('-'.repeat(100));
    console.log('  #  | Date/Time (UTC)      | Activity  | Dist (km) | Duration  | Reason');
    console.log('-'.repeat(100));

    for (let i = 0; i < flagged.length; i++) {
      const f = flagged[i];
      const dateStr = new Date(f.created_at).toISOString().replace('T', ' ').slice(0, 19);
      const distKm = metersToKm(f.distance_meters);
      const dur = formatDuration(f.duration_seconds);
      const activity = (f.activity_type || 'unknown').padEnd(9);

      console.log(`  ${String(i + 1).padStart(2)} | ${dateStr} | ${activity} | ${distKm.padStart(9)} | ${dur} | ${f.reason}`);
    }
    console.log('-'.repeat(100));
    console.log('');

    // Detailed records
    console.log('DETAILED FLAGGED RECORDS:');
    console.log('');
    for (let i = 0; i < flagged.length; i++) {
      const f = flagged[i];
      const dateStr = new Date(f.created_at).toISOString().replace('T', ' ').slice(0, 19);

      console.log(`  Flagged #${i + 1}:`);
      console.log(`    Date:       ${dateStr} UTC`);
      console.log(`    Month:      ${getMonthLabel(getMonthKey(f.created_at))}`);
      console.log(`    Activity:   ${f.activity_type}`);
      console.log(`    Distance:   ${metersToKm(f.distance_meters)} km (${f.distance_meters ?? 0} meters)`);
      console.log(`    Duration:   ${formatDuration(f.duration_seconds)} (${f.duration_seconds ?? 0} sec)`);
      console.log(`    Reason:     ${f.reason}`);
      console.log(`    Event ID:   ${f.event_id}`);
      console.log(`    DB Row ID:  ${f.id}`);
      console.log(`    npub stored: ${f.npub}`);
      console.log('');
    }
  } else {
    console.log('  ** NO flagged_workouts found for this user **');
    console.log('');
  }

  // ====================================================================
  // 3. Query competition_participants (Season 2 registration)
  // ====================================================================
  console.log('='.repeat(90));
  console.log('SECTION 3: COMPETITION PARTICIPANTS (Season 2 Registration)');
  console.log('='.repeat(90));
  console.log('');

  // First, get all competitions to find Season 2
  let competitions: CompetitionRow[] = [];
  try {
    const compsUrl = `${SUPABASE_URL}/rest/v1/competitions?select=id,external_id,name,activity_type,start_date,end_date&order=start_date.desc`;
    competitions = await fetchJson<CompetitionRow[]>(compsUrl);
    console.log(`  Found ${competitions.length} competitions:`);
    for (const c of competitions) {
      console.log(`    - ${c.name} (id: ${c.id}, external_id: ${c.external_id}, activity: ${c.activity_type || 'all'}, dates: ${c.start_date || '?'} to ${c.end_date || '?'})`);
    }
    console.log('');
  } catch (err: any) {
    console.log(`  Error querying competitions: ${err.message}`);
    console.log('');
  }

  // Query competition_participants by npub
  const partNpubUrl = `${SUPABASE_URL}/rest/v1/competition_participants?npub=eq.${USER_NPUB}&select=*`;
  let participants = await fetchJson<ParticipantRow[]>(partNpubUrl);
  console.log(`  Query by npub: ${participants.length} results`);

  // Also try hex format
  const partHexUrl = `${SUPABASE_URL}/rest/v1/competition_participants?npub=eq.${USER_HEX}&select=*`;
  const hexParticipants = await fetchJson<ParticipantRow[]>(partHexUrl);
  console.log(`  Query by hex:  ${hexParticipants.length} results`);

  // Merge (dedup by id)
  if (hexParticipants.length > 0) {
    const existingIds = new Set(participants.map(p => p.id));
    for (const hp of hexParticipants) {
      if (!existingIds.has(hp.id)) {
        participants.push(hp);
      }
    }
  }

  console.log(`  Total unique competition_participants entries: ${participants.length}`);
  console.log('');

  if (participants.length > 0) {
    console.log('PARTICIPANT REGISTRATIONS:');
    console.log('');
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const dateVal = p.joined_at || p.created_at || null;
      const joinedStr = dateVal ? new Date(dateVal).toISOString().replace('T', ' ').slice(0, 19) : 'N/A';

      // Find matching competition
      const comp = competitions.find(c => c.id === p.competition_id);
      const compName = comp ? comp.name : `unknown (id: ${p.competition_id})`;

      console.log(`  Registration #${i + 1}:`);
      console.log(`    Competition:     ${compName}`);
      console.log(`    Competition ID:  ${p.competition_id}`);
      console.log(`    Joined at:       ${joinedStr} UTC`);
      console.log(`    Name:            ${p.name || 'N/A'}`);
      console.log(`    Picture:         ${p.picture ? String(p.picture).slice(0, 60) + '...' : 'N/A'}`);
      console.log(`    npub stored as:  ${p.npub}`);
      console.log(`    DB Row ID:       ${p.id}`);

      // Show all columns for debugging
      const knownKeys = new Set(['id', 'competition_id', 'npub', 'name', 'picture', 'joined_at', 'created_at']);
      const extraKeys = Object.keys(p).filter(k => !knownKeys.has(k));
      if (extraKeys.length > 0) {
        console.log(`    Extra columns:`);
        for (const k of extraKeys) {
          const val = p[k];
          const display = typeof val === 'string' && val.length > 80 ? val.slice(0, 80) + '...' : String(val);
          console.log(`      ${k}: ${display}`);
        }
      }
      console.log('');
    }

    // Check Season 2 specifically
    const season2Comps = competitions.filter(c =>
      c.name?.toLowerCase().includes('season 2') ||
      c.name?.toLowerCase().includes('season ii') ||
      c.external_id?.includes('season-2') ||
      c.external_id?.includes('season2')
    );

    if (season2Comps.length > 0) {
      const season2Ids = new Set(season2Comps.map(c => c.id));
      const season2Registrations = participants.filter(p => season2Ids.has(p.competition_id));

      console.log('SEASON 2 REGISTRATION STATUS:');
      if (season2Registrations.length > 0) {
        console.log('  REGISTERED for Season 2');
        for (const reg of season2Registrations) {
          const comp = season2Comps.find(c => c.id === reg.competition_id);
          const dateVal = reg.joined_at || reg.created_at || null;
          const dateStr = dateVal ? new Date(dateVal).toISOString().slice(0, 10) : 'N/A';
          console.log(`    - ${comp?.name || reg.competition_id} (joined: ${dateStr})`);
        }
      } else {
        console.log('  NOT REGISTERED for Season 2');
      }
      console.log('');
    }
  } else {
    console.log('  ** NO competition_participants entries found for this user **');
    console.log('  This means the user has NOT joined any competitions via the app.');
    console.log('');
  }

  // ====================================================================
  // 4. Summary
  // ====================================================================
  console.log('='.repeat(90));
  console.log('SUMMARY');
  console.log('='.repeat(90));
  console.log('');

  console.log(`  User:                    ${USER_NPUB}`);
  console.log(`  Hex:                     ${USER_HEX}`);
  console.log('');
  console.log(`  Workout Submissions:     ${workouts.length}`);
  console.log(`  Flagged Workouts:        ${flagged.length}`);
  console.log(`  Competition Entries:     ${participants.length}`);

  if (workouts.length > 0) {
    const totalDist = workouts.reduce((sum, w) => sum + (w.distance_meters || 0), 0);
    const totalDur = workouts.reduce((sum, w) => sum + (w.duration_seconds || 0), 0);
    console.log('');
    console.log('  Workout Totals:');
    console.log(`    Total Distance:        ${metersToKm(totalDist)} km`);
    console.log(`    Total Duration:        ${formatDuration(totalDur)}`);

    // By activity type
    const byType = new Map<string, { count: number; distMeters: number }>();
    for (const w of workouts) {
      const t = w.activity_type || 'unknown';
      const existing = byType.get(t) || { count: 0, distMeters: 0 };
      existing.count++;
      existing.distMeters += w.distance_meters || 0;
      byType.set(t, existing);
    }
    for (const [type, data] of byType) {
      console.log(`    ${type}: ${data.count} workouts, ${metersToKm(data.distMeters)} km`);
    }
  }

  console.log('');
  console.log('='.repeat(90));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(90));
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
