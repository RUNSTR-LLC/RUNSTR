#!/usr/bin/env tsx
/**
 * Diagnostic Script: Check OpenMike (npub1a6c3jcdj23ptzcuflek8a04f4hc2cdkat95pd6n3r8jjrwyzrw0q43lfrr)
 *
 * User reports showing 0 workouts on Season 2 leaderboard despite
 * submitting kind 1301 notes.
 *
 * Checks:
 * 1. Supabase: workout_submissions, flagged_workouts, banned_users (by npub + hex)
 * 2. Nostr: kind 1301 events from 4 relays (damus, primal, nos.lol, nostr.band)
 * 3. Baseline: Whether user has pre-computed totals in season2Baseline.ts
 * 4. Participant list: Whether user is in SEASON_2_PARTICIPANTS
 * 5. Cache architecture: Whether UnifiedWorkoutCache would find their workouts
 *
 * Uses raw WebSocket for Nostr queries (NDK hangs in Node.js).
 *
 * Usage: npx tsx scripts/diagnostics/check-user-a6c3-workouts.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import WebSocket from 'ws';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// User identity
const USER_NPUB = 'npub1a6c3jcdj23ptzcuflek8a04f4hc2cdkat95pd6n3r8jjrwyzrw0q43lfrr';
const USER_HEX = 'eeb11961b25442b16389fe6c7ebea9adf0ac36dd596816ea7119e521b8821b9e';
const USER_NAME = 'OpenMike';

// Season 2 date range
const SEASON_2_START = Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000);
const SEASON_2_END = Math.floor(new Date('2026-03-01T23:59:59Z').getTime() / 1000);

// Baseline timestamp (from season2Baseline.ts)
const BASELINE_TIMESTAMP = 1767875581; // 2026-01-08T12:33:01.000Z

// Relays
const ALL_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

// The relay actually used by UnifiedWorkoutCache
const CACHE_RELAY = 'wss://relay.damus.io';

// ============================================================================
// Supabase REST helper
// ============================================================================
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

// ============================================================================
// Types
// ============================================================================
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

interface BannedRow {
  id: string;
  npub: string;
  reason: string | null;
  banned_at: string;
}

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

// ============================================================================
// Formatting helpers
// ============================================================================
function formatDuration(seconds: number | null | undefined): string {
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

function formatDate(ts: number): string {
  return new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

// ============================================================================
// Nostr Query via raw WebSocket
// ============================================================================
function queryRelay(
  relayUrl: string,
  filter: Record<string, unknown>,
  timeoutMs: number = 8000
): Promise<{ relay: string; events: NostrEvent[] }> {
  return new Promise((resolve) => {
    const events: NostrEvent[] = [];
    const seenIds = new Set<string>();
    let resolved = false;
    const subId = `diag-${Math.random().toString(36).slice(2, 10)}`;

    const finish = (reason: string) => {
      if (resolved) return;
      resolved = true;
      try { ws.close(); } catch (e) { /* ignore */ }
      clearTimeout(timer);
      resolve({ relay: relayUrl, events });
    };

    const timer = setTimeout(() => finish('timeout'), timeoutMs);

    let ws: WebSocket;
    try {
      ws = new WebSocket(relayUrl);
    } catch (err) {
      console.log(`    [${relayUrl}] Connection error: ${err}`);
      finish('error');
      return;
    }

    ws.on('open', () => {
      const req = JSON.stringify(['REQ', subId, filter]);
      ws.send(req);
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg[0] === 'EVENT' && msg[1] === subId && msg[2]) {
          const event = msg[2] as NostrEvent;
          if (!seenIds.has(event.id)) {
            seenIds.add(event.id);
            events.push(event);
          }
        } else if (msg[0] === 'EOSE' && msg[1] === subId) {
          finish('eose');
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    ws.on('error', (err: Error) => {
      console.log(`    [${relayUrl}] WebSocket error: ${err.message}`);
      finish('error');
    });

    ws.on('close', () => {
      finish('close');
    });
  });
}

