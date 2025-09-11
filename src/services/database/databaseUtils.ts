/**
 * Database Utilities - Extracted from WorkoutDatabase
 * Row parsing and utility functions for SQLite operations
 */

export interface WorkoutRecord {
  id?: number;
  npub: string;
  nostrEventId: string;
  type: string;
  duration: number; // seconds
  distance?: number; // meters
  calories?: number;
  startTime: string; // ISO string
  heartRateAvg?: number;
  heartRateMax?: number;
  pace?: number; // seconds per km
  elevationGain?: number; // meters
  createdAt: string;
}

export interface CompetitionCache {
  id?: number;
  competitionId: string;
  type: 'league' | 'event' | 'challenge';
  parameters: string; // JSON string of competition settings
  participants: string; // JSON array of npubs
  lastUpdated: string;
}

export interface LeaderboardCache {
  id?: number;
  competitionId: string;
  npub: string;
  score: number;
  rank: number;
  lastCalculated: string;
}

/**
 * Parse workout row from database
 */
export function parseWorkoutRows(rows: any[]): WorkoutRecord[] {
  return rows.map(row => ({
    id: row.id,
    npub: row.npub,
    nostrEventId: row.nostr_event_id,
    type: row.type,
    duration: row.duration,
    distance: row.distance,
    calories: row.calories,
    startTime: row.start_time,
    heartRateAvg: row.heart_rate_avg,
    heartRateMax: row.heart_rate_max,
    pace: row.pace,
    elevationGain: row.elevation_gain,
    createdAt: row.created_at,
  }));
}

/**
 * Parse competition row from database
 */
export function parseCompetitionRow(row: any): CompetitionCache {
  return {
    id: row.id,
    competitionId: row.competition_id,
    type: row.type,
    parameters: row.parameters,
    participants: row.participants,
    lastUpdated: row.last_updated,
  };
}

/**
 * Parse leaderboard row from database
 */
export function parseLeaderboardRow(row: any): LeaderboardCache {
  return {
    id: row.id,
    competitionId: row.competition_id,
    npub: row.npub,
    score: row.score,
    rank: row.rank,
    lastCalculated: row.last_calculated,
  };
}