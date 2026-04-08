/**
 * Season III: Club Battles — Constants and bracket map
 */

import type { BracketMap, Season3Config, Season3Status } from '../types/season3';

// ── Config ──────────────────────────────────────────────────────────

export const SEASON_3_CONFIG = {
  registrationDeadline: '2026-05-15T23:59:59Z',
  startDate: '2026-05-19T00:00:00Z',
  minMembers: 4,
  maxClubs: 16,
} as const;

export const SEASON_3_CACHE_TTL = {
  CONFIG: 10 * 60 * 1000,
  BRACKET: 5 * 60 * 1000,
  QUALIFIED_CLUBS: 5 * 60 * 1000,
  LIVE_STEPS: 60 * 1000,
} as const;

// ── Status helpers ──────────────────────────────────────────────────

export function getSeason3Status(): { status: Season3Status; isRegistration: boolean; isActive: boolean; isCompleted: boolean } {
  const now = new Date();
  const deadline = new Date(SEASON_3_CONFIG.registrationDeadline);
  const start = new Date(SEASON_3_CONFIG.startDate);

  if (now < deadline) {
    return { status: 'registration', isRegistration: true, isActive: false, isCompleted: false };
  }
  if (now < start) {
    return { status: 'bracket_set', isRegistration: false, isActive: false, isCompleted: false };
  }
  return { status: 'active', isRegistration: false, isActive: true, isCompleted: false };
}

export function getSeason3CountdownTarget(): Date {
  const { isRegistration } = getSeason3Status();
  return isRegistration
    ? new Date(SEASON_3_CONFIG.registrationDeadline)
    : new Date(SEASON_3_CONFIG.startDate);
}

// ── 16-team double-elimination bracket map ──────────────────────────

export const BRACKET_MAP: BracketMap = {
  // ── Winners Round 1 ──
  'winners:1:1': {
    winner_to: { bracket: 'winners', round: 2, match_number: 1, slot: 'a' },
    loser_to:  { bracket: 'losers',  round: 1, match_number: 1, slot: 'a' },
  },
  'winners:1:2': {
    winner_to: { bracket: 'winners', round: 2, match_number: 1, slot: 'b' },
    loser_to:  { bracket: 'losers',  round: 1, match_number: 2, slot: 'a' },
  },
  'winners:1:3': {
    winner_to: { bracket: 'winners', round: 2, match_number: 2, slot: 'a' },
    loser_to:  { bracket: 'losers',  round: 1, match_number: 3, slot: 'a' },
  },
  'winners:1:4': {
    winner_to: { bracket: 'winners', round: 2, match_number: 2, slot: 'b' },
    loser_to:  { bracket: 'losers',  round: 1, match_number: 4, slot: 'a' },
  },
  'winners:1:5': {
    winner_to: { bracket: 'winners', round: 2, match_number: 3, slot: 'a' },
    loser_to:  { bracket: 'losers',  round: 1, match_number: 4, slot: 'b' },
  },
  'winners:1:6': {
    winner_to: { bracket: 'winners', round: 2, match_number: 3, slot: 'b' },
    loser_to:  { bracket: 'losers',  round: 1, match_number: 3, slot: 'b' },
  },
  'winners:1:7': {
    winner_to: { bracket: 'winners', round: 2, match_number: 4, slot: 'a' },
    loser_to:  { bracket: 'losers',  round: 1, match_number: 2, slot: 'b' },
  },
  'winners:1:8': {
    winner_to: { bracket: 'winners', round: 2, match_number: 4, slot: 'b' },
    loser_to:  { bracket: 'losers',  round: 1, match_number: 1, slot: 'b' },
  },
  // ── Winners Round 2 ──
  'winners:2:1': {
    winner_to: { bracket: 'winners', round: 3, match_number: 1, slot: 'a' },
    loser_to:  { bracket: 'losers',  round: 2, match_number: 4, slot: 'b' },
  },
  'winners:2:2': {
    winner_to: { bracket: 'winners', round: 3, match_number: 1, slot: 'b' },
    loser_to:  { bracket: 'losers',  round: 2, match_number: 3, slot: 'b' },
  },
  'winners:2:3': {
    winner_to: { bracket: 'winners', round: 3, match_number: 2, slot: 'a' },
    loser_to:  { bracket: 'losers',  round: 2, match_number: 2, slot: 'b' },
  },
  'winners:2:4': {
    winner_to: { bracket: 'winners', round: 3, match_number: 2, slot: 'b' },
    loser_to:  { bracket: 'losers',  round: 2, match_number: 1, slot: 'b' },
  },
  // ── Winners Round 3 ──
  'winners:3:1': {
    winner_to: { bracket: 'winners', round: 4, match_number: 1, slot: 'a' },
    loser_to:  { bracket: 'losers',  round: 4, match_number: 2, slot: 'b' },
  },
  'winners:3:2': {
    winner_to: { bracket: 'winners', round: 4, match_number: 1, slot: 'b' },
    loser_to:  { bracket: 'losers',  round: 4, match_number: 1, slot: 'b' },
  },
  // ── Winners Round 4 (Winners Finals) ──
  'winners:4:1': {
    winner_to: { bracket: 'grand_finals', round: 1, match_number: 1, slot: 'a' },
    loser_to:  { bracket: 'losers', round: 6, match_number: 1, slot: 'a' },
  },
  // ── Losers Round 1 ──
  'losers:1:1': { winner_to: { bracket: 'losers', round: 2, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:1:2': { winner_to: { bracket: 'losers', round: 2, match_number: 2, slot: 'a' }, loser_to: null },
  'losers:1:3': { winner_to: { bracket: 'losers', round: 2, match_number: 3, slot: 'a' }, loser_to: null },
  'losers:1:4': { winner_to: { bracket: 'losers', round: 2, match_number: 4, slot: 'a' }, loser_to: null },
  // ── Losers Round 2 ──
  'losers:2:1': { winner_to: { bracket: 'losers', round: 3, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:2:2': { winner_to: { bracket: 'losers', round: 3, match_number: 1, slot: 'b' }, loser_to: null },
  'losers:2:3': { winner_to: { bracket: 'losers', round: 3, match_number: 2, slot: 'a' }, loser_to: null },
  'losers:2:4': { winner_to: { bracket: 'losers', round: 3, match_number: 2, slot: 'b' }, loser_to: null },
  // ── Losers Round 3 ──
  'losers:3:1': { winner_to: { bracket: 'losers', round: 4, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:3:2': { winner_to: { bracket: 'losers', round: 4, match_number: 2, slot: 'a' }, loser_to: null },
  // ── Losers Round 4 ──
  'losers:4:1': { winner_to: { bracket: 'losers', round: 5, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:4:2': { winner_to: { bracket: 'losers', round: 5, match_number: 1, slot: 'b' }, loser_to: null },
  // ── Losers Round 5 (Losers Finals) ──
  'losers:5:1': { winner_to: { bracket: 'losers', round: 6, match_number: 1, slot: 'b' }, loser_to: null },
  // ── Losers Round 6 (Losers Bracket Championship: WF loser vs LF winner) ──
  'losers:6:1': { winner_to: { bracket: 'grand_finals', round: 1, match_number: 1, slot: 'b' }, loser_to: null },
  // ── Grand Finals ──
  'grand_finals:1:1': { winner_to: null, loser_to: null },
  'grand_finals:2:1': { winner_to: null, loser_to: null },
};

/** Helper to build a bracket map key */
export function bracketKey(bracket: string, round: number, matchNumber: number): string {
  return `${bracket}:${round}:${matchNumber}`;
}