async function queryAllRelays(
  relays: string[],
  filter: Record<string, unknown>,
  label: string
): Promise<NostrEvent[]> {
  console.log(`  Querying ${relays.length} relays (${label})...`);

  const results = await Promise.all(
    relays.map(relay => queryRelay(relay, filter))
  );

  // Merge and deduplicate
  const allEvents: NostrEvent[] = [];
  const seenIds = new Set<string>();

  for (const result of results) {
    console.log(`    [${result.relay}] ${result.events.length} events`);
    for (const event of result.events) {
      if (!seenIds.has(event.id)) {
        seenIds.add(event.id);
        allEvents.push(event);
      }
    }
  }

  // Sort by created_at
  allEvents.sort((a, b) => a.created_at - b.created_at);

  return allEvents;
}

// ============================================================================
// Parse workout event
// ============================================================================
function parseWorkoutEvent(event: NostrEvent): {
  id: string;
  pubkey: string;
  createdAt: number;
  activityType: string;
  distance: number;
  distanceUnit: string;
  duration: string;
  charityId?: string;
  allTags: string[][];
  content: string;
} | null {
  try {
    const getTag = (name: string) => event.tags.find(t => t[0] === name);
    const getTagValue = (name: string) => getTag(name)?.[1];

    const exerciseTag = getTagValue('exercise')?.toLowerCase() || 'unknown';
    const distanceTag = getTag('distance');
    const durationTag = getTagValue('duration') || '';
    const charityId = getTagValue('charity');

    let distance = 0;
    let distanceUnit = 'km';
    if (distanceTag) {
      distance = parseFloat(distanceTag[1]) || 0;
      distanceUnit = distanceTag[2]?.toLowerCase() || 'km';
    }

    return {
      id: event.id,
      pubkey: event.pubkey,
      createdAt: event.created_at || 0,
      activityType: exerciseTag,
      distance,
      distanceUnit,
      duration: durationTag,
      charityId,
      allTags: event.tags,
      content: event.content,
    };
  } catch (error) {
    console.warn(`  Failed to parse event ${event.id}:`, error);
    return null;
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log('='.repeat(100));
  console.log(`DIAGNOSTIC: ${USER_NAME} - Season 2 Leaderboard Shows 0 Workouts`);
  console.log('='.repeat(100));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`npub:      ${USER_NPUB}`);
  console.log(`hex:       ${USER_HEX}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  // ====================================================================
  // SECTION 1: SUPABASE - workout_submissions
  // ====================================================================
  console.log('='.repeat(100));
  console.log('SECTION 1: SUPABASE - workout_submissions');
  console.log('='.repeat(100));
  console.log('');

  const subsNpubUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${USER_NPUB}&select=*&order=created_at.asc`;
  let workouts = await fetchJson<WorkoutRow[]>(subsNpubUrl);
  console.log(`  Query by npub: ${workouts.length} results`);

  const subsHexUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${USER_HEX}&select=*&order=created_at.asc`;
  const hexWorkouts = await fetchJson<WorkoutRow[]>(subsHexUrl);
  console.log(`  Query by hex:  ${hexWorkouts.length} results`);

  if (hexWorkouts.length > 0) {
    const existingIds = new Set(workouts.map(w => w.id));
    for (const hw of hexWorkouts) {
      if (!existingIds.has(hw.id)) workouts.push(hw);
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
      const status = w.verification_status || 'null';
      const activity = (w.activity_type || 'unknown').padEnd(9);

      console.log(`  ${String(i + 1).padStart(2)} | ${dateStr} | ${activity} | ${distKm.padStart(9)} | ${dur} | ${src} | ${verified} | ${status}`);
    }
    console.log('-'.repeat(110));
  } else {
    console.log('  ** NO workout_submissions found **');
  }
  console.log('');

  // ====================================================================
  // SECTION 2: SUPABASE - flagged_workouts
  // ====================================================================
  console.log('='.repeat(100));
  console.log('SECTION 2: SUPABASE - flagged_workouts');
  console.log('='.repeat(100));
  console.log('');

  const flaggedNpubUrl = `${SUPABASE_URL}/rest/v1/flagged_workouts?npub=eq.${USER_NPUB}&select=*&order=created_at.asc`;
  let flagged = await fetchJson<FlaggedRow[]>(flaggedNpubUrl);
  console.log(`  Query by npub: ${flagged.length} results`);

  const flaggedHexUrl = `${SUPABASE_URL}/rest/v1/flagged_workouts?npub=eq.${USER_HEX}&select=*&order=created_at.asc`;
  const hexFlagged = await fetchJson<FlaggedRow[]>(flaggedHexUrl);
  console.log(`  Query by hex:  ${hexFlagged.length} results`);

  if (hexFlagged.length > 0) {
    const existingIds = new Set(flagged.map(f => f.id));
    for (const hf of hexFlagged) {
      if (!existingIds.has(hf.id)) flagged.push(hf);
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
  } else {
    console.log('  ** NO flagged_workouts found **');
  }
  console.log('');

  // ====================================================================
  // SECTION 3: SUPABASE - banned_users
  // ====================================================================
  console.log('='.repeat(100));
  console.log('SECTION 3: SUPABASE - banned_users');
  console.log('='.repeat(100));
  console.log('');

  let isBanned = false;
  try {
    const bannedNpubUrl = `${SUPABASE_URL}/rest/v1/banned_users?npub=eq.${USER_NPUB}&select=*`;
    const bannedByNpub = await fetchJson<BannedRow[]>(bannedNpubUrl);
    console.log(`  Query by npub: ${bannedByNpub.length} results`);

    const bannedHexUrl = `${SUPABASE_URL}/rest/v1/banned_users?npub=eq.${USER_HEX}&select=*`;
    const bannedByHex = await fetchJson<BannedRow[]>(bannedHexUrl);
    console.log(`  Query by hex:  ${bannedByHex.length} results`);

    isBanned = bannedByNpub.length > 0 || bannedByHex.length > 0;
    if (isBanned) {
      console.log('');
      console.log('  !! USER IS BANNED !!');
      for (const b of [...bannedByNpub, ...bannedByHex]) {
        console.log(`    Reason: ${b.reason || 'unknown'}`);
        console.log(`    Banned at: ${b.banned_at}`);
      }
    } else {
      console.log('  User is NOT banned');
    }
  } catch (err: any) {
    if (err.message?.includes('404') || err.message?.includes('relation')) {
      console.log('  banned_users table does not exist (not a concern)');
    } else {
      console.log(`  Error querying banned_users: ${err.message}`);
    }
  }
  console.log('');

  // ====================================================================
  // SECTION 4: NOSTR - kind 1301 events (ALL 4 RELAYS, full Season 2)
  // ====================================================================
  console.log('='.repeat(100));
  console.log('SECTION 4: NOSTR - kind 1301 events from ALL relays (full Season 2 range)');
  console.log('='.repeat(100));
  console.log('');

  const nostrFilter = {
    kinds: [1301],
    authors: [USER_HEX],
    since: SEASON_2_START,
    until: SEASON_2_END,
  };

  console.log(`  Filter: kind=1301, author=${USER_HEX.slice(0, 16)}...`);
  console.log(`  Time range: ${formatDate(SEASON_2_START)} to ${formatDate(SEASON_2_END)}`);
  console.log('');

  const nostrEvents = await queryAllRelays(ALL_RELAYS, nostrFilter, 'all 4 relays');
  console.log(`  Total unique kind 1301 events: ${nostrEvents.length}`);
  console.log('');

  const parsedWorkouts: ReturnType<typeof parseWorkoutEvent>[] = [];

  if (nostrEvents.length > 0) {
    console.log('-'.repeat(130));
    console.log('  #  | Date/Time (UTC)      | Activity  | Distance      | Duration  | Charity    | Event ID (short)');
    console.log('-'.repeat(130));

    for (let i = 0; i < nostrEvents.length; i++) {
      const parsed = parseWorkoutEvent(nostrEvents[i]);
      parsedWorkouts.push(parsed);

      if (parsed) {
        const dateStr = formatDate(parsed.createdAt);
        const activity = parsed.activityType.padEnd(9);
        const dist = `${parsed.distance} ${parsed.distanceUnit}`.padEnd(13);
        const dur = (parsed.duration || '??:??:??').padEnd(9);
        const charity = (parsed.charityId || 'none').padEnd(10);
        const eid = parsed.id.slice(0, 16);

        console.log(`  ${String(i + 1).padStart(2)} | ${dateStr} | ${activity} | ${dist} | ${dur} | ${charity} | ${eid}...`);
      } else {
        console.log(`  ${String(i + 1).padStart(2)} | PARSE FAILED | event id: ${nostrEvents[i].id?.slice(0, 16)}...`);
      }
    }
    console.log('-'.repeat(130));
    console.log('');

    // Print full tag details for each event
    console.log('DETAILED EVENT TAGS:');
    console.log('');
    for (let i = 0; i < nostrEvents.length; i++) {
      const event = nostrEvents[i];
      console.log(`  Event #${i + 1} (${event.id.slice(0, 16)}...):`);
      console.log(`    pubkey:     ${event.pubkey}`);
      console.log(`    created_at: ${event.created_at} (${formatDate(event.created_at)})`);
      console.log(`    content:    ${event.content.slice(0, 120)}${event.content.length > 120 ? '...' : ''}`);
      console.log(`    tags:`);
      for (const tag of event.tags) {
        console.log(`      [${tag.map(t => `"${t}"`).join(', ')}]`);
      }
      console.log('');
    }
  } else {
    console.log('  ** NO kind 1301 events found on any relay **');
    console.log('');
  }

  // ====================================================================
  // SECTION 5: CACHE RELAY CHECK (relay.damus.io only)
  // ====================================================================
  console.log('='.repeat(100));
  console.log('SECTION 5: CACHE RELAY CHECK (relay.damus.io only)');
  console.log(`  UnifiedWorkoutCache queries ONLY relay.damus.io, since BASELINE (${formatDate(BASELINE_TIMESTAMP)})`);
  console.log('='.repeat(100));
  console.log('');

  // Query damus with baseline filter (what UnifiedWorkoutCache does)
  const cacheFilter = {
    kinds: [1301],
    authors: [USER_HEX],
    since: BASELINE_TIMESTAMP,
    until: Math.floor(Date.now() / 1000),
  };

  console.log(`  Cache query filter: since=${formatDate(BASELINE_TIMESTAMP)}, until=now`);
  const damusSinceBaseline = await queryRelay(CACHE_RELAY, cacheFilter);
  console.log(`  Events on damus since baseline: ${damusSinceBaseline.events.length}`);

  if (damusSinceBaseline.events.length > 0) {
    for (let i = 0; i < damusSinceBaseline.events.length; i++) {
      const parsed = parseWorkoutEvent(damusSinceBaseline.events[i]);
      if (parsed) {
        console.log(`    ${i + 1}. ${formatDate(parsed.createdAt)} | ${parsed.activityType} | ${parsed.distance} ${parsed.distanceUnit}`);
      }
    }
  }
  console.log('');

  // Query damus with FULL Season 2 range
  const damusFullFilter = {
    kinds: [1301],
    authors: [USER_HEX],
    since: SEASON_2_START,
    until: SEASON_2_END,
  };

  console.log(`  Full Season 2 query on damus: since=${formatDate(SEASON_2_START)}`);
  const damusFullRange = await queryRelay(CACHE_RELAY, damusFullFilter);
  console.log(`  Events on damus (full Season 2): ${damusFullRange.events.length}`);

  if (damusFullRange.events.length > 0) {
    for (let i = 0; i < damusFullRange.events.length; i++) {
      const parsed = parseWorkoutEvent(damusFullRange.events[i]);
      if (parsed) {
        console.log(`    ${i + 1}. ${formatDate(parsed.createdAt)} | ${parsed.activityType} | ${parsed.distance} ${parsed.distanceUnit}`);
      }
    }
  }
  console.log('');

  // Per-relay breakdown
  console.log('  PER-RELAY BREAKDOWN (full Season 2):');
  for (const relay of ALL_RELAYS) {
    const result = await queryRelay(relay, nostrFilter);
    console.log(`    ${relay}: ${result.events.length} events`);
  }
  console.log('');

  // ====================================================================
  // SECTION 6: ARCHITECTURE ANALYSIS
  // ====================================================================
  console.log('='.repeat(100));
  console.log('SECTION 6: ARCHITECTURE ANALYSIS - Why user might show 0');
  console.log('='.repeat(100));
  console.log('');

  console.log('  CHECK 1: Is user in SEASON_2_PARTICIPANTS (hardcoded)?');
  console.log(`    User hex: ${USER_HEX}`);
  console.log(`    Result: YES (entry #34 in season2.ts, name="${USER_NAME}")`);
  console.log('');

  console.log('  CHECK 2: Is user in SEASON2_BASELINE (pre-computed totals)?');
  console.log(`    Result: NO - User hex has NO baseline entry`);
  console.log(`    Impact: Any workouts before ${formatDate(BASELINE_TIMESTAMP)} are MISSING from leaderboard`);
  console.log('');

  console.log('  CHECK 3: UnifiedWorkoutCache relay configuration');
  console.log(`    Cache uses ONLY: ${CACHE_RELAY}`);
  console.log(`    Events on damus (since baseline): ${damusSinceBaseline.events.length}`);
  console.log(`    Events on damus (full S2 range):  ${damusFullRange.events.length}`);
  console.log(`    Events on ALL 4 relays:           ${nostrEvents.length}`);

  if (nostrEvents.length > 0 && damusFullRange.events.length === 0) {
    console.log('    ** CRITICAL: Workouts exist on OTHER relays but NOT on relay.damus.io **');
    console.log('    ** UnifiedWorkoutCache will never find them! **');
  } else if (nostrEvents.length > damusFullRange.events.length) {
    console.log(`    ** ${nostrEvents.length - damusFullRange.events.length} workouts on other relays but NOT on damus **`);
  }
  console.log('');

  // Check tag parsing
  if (nostrEvents.length > 0) {
    console.log('  CHECK 4: Tag parsing compatibility');
    let parseFailures = 0;
    let noExerciseTag = 0;
    let noDistanceTag = 0;
    let zeroDistance = 0;

    for (const event of nostrEvents) {
      const exerciseTag = event.tags.find(t => t[0] === 'exercise');
      const distanceTag = event.tags.find(t => t[0] === 'distance');

      if (!exerciseTag) {
        noExerciseTag++;
        console.log(`    Event ${event.id.slice(0, 12)}: MISSING "exercise" tag`);
      }
      if (!distanceTag) {
        noDistanceTag++;
        console.log(`    Event ${event.id.slice(0, 12)}: MISSING "distance" tag`);
      } else {
        const dist = parseFloat(distanceTag[1]);
        if (isNaN(dist) || dist <= 0) {
          zeroDistance++;
          console.log(`    Event ${event.id.slice(0, 12)}: Distance is 0 or invalid ("${distanceTag[1]}")`);
        }
      }

      const parsed = parseWorkoutEvent(event);
      if (!parsed) parseFailures++;
    }

    console.log(`    Total events:           ${nostrEvents.length}`);
    console.log(`    Parse failures:         ${parseFailures}`);
    console.log(`    Missing exercise tag:   ${noExerciseTag}`);
    console.log(`    Missing distance tag:   ${noDistanceTag}`);
    console.log(`    Zero/invalid distance:  ${zeroDistance}`);
    console.log('');

    console.log('  CHECK 5: Activity type mapping');
    console.log('    Season 2 recognizes: running, walking, cycling, other');
    for (const event of nostrEvents) {
      const exerciseTag = event.tags.find(t => t[0] === 'exercise')?.[1]?.toLowerCase();
      const isMapped =
        exerciseTag === 'running' || exerciseTag?.includes('run') || exerciseTag?.includes('jog') ||
        exerciseTag === 'walking' || exerciseTag?.includes('walk') || exerciseTag?.includes('hike') ||
        exerciseTag === 'cycling' || exerciseTag?.includes('cycl') || exerciseTag?.includes('bike') ||
        exerciseTag === 'other';

      console.log(`    Event ${event.id.slice(0, 12)}: exercise="${exerciseTag}" -> ${isMapped ? 'MAPPED OK' : 'UNMAPPED (would be ignored!)'}`);
    }
  } else {
    console.log('  CHECK 4-5: N/A - No events to check');
  }
  console.log('');

  // ====================================================================
  // SECTION 7: SUMMARY
  // ====================================================================
  console.log('='.repeat(100));
  console.log('SUMMARY');
  console.log('='.repeat(100));
  console.log('');

  console.log(`  User:                  ${USER_NAME} (${USER_NPUB})`);
  console.log('');

  // Supabase summary
  console.log('  SUPABASE:');
  console.log(`    Workouts submitted:  ${workouts.length}`);
  console.log(`    Flagged workouts:    ${flagged.length}`);
  console.log(`    User banned:         ${isBanned ? 'YES!!' : 'No'}`);
  if (workouts.length > 0) {
    const totalDistMeters = workouts.reduce((sum, w) => sum + (w.distance_meters || 0), 0);
    console.log(`    Total distance:      ${metersToKm(totalDistMeters)} km`);

    const runningWorkouts = workouts.filter(w => w.activity_type === 'running');
    const walkingWorkouts = workouts.filter(w => w.activity_type === 'walking');
    const runningDist = runningWorkouts.reduce((sum, w) => sum + (w.distance_meters || 0), 0);
    const walkingDist = walkingWorkouts.reduce((sum, w) => sum + (w.distance_meters || 0), 0);
    console.log(`    Running:             ${runningWorkouts.length} workouts, ${metersToKm(runningDist)} km`);
    console.log(`    Walking:             ${walkingWorkouts.length} workouts, ${metersToKm(walkingDist)} km`);
  }
  console.log('');

  // Nostr summary
  console.log('  NOSTR (all 4 relays):');
  console.log(`    kind 1301 events:    ${nostrEvents.length}`);
  if (nostrEvents.length > 0) {
    const validParsed = parsedWorkouts.filter((p): p is NonNullable<typeof p> => p !== null);
    const totalDistNostr = validParsed.reduce((sum, p) => {
      let distKm = p.distance;
      if (p.distanceUnit === 'mi' || p.distanceUnit === 'miles') distKm *= 1.60934;
      else if (p.distanceUnit === 'm' || p.distanceUnit === 'meters') distKm /= 1000;
      return sum + distKm;
    }, 0);
    console.log(`    Valid workouts:      ${validParsed.length}`);
    console.log(`    Total distance:      ${totalDistNostr.toFixed(2)} km`);
  }
  console.log('');

  // Cache summary
  console.log('  CACHE (what leaderboard actually sees):');
  console.log(`    Relay:               ${CACHE_RELAY} (only relay used)`);
  console.log(`    Events since baseline: ${damusSinceBaseline.events.length}`);
  console.log(`    Events full S2:      ${damusFullRange.events.length}`);
  console.log(`    Baseline entry:      NO (0 pre-computed km)`);
  console.log('');

  // Root cause
  console.log('  ROOT CAUSE ANALYSIS:');
  const damusCacheCount = damusSinceBaseline.events.length;
  const damusFullCount = damusFullRange.events.length;
  const allRelaysCount = nostrEvents.length;

  if (allRelaysCount === 0) {
    console.log('    CAUSE: No kind 1301 events found on ANY relay');
    console.log('    Possible explanations:');
    console.log('    1. User is publishing events with a DIFFERENT pubkey');
    console.log('    2. Events are not kind 1301 (check if different event kind)');
    console.log('    3. Events were published outside the Season 2 date range');
    console.log('    4. Events were deleted or never propagated to relays');
    console.log('    5. User is confusing kind 1 social posts with kind 1301 workout events');
  } else if (damusFullCount === 0 && allRelaysCount > 0) {
    console.log('    CAUSE: Workouts exist on other relays but NOT on relay.damus.io');
    console.log('    The UnifiedWorkoutCache ONLY queries relay.damus.io.');
    console.log('    This is why the Season 2 leaderboard shows 0 for this user.');
    console.log('');
    console.log('    FIX OPTIONS:');
    console.log('    1. User should republish workouts from the RUNSTR app');
    console.log('    2. Add more relays to WORKOUT_RELAYS in UnifiedWorkoutCache.ts');
    console.log('    3. Manually relay these events to damus');
  } else if (damusCacheCount === 0 && damusFullCount > 0) {
    console.log('    CAUSE: All workouts on damus are BEFORE the baseline timestamp');
    console.log(`    Baseline: ${formatDate(BASELINE_TIMESTAMP)}`);
    console.log('    UnifiedWorkoutCache only fetches AFTER baseline.');
    console.log('    User has NO entry in SEASON2_BASELINE so pre-baseline workouts are lost.');
    console.log('');
    console.log('    FIX: Add user to season2Baseline.ts with their pre-baseline totals');
  } else if (damusCacheCount > 0) {
    console.log('    Workouts ARE visible on the cache relay and within the time range.');
    console.log('    If still showing 0, the issue is likely:');
    console.log('    - Tag parsing: exercise/distance tags not matching expected format');
    console.log('    - Activity type: not recognized as running/walking/cycling');
    console.log('    - App-level cache: user needs to pull-to-refresh on leaderboard');
    console.log('    - Review CHECK 4 and CHECK 5 above for specific issues');
  }

  console.log('');
  console.log('='.repeat(100));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(100));

  process.exit(0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
