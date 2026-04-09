#!/usr/bin/env tsx
/**
 * RUNSTR Analytics Dashboard
 *
 * Queries Supabase for key usage metrics:
 *   - DAU / WAU / MAU
 *   - Total workouts (week / month)
 *   - Activity breakdown (running, walking, cycling)
 *   - Reward stats (sats paid this week / month)
 *   - New users this week
 *
 * Usage: npx tsx scripts/analytics/stats.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// --- Supabase REST helper ---
async function query<T>(path: string): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

// --- Date helpers ---
function startOfDay(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeek(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = start
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// --- Types ---
interface Workout {
  npub: string;
  activity_type: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  created_at: string;
}

interface RewardPayment {
  npub: string;
  amount_sats: number;
  reward_type: string;
  status: string;
  paid_at: string;
}

// --- Main ---
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  const now = new Date();
  const today = startOfDay();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const sevenDaysAgo = daysAgo(7);
  const thirtyDaysAgo = daysAgo(30);

  // Fetch all workouts from last 30 days (covers DAU/WAU/MAU + breakdowns)
  const cols = 'npub,activity_type,distance_meters,duration_seconds,created_at';
  const workouts = await query<Workout[]>(
    `workout_submissions?select=${cols}&created_at=gte.${thirtyDaysAgo}&order=created_at.desc`
  );

  // Fetch all-time workouts for "first workout" detection (just npub + created_at)
  const allNpubs = await query<{ npub: string; created_at: string }[]>(
    `workout_submissions?select=npub,created_at&order=created_at.asc`
  );

  // Fetch reward payments from last 30 days
  const rewards = await query<RewardPayment[]>(
    `reward_payments?select=npub,amount_sats,reward_type,status,paid_at&paid_at=gte.${thirtyDaysAgo}&status=eq.success&order=paid_at.desc`
  );

  // ========== ACTIVE USERS ==========
  const npubsToday = new Set(workouts.filter(w => w.created_at >= today).map(w => w.npub));
  const npubs7d = new Set(workouts.filter(w => w.created_at >= sevenDaysAgo).map(w => w.npub));
  const npubs30d = new Set(workouts.map(w => w.npub));

  // ========== WORKOUT COUNTS ==========
  const workoutsThisWeek = workouts.filter(w => w.created_at >= weekStart);
  const workoutsThisMonth = workouts.filter(w => w.created_at >= monthStart);

  // ========== ACTIVITY BREAKDOWN (this month) ==========
  const activityCounts = new Map<string, number>();
  for (const w of workoutsThisMonth) {
    const type = (w.activity_type || 'unknown').toLowerCase();
    activityCounts.set(type, (activityCounts.get(type) || 0) + 1);
  }

  // ========== REWARD STATS ==========
  const rewardsThisWeek = rewards.filter(r => r.paid_at >= weekStart);
  const rewardsThisMonth = rewards.filter(r => r.paid_at >= monthStart);
  const satsThisWeek = rewardsThisWeek.reduce((sum, r) => sum + r.amount_sats, 0);
  const satsThisMonth = rewardsThisMonth.reduce((sum, r) => sum + r.amount_sats, 0);

  // ========== NEW USERS THIS WEEK ==========
  // Find npubs whose first-ever workout is within this week
  const firstWorkout = new Map<string, string>();
  for (const row of allNpubs) {
    if (!firstWorkout.has(row.npub)) {
      firstWorkout.set(row.npub, row.created_at);
    }
  }
  const newUsersThisWeek: string[] = [];
  for (const [npub, firstDate] of firstWorkout) {
    if (firstDate >= weekStart) {
      newUsersThisWeek.push(npub);
    }
  }

  // ========== TOTAL USERS ALL-TIME ==========
  const totalUsersAllTime = firstWorkout.size;

  // ========== DISTANCE STATS (this month) ==========
  const totalDistanceMonth = workoutsThisMonth.reduce(
    (sum, w) => sum + (w.distance_meters || 0),
    0
  );
  const totalDurationMonth = workoutsThisMonth.reduce(
    (sum, w) => sum + (w.duration_seconds || 0),
    0
  );

  // ========== PRINT REPORT ==========
  console.log('');
  console.log('  RUNSTR Stats Dashboard');
  console.log(`  ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  console.log('  ' + '='.repeat(50));
  console.log('');

  // Active Users
  console.log('  ACTIVE USERS');
  console.log(`    DAU (today):        ${npubsToday.size}`);
  console.log(`    WAU (7 days):       ${npubs7d.size}`);
  console.log(`    MAU (30 days):      ${npubs30d.size}`);
  console.log(`    Total all-time:     ${totalUsersAllTime}`);
  console.log('');

  // Workouts
  console.log('  WORKOUTS');
  console.log(`    This week:          ${workoutsThisWeek.length}`);
  console.log(`    This month:         ${workoutsThisMonth.length}`);
  console.log(`    Distance (month):   ${(totalDistanceMonth / 1000).toFixed(1)} km`);
  console.log(`    Duration (month):   ${formatDuration(totalDurationMonth)}`);
  console.log('');

  // Activity Breakdown
  console.log('  ACTIVITY BREAKDOWN (this month)');
  const sortedActivities = [...activityCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedActivities.length === 0) {
    console.log('    (no workouts this month)');
  } else {
    for (const [type, count] of sortedActivities) {
      const pct = ((count / workoutsThisMonth.length) * 100).toFixed(0);
      const bar = '#'.repeat(Math.round(count / workoutsThisMonth.length * 20));
      console.log(`    ${type.padEnd(12)} ${String(count).padStart(4)}  ${pct.padStart(3)}%  ${bar}`);
    }
  }
  console.log('');

  // Rewards
  console.log('  REWARDS (successful payments)');
  console.log(`    This week:          ${satsThisWeek.toLocaleString()} sats (${rewardsThisWeek.length} payments)`);
  console.log(`    This month:         ${satsThisMonth.toLocaleString()} sats (${rewardsThisMonth.length} payments)`);
  console.log('');

  // New Users
  console.log('  NEW USERS (first workout this week)');
  console.log(`    Count:              ${newUsersThisWeek.length}`);
  if (newUsersThisWeek.length > 0 && newUsersThisWeek.length <= 10) {
    for (const npub of newUsersThisWeek) {
      console.log(`      ${npub.slice(0, 20)}...`);
    }
  }
  console.log('');

  // Top users this month
  const userWorkoutCounts = new Map<string, number>();
  for (const w of workoutsThisMonth) {
    userWorkoutCounts.set(w.npub, (userWorkoutCounts.get(w.npub) || 0) + 1);
  }
  const topUsers = [...userWorkoutCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topUsers.length > 0) {
    console.log('  TOP 5 MOST ACTIVE (this month)');
    for (let i = 0; i < topUsers.length; i++) {
      const [npub, count] = topUsers[i];
      console.log(`    ${i + 1}. ${npub.slice(0, 20)}...  ${count} workouts`);
    }
    console.log('');
  }

  console.log('  ' + '='.repeat(50));
  console.log('');
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

main().catch(err => {
  console.error('Stats error:', err);
  process.exit(1);
});
