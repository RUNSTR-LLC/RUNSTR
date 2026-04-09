# Season III: Club Battles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 16-team double-elimination bracket tournament where Fitness Clubs compete head-to-head on daily step counts, with a dedicated Season III screen showing live matchups and bracket progression.

**Architecture:** One new Supabase migration creates `season3_matchups` and `season3_config` tables. A `generate_season3_bracket()` SQL function seeds the bracket on May 15. A nightly edge function resolves each day's matchup and advances the bracket. The React Native frontend adds a Season III screen with bracket visualization, live head-to-head step counters, and registration-phase club listings. All step data comes from existing `workout_submissions` infrastructure.

**Tech Stack:** Supabase (Postgres, Edge Functions, pg_cron), React Native, TypeScript, Zustand-compatible hooks

**Spec:** `docs/superpowers/specs/2026-04-08-season-iii-club-battles-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/170_season3_setup.sql` | Tables, config, RLS, bracket generation function |
| `supabase/migrations/171_season3_cron.sql` | pg_cron trigger for nightly resolution |
| `supabase/functions/resolve-season3-matchup/index.ts` | Nightly matchup resolution edge function |
| `src/types/season3.ts` | TypeScript types for Season III |
| `src/constants/season3.ts` | Config, bracket map, status helpers |
| `src/services/season/Season3Service.ts` | Data fetching with caching |
| `src/services/season/Season3BracketService.ts` | Bracket advancement logic |
| `src/hooks/useSeason3.ts` | React hook for Season III screen |
| `src/screens/season3/Season3Screen.tsx` | Main Season III screen |
| `src/components/season3/Season3EventCard.tsx` | Featured card on Compete tab |
| `src/components/season3/BracketView.tsx` | Bracket visualization component |
| `src/components/season3/MatchupCard.tsx` | Single matchup display (live or completed) |
| `src/components/season3/QualifiedClubsList.tsx` | Registration phase club list |

### Modified Files

| File | Change |
|------|--------|
| `src/components/compete/EventsContent.tsx` | Add `onSeason3Press` prop and `Season3EventCard` |
| `src/screens/CompeteScreen.tsx` | Add `handleSeason3Press` callback |
| `src/navigation/AppNavigator.tsx` | Add `Season3` route and import |

---

## Task 1: Supabase Migration — Tables, Config, RLS

**Files:**
- Create: `supabase/migrations/170_season3_setup.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Season III: Club Battles — tables, config, RLS, bracket generation

-- Config table
CREATE TABLE season3_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO season3_config (key, value) VALUES
  ('registration_deadline', '2026-05-15'),
  ('start_date', '2026-05-19'),
  ('status', 'registration'),
  ('min_members', '4'),
  ('max_clubs', '16'),
  ('prize_pool_first', 'TBD'),
  ('prize_pool_second', 'TBD');

-- Matchups table
CREATE TABLE season3_matchups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round           INTEGER NOT NULL,
  bracket         TEXT NOT NULL CHECK (bracket IN ('winners', 'losers', 'grand_finals')),
  match_number    INTEGER NOT NULL,
  match_date      DATE,
  seed_a          INTEGER,
  seed_b          INTEGER,
  club_a_id       UUID REFERENCES user_teams(id),
  club_b_id       UUID REFERENCES user_teams(id),
  club_a_steps    BIGINT DEFAULT 0,
  club_b_steps    BIGINT DEFAULT 0,
  club_a_active   INTEGER DEFAULT 0,
  club_b_active   INTEGER DEFAULT 0,
  winner_id       UUID REFERENCES user_teams(id),
  loser_id        UUID REFERENCES user_teams(id),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'live', 'completed')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(round, bracket, match_number)
);

-- Indexes for common queries
CREATE INDEX idx_season3_matchups_status ON season3_matchups(status);
CREATE INDEX idx_season3_matchups_date ON season3_matchups(match_date);
CREATE INDEX idx_season3_matchups_clubs ON season3_matchups(club_a_id, club_b_id);

-- RLS: anyone can read, only service role can write
ALTER TABLE season3_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE season3_matchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "season3_config_read" ON season3_config FOR SELECT USING (true);
CREATE POLICY "season3_matchups_read" ON season3_matchups FOR SELECT USING (true);

-- Bracket generation function (called manually on May 15)
-- Uses a hardcoded 16-team double-elimination bracket structure.
-- Seeds 1-16 are randomly assigned to qualifying clubs.
-- Round 1 matchups get club IDs immediately; later rounds stay NULL until teams advance.
CREATE OR REPLACE FUNCTION generate_season3_bracket(p_start_date DATE DEFAULT '2026-05-19')
RETURNS TEXT AS $$
DECLARE
  v_clubs UUID[];
  v_count INTEGER;
  v_day INTEGER := 0;
  v_match RECORD;
BEGIN
  -- Get qualifying clubs: active, 4+ members, random order, max 16
  SELECT array_agg(club_id ORDER BY random())
  INTO v_clubs
  FROM (
    SELECT cm.club_id
    FROM club_memberships cm
    JOIN user_teams ut ON ut.id = cm.club_id
    WHERE ut.is_active = true
    GROUP BY cm.club_id
    HAVING COUNT(cm.member_npub) >= 4
    LIMIT 16
  ) q;

  v_count := coalesce(array_length(v_clubs, 1), 0);

  IF v_count < 2 THEN
    RETURN 'ERROR: Need at least 2 qualifying clubs, found ' || v_count;
  END IF;

  -- Pad to 16 with NULLs (byes) if fewer than 16 clubs
  WHILE array_length(v_clubs, 1) < 16 LOOP
    v_clubs := v_clubs || NULL::UUID;
  END LOOP;

  -- Clear any existing bracket
  DELETE FROM season3_matchups;

  -- ============================================================
  -- WINNERS BRACKET
  -- ============================================================

  -- Winners Round 1: 8 matchups (seeds paired 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, seed_a, seed_b, club_a_id, club_b_id, status) VALUES
    (1, 'winners', 1, p_start_date + (v_day + 0), 1,  16, v_clubs[1],  v_clubs[16], 'scheduled'),
    (1, 'winners', 2, p_start_date + (v_day + 1), 8,  9,  v_clubs[8],  v_clubs[9],  'scheduled'),
    (1, 'winners', 3, p_start_date + (v_day + 2), 5,  12, v_clubs[5],  v_clubs[12], 'scheduled'),
    (1, 'winners', 4, p_start_date + (v_day + 3), 4,  13, v_clubs[4],  v_clubs[13], 'scheduled'),
    (1, 'winners', 5, p_start_date + (v_day + 4), 3,  14, v_clubs[3],  v_clubs[14], 'scheduled'),
    (1, 'winners', 6, p_start_date + (v_day + 5), 6,  11, v_clubs[6],  v_clubs[11], 'scheduled'),
    (1, 'winners', 7, p_start_date + (v_day + 6), 7,  10, v_clubs[7],  v_clubs[10], 'scheduled'),
    (1, 'winners', 8, p_start_date + (v_day + 7), 2,  15, v_clubs[2],  v_clubs[15], 'scheduled');
  v_day := v_day + 8;

  -- Winners Round 2: 4 matchups
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (2, 'winners', 1, p_start_date + (v_day + 0), 'pending'),
    (2, 'winners', 2, p_start_date + (v_day + 1), 'pending'),
    (2, 'winners', 3, p_start_date + (v_day + 2), 'pending'),
    (2, 'winners', 4, p_start_date + (v_day + 3), 'pending');
  v_day := v_day + 4;

  -- Losers Round 1: 4 matchups (WR1 losers face each other, cross-bracket to avoid rematches)
  -- LR1-1: loser of WR1-1 vs loser of WR1-8
  -- LR1-2: loser of WR1-2 vs loser of WR1-7
  -- LR1-3: loser of WR1-3 vs loser of WR1-6
  -- LR1-4: loser of WR1-4 vs loser of WR1-5
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (1, 'losers', 1, p_start_date + (v_day + 0), 'pending'),
    (1, 'losers', 2, p_start_date + (v_day + 1), 'pending'),
    (1, 'losers', 3, p_start_date + (v_day + 2), 'pending'),
    (1, 'losers', 4, p_start_date + (v_day + 3), 'pending');
  v_day := v_day + 4;

  -- Winners Round 3: 2 matchups
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (3, 'winners', 1, p_start_date + (v_day + 0), 'pending'),
    (3, 'winners', 2, p_start_date + (v_day + 1), 'pending');
  v_day := v_day + 2;

  -- Losers Round 2: 4 matchups (LR1 winners vs WR2 losers, cross-bracket)
  -- LR2-1: winner of LR1-1 vs loser of WR2-4
  -- LR2-2: winner of LR1-2 vs loser of WR2-3
  -- LR2-3: winner of LR1-3 vs loser of WR2-2
  -- LR2-4: winner of LR1-4 vs loser of WR2-1
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (2, 'losers', 1, p_start_date + (v_day + 0), 'pending'),
    (2, 'losers', 2, p_start_date + (v_day + 1), 'pending'),
    (2, 'losers', 3, p_start_date + (v_day + 2), 'pending'),
    (2, 'losers', 4, p_start_date + (v_day + 3), 'pending');
  v_day := v_day + 4;

  -- Losers Round 3: 2 matchups
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (3, 'losers', 1, p_start_date + (v_day + 0), 'pending'),
    (3, 'losers', 2, p_start_date + (v_day + 1), 'pending');
  v_day := v_day + 2;

  -- Winners Round 4: Winners Finals (1 matchup)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (4, 'winners', 1, p_start_date + (v_day + 0), 'pending');
  v_day := v_day + 1;

  -- Losers Round 4: 2 matchups (LR3 winners vs WR3 losers, cross-bracket)
  -- LR4-1: winner of LR3-1 vs loser of WR3-2
  -- LR4-2: winner of LR3-2 vs loser of WR3-1
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (4, 'losers', 1, p_start_date + (v_day + 0), 'pending'),
    (4, 'losers', 2, p_start_date + (v_day + 1), 'pending');
  v_day := v_day + 2;

  -- Losers Round 5: Losers Finals (1 matchup)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (5, 'losers', 1, p_start_date + (v_day + 0), 'pending');
  v_day := v_day + 1;

  -- Grand Finals (1 matchup, reset created only if needed)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (1, 'grand_finals', 1, p_start_date + (v_day + 0), 'pending');
  v_day := v_day + 1;

  -- Grand Finals Reset slot (match_date assigned only if needed)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (2, 'grand_finals', 1, NULL, 'pending');

  -- Set first match to 'live' on start date
  UPDATE season3_matchups
  SET status = 'live'
  WHERE round = 1 AND bracket = 'winners' AND match_number = 1;

  -- Handle byes: if a club_b_id is NULL in WR1, auto-advance club_a
  -- (This is handled by the resolve function detecting NULL opponents)

  -- Update config status
  UPDATE season3_config SET value = 'bracket_set' WHERE key = 'status';

  RETURN 'Bracket generated with ' || v_count || ' clubs. ' || (16 - v_count) || ' byes. Tournament starts ' || p_start_date;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 2: Verify migration file syntax**

Run: `cd /Users/dakotabrown/runstr.project && cat supabase/migrations/170_season3_setup.sql | head -5`
Expected: First 5 lines of the migration visible

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/170_season3_setup.sql
git commit -m "Feature: Add Season III tables, config, and bracket generation function"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/season3.ts`

- [ ] **Step 1: Create types file**

```typescript
/**
 * Season III: Club Battles — Type definitions
 */

export type Season3Status = 'registration' | 'bracket_set' | 'active' | 'completed';
export type Season3Bracket = 'winners' | 'losers' | 'grand_finals';
export type MatchupStatus = 'pending' | 'scheduled' | 'live' | 'completed';

export interface Season3Matchup {
  id: string;
  round: number;
  bracket: Season3Bracket;
  match_number: number;
  match_date: string | null;
  seed_a: number | null;
  seed_b: number | null;
  club_a_id: string | null;
  club_b_id: string | null;
  club_a_steps: number;
  club_b_steps: number;
  club_a_active: number;
  club_b_active: number;
  winner_id: string | null;
  loser_id: string | null;
  status: MatchupStatus;
  created_at: string;
}

export interface Season3Config {
  registration_deadline: string;
  start_date: string;
  status: Season3Status;
  min_members: number;
  max_clubs: number;
  prize_pool_first: string;
  prize_pool_second: string;
}

export interface QualifiedClub {
  id: string;
  name: string;
  member_count: number;
  captain_npub: string;
  banner_url: string | null;
}

export interface MatchupWithClubs extends Season3Matchup {
  club_a_name: string | null;
  club_b_name: string | null;
  club_a_banner: string | null;
  club_b_banner: string | null;
}

export interface LiveScore {
  club_a_steps: number;
  club_b_steps: number;
  club_a_active: number;
  club_b_active: number;
  last_updated: number;
}

/** Bracket map entry: defines where a matchup's winner and loser advance to */
export interface BracketAdvancement {
  winner_to: { bracket: Season3Bracket; round: number; match_number: number; slot: 'a' | 'b' };
  loser_to: { bracket: Season3Bracket; round: number; match_number: number; slot: 'a' | 'b' } | null;
}

/** Key format: "bracket:round:match_number" e.g. "winners:1:1" */
export type BracketMapKey = string;
export type BracketMap = Record<BracketMapKey, BracketAdvancement>;
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/dakotabrown/runstr.project && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No new errors from season3.ts

- [ ] **Step 3: Commit**

```bash
git add src/types/season3.ts
git commit -m "Feature: Add Season III type definitions"
```

---

## Task 3: Constants and Bracket Map

**Files:**
- Create: `src/constants/season3.ts`

- [ ] **Step 1: Create constants file with bracket map**

The bracket map is the critical data structure. Each entry defines where the winner and loser of a matchup advance to. The key format is `"bracket:round:match_number"`.

```typescript
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
  CONFIG: 10 * 60 * 1000,      // 10 min
  BRACKET: 5 * 60 * 1000,       // 5 min
  QUALIFIED_CLUBS: 5 * 60 * 1000, // 5 min
  LIVE_STEPS: 60 * 1000,        // 1 min
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
  // Active/completed is determined by matchup data, not dates alone
  return { status: 'active', isRegistration: false, isActive: true, isCompleted: false };
}

export function getSeason3CountdownTarget(): Date {
  const { isRegistration } = getSeason3Status();
  return isRegistration
    ? new Date(SEASON_3_CONFIG.registrationDeadline)
    : new Date(SEASON_3_CONFIG.startDate);
}

// ── 16-team double-elimination bracket map ──────────────────────────
//
// Each entry maps a matchup to where its winner and loser advance.
// Key format: "bracket:round:match_number"
// Losers bracket cross-pairs to avoid immediate rematches.
//
// Winners bracket:
//   WR1 (8 matches) → WR2 (4) → WR3 (2) → WR4/Winners Finals (1)
// Losers bracket:
//   LR1 (4: WR1 losers paired cross-bracket)
//   LR2 (4: LR1 winners vs WR2 losers, cross-bracket)
//   LR3 (2: LR2 winners)
//   LR4 (2: LR3 winners vs WR3 losers, cross-bracket)
//   LR5/Losers Finals (1)
// Grand Finals:
//   GF1 (winners champ vs losers champ)
//   GF2 (reset, only if losers champ wins GF1)

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
    loser_to: null, // Winners finals loser goes to grand finals slot b via losers finals winner
  },

  // ── Losers Round 1 ──
  'losers:1:1': {
    winner_to: { bracket: 'losers', round: 2, match_number: 1, slot: 'a' },
    loser_to: null, // eliminated
  },
  'losers:1:2': {
    winner_to: { bracket: 'losers', round: 2, match_number: 2, slot: 'a' },
    loser_to: null,
  },
  'losers:1:3': {
    winner_to: { bracket: 'losers', round: 2, match_number: 3, slot: 'a' },
    loser_to: null,
  },
  'losers:1:4': {
    winner_to: { bracket: 'losers', round: 2, match_number: 4, slot: 'a' },
    loser_to: null,
  },

  // ── Losers Round 2 ──
  'losers:2:1': {
    winner_to: { bracket: 'losers', round: 3, match_number: 1, slot: 'a' },
    loser_to: null,
  },
  'losers:2:2': {
    winner_to: { bracket: 'losers', round: 3, match_number: 1, slot: 'b' },
    loser_to: null,
  },
  'losers:2:3': {
    winner_to: { bracket: 'losers', round: 3, match_number: 2, slot: 'a' },
    loser_to: null,
  },
  'losers:2:4': {
    winner_to: { bracket: 'losers', round: 3, match_number: 2, slot: 'b' },
    loser_to: null,
  },

  // ── Losers Round 3 ──
  'losers:3:1': {
    winner_to: { bracket: 'losers', round: 4, match_number: 1, slot: 'a' },
    loser_to: null,
  },
  'losers:3:2': {
    winner_to: { bracket: 'losers', round: 4, match_number: 2, slot: 'a' },
    loser_to: null,
  },

  // ── Losers Round 4 ──
  'losers:4:1': {
    winner_to: { bracket: 'losers', round: 5, match_number: 1, slot: 'a' },
    loser_to: null,
  },
  'losers:4:2': {
    winner_to: { bracket: 'losers', round: 5, match_number: 1, slot: 'b' },
    loser_to: null,
  },

  // ── Losers Round 5 (Losers Finals) ──
  'losers:5:1': {
    winner_to: { bracket: 'grand_finals', round: 1, match_number: 1, slot: 'b' },
    loser_to: null, // 3rd place
  },

  // ── Grand Finals ──
  'grand_finals:1:1': {
    winner_to: null, // champion (or triggers reset)
    loser_to: null,  // runner-up (or reset match)
  },
  'grand_finals:2:1': {
    winner_to: null, // champion
    loser_to: null,  // runner-up
  },
};

/** Helper to build a bracket map key */
export function bracketKey(bracket: string, round: number, matchNumber: number): string {
  return `${bracket}:${round}:${matchNumber}`;
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/dakotabrown/runstr.project && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/constants/season3.ts
git commit -m "Feature: Add Season III constants and 16-team double-elimination bracket map"
```

---

## Task 4: Season3BracketService — Bracket Advancement Logic

**Files:**
- Create: `src/services/season/Season3BracketService.ts`

- [ ] **Step 1: Create the bracket service**

This service contains the pure logic for advancing teams through the bracket. Used by both the edge function and client-side for understanding bracket state.

```typescript
/**
 * Season3BracketService — Bracket advancement logic
 *
 * Pure functions for determining where winners/losers advance to
 * in a 16-team double-elimination bracket.
 */

import { BRACKET_MAP, bracketKey } from '../../constants/season3';
import type { Season3Matchup, Season3Bracket } from '../../types/season3';

export class Season3BracketService {

  /**
   * Get the advancement paths for a completed matchup.
   * Returns { winner_to, loser_to } with bracket coordinates,
   * or null destinations if the team is eliminated or is the champion.
   */
  static getAdvancement(matchup: Season3Matchup) {
    const key = bracketKey(matchup.bracket, matchup.round, matchup.match_number);
    return BRACKET_MAP[key] ?? null;
  }

  /**
   * Determine the winner of a matchup based on steps and tiebreakers.
   * Returns 'a' | 'b' indicating which club won.
   *
   * Tiebreaker order:
   * 1. Total steps (higher wins)
   * 2. Active members (more unique step-loggers wins)
   * 3. Higher seed (lower seed number wins)
   */
  static determineWinner(matchup: Season3Matchup): 'a' | 'b' {
    // Primary: total steps
    if (matchup.club_a_steps > matchup.club_b_steps) return 'a';
    if (matchup.club_b_steps > matchup.club_a_steps) return 'b';

    // Tiebreaker 1: active members
    if (matchup.club_a_active > matchup.club_b_active) return 'a';
    if (matchup.club_b_active > matchup.club_a_active) return 'b';

    // Tiebreaker 2: higher seed (lower number = higher seed)
    const seedA = matchup.seed_a ?? 99;
    const seedB = matchup.seed_b ?? 99;
    return seedA <= seedB ? 'a' : 'b';
  }

  /**
   * Check if grand finals needs a reset match.
   * Reset is needed when the losers bracket champion beats the winners bracket champion.
   */
  static needsGrandFinalsReset(grandFinals1: Season3Matchup): boolean {
    if (grandFinals1.bracket !== 'grand_finals' || grandFinals1.round !== 1) return false;
    if (grandFinals1.status !== 'completed') return false;
    // The winners bracket champion is always in slot A (per bracket map).
    // If slot B (losers champ) wins, we need a reset.
    return grandFinals1.winner_id === grandFinals1.club_b_id;
  }

  /**
   * Check if the entire tournament is complete.
   */
  static isTournamentComplete(matchups: Season3Matchup[]): boolean {
    const gf1 = matchups.find(m => m.bracket === 'grand_finals' && m.round === 1);
    if (!gf1 || gf1.status !== 'completed') return false;

    // If winners bracket champ won GF1, tournament is over
    if (gf1.winner_id === gf1.club_a_id) return true;

    // Otherwise check if reset match is completed
    const gf2 = matchups.find(m => m.bracket === 'grand_finals' && m.round === 2);
    return gf2?.status === 'completed';
  }

  /**
   * Get the champion and runner-up from completed bracket.
   * Returns null if tournament is not complete.
   */
  static getResults(matchups: Season3Matchup[]): { champion: string; runnerUp: string } | null {
    if (!this.isTournamentComplete(matchups)) return null;

    const gf1 = matchups.find(m => m.bracket === 'grand_finals' && m.round === 1)!;

    // If winners champ won GF1
    if (gf1.winner_id === gf1.club_a_id) {
      return { champion: gf1.winner_id!, runnerUp: gf1.loser_id! };
    }

    // Reset match happened
    const gf2 = matchups.find(m => m.bracket === 'grand_finals' && m.round === 2)!;
    return { champion: gf2.winner_id!, runnerUp: gf2.loser_id! };
  }

  /**
   * Get a human-readable round label.
   */
  static getRoundLabel(bracket: Season3Bracket, round: number): string {
    if (bracket === 'grand_finals') {
      return round === 1 ? 'Grand Finals' : 'Grand Finals (Reset)';
    }
    if (bracket === 'winners') {
      if (round === 4) return 'Winners Finals';
      return `Winners Round ${round}`;
    }
    // losers
    if (round === 5) return 'Losers Finals';
    return `Losers Round ${round}`;
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/dakotabrown/runstr.project && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/services/season/Season3BracketService.ts
git commit -m "Feature: Add Season III bracket advancement logic"
```

---

## Task 5: Season3Service — Data Fetching

**Files:**
- Create: `src/services/season/Season3Service.ts`

- [ ] **Step 1: Create the service**

```typescript
/**
 * Season3Service — Data fetching for Season III Club Battles
 *
 * Reads bracket state and live scores from Supabase.
 * Follows the singleton + cache pattern from Season2Service.
 */

import { supabase } from '../../utils/supabase';
import { SEASON_3_CACHE_TTL } from '../../constants/season3';
import type {
  Season3Matchup,
  Season3Config,
  QualifiedClub,
  LiveScore,
  MatchupWithClubs,
} from '../../types/season3';

class Season3ServiceClass {
  private static instance: Season3ServiceClass;
  private configCache: { data: Season3Config; ts: number } | null = null;
  private bracketCache: { data: MatchupWithClubs[]; ts: number } | null = null;
  private qualifiedCache: { data: QualifiedClub[]; ts: number } | null = null;

  static getInstance(): Season3ServiceClass {
    if (!this.instance) this.instance = new Season3ServiceClass();
    return this.instance;
  }

  /** Fetch season3_config as a typed object */
  async getConfig(forceRefresh = false): Promise<Season3Config> {
    if (!forceRefresh && this.configCache && Date.now() - this.configCache.ts < SEASON_3_CACHE_TTL.CONFIG) {
      return this.configCache.data;
    }

    const { data, error } = await supabase
      .from('season3_config')
      .select('key, value');

    if (error) throw new Error(`Failed to fetch season3_config: ${error.message}`);

    const config = (data ?? []).reduce((acc, row) => {
      (acc as any)[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);

    const typed: Season3Config = {
      registration_deadline: config.registration_deadline ?? '',
      start_date: config.start_date ?? '',
      status: (config.status as Season3Config['status']) ?? 'registration',
      min_members: parseInt(config.min_members ?? '4', 10),
      max_clubs: parseInt(config.max_clubs ?? '16', 10),
      prize_pool_first: config.prize_pool_first ?? 'TBD',
      prize_pool_second: config.prize_pool_second ?? 'TBD',
    };

    this.configCache = { data: typed, ts: Date.now() };
    return typed;
  }

  /** Fetch all matchups with club names joined */
  async getBracket(forceRefresh = false): Promise<MatchupWithClubs[]> {
    if (!forceRefresh && this.bracketCache && Date.now() - this.bracketCache.ts < SEASON_3_CACHE_TTL.BRACKET) {
      return this.bracketCache.data;
    }

    const { data, error } = await supabase
      .from('season3_matchups')
      .select(`
        *,
        club_a:user_teams!season3_matchups_club_a_id_fkey(name, banner_url),
        club_b:user_teams!season3_matchups_club_b_id_fkey(name, banner_url)
      `)
      .order('match_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(`Failed to fetch bracket: ${error.message}`);

    const matchups: MatchupWithClubs[] = (data ?? []).map((row: any) => ({
      id: row.id,
      round: row.round,
      bracket: row.bracket,
      match_number: row.match_number,
      match_date: row.match_date,
      seed_a: row.seed_a,
      seed_b: row.seed_b,
      club_a_id: row.club_a_id,
      club_b_id: row.club_b_id,
      club_a_steps: row.club_a_steps ?? 0,
      club_b_steps: row.club_b_steps ?? 0,
      club_a_active: row.club_a_active ?? 0,
      club_b_active: row.club_b_active ?? 0,
      winner_id: row.winner_id,
      loser_id: row.loser_id,
      status: row.status,
      created_at: row.created_at,
      club_a_name: row.club_a?.name ?? null,
      club_b_name: row.club_b?.name ?? null,
      club_a_banner: row.club_a?.banner_url ?? null,
      club_b_banner: row.club_b?.banner_url ?? null,
    }));

    this.bracketCache = { data: matchups, ts: Date.now() };
    return matchups;
  }

  /** Get today's live matchup (if any) */
  async getTodaysMatchup(forceRefresh = false): Promise<MatchupWithClubs | null> {
    const bracket = await this.getBracket(forceRefresh);
    return bracket.find(m => m.status === 'live') ?? null;
  }

  /** Get live step totals for a matchup from workout_submissions */
  async getLiveSteps(clubAId: string, clubBId: string, matchDate: string): Promise<LiveScore> {
    const { data, error } = await supabase
      .from('workout_submissions')
      .select('club_id, step_count, npub')
      .in('club_id', [clubAId, clubBId])
      .eq('leaderboard_date', matchDate);

    if (error) throw new Error(`Failed to fetch live steps: ${error.message}`);

    const rows = data ?? [];
    let clubASteps = 0;
    let clubBSteps = 0;
    const clubAMembers = new Set<string>();
    const clubBMembers = new Set<string>();

    for (const row of rows) {
      if (row.club_id === clubAId) {
        clubASteps += row.step_count ?? 0;
        if (row.npub) clubAMembers.add(row.npub);
      } else {
        clubBSteps += row.step_count ?? 0;
        if (row.npub) clubBMembers.add(row.npub);
      }
    }

    return {
      club_a_steps: clubASteps,
      club_b_steps: clubBSteps,
      club_a_active: clubAMembers.size,
      club_b_active: clubBMembers.size,
      last_updated: Date.now(),
    };
  }

  /** Fetch clubs that qualify (4+ members, active) */
  async getQualifiedClubs(forceRefresh = false): Promise<QualifiedClub[]> {
    if (!forceRefresh && this.qualifiedCache && Date.now() - this.qualifiedCache.ts < SEASON_3_CACHE_TTL.QUALIFIED_CLUBS) {
      return this.qualifiedCache.data;
    }

    // Get clubs with member counts
    const { data: clubs, error: clubError } = await supabase
      .from('user_teams')
      .select('id, name, created_by_npub, banner_url, is_active')
      .eq('is_active', true);

    if (clubError) throw new Error(`Failed to fetch clubs: ${clubError.message}`);

    const { data: memberships, error: memberError } = await supabase
      .from('club_memberships')
      .select('club_id');

    if (memberError) throw new Error(`Failed to fetch memberships: ${memberError.message}`);

    // Count members per club
    const memberCounts: Record<string, number> = {};
    for (const m of memberships ?? []) {
      memberCounts[m.club_id] = (memberCounts[m.club_id] ?? 0) + 1;
    }

    const qualified: QualifiedClub[] = (clubs ?? [])
      .filter(c => (memberCounts[c.id] ?? 0) >= 4)
      .map(c => ({
        id: c.id,
        name: c.name,
        member_count: memberCounts[c.id] ?? 0,
        captain_npub: c.created_by_npub,
        banner_url: c.banner_url,
      }))
      .sort((a, b) => b.member_count - a.member_count);

    this.qualifiedCache = { data: qualified, ts: Date.now() };
    return qualified;
  }

  /** Get all clubs (qualified and not) for the registration view */
  async getAllClubsWithStatus(forceRefresh = false): Promise<{ qualified: QualifiedClub[]; notQualified: QualifiedClub[] }> {
    const { data: clubs, error: clubError } = await supabase
      .from('user_teams')
      .select('id, name, created_by_npub, banner_url, is_active')
      .eq('is_active', true);

    if (clubError) throw new Error(`Failed to fetch clubs: ${clubError.message}`);

    const { data: memberships, error: memberError } = await supabase
      .from('club_memberships')
      .select('club_id');

    if (memberError) throw new Error(`Failed to fetch memberships: ${memberError.message}`);

    const memberCounts: Record<string, number> = {};
    for (const m of memberships ?? []) {
      memberCounts[m.club_id] = (memberCounts[m.club_id] ?? 0) + 1;
    }

    const all = (clubs ?? []).map(c => ({
      id: c.id,
      name: c.name,
      member_count: memberCounts[c.id] ?? 0,
      captain_npub: c.created_by_npub,
      banner_url: c.banner_url,
    }));

    return {
      qualified: all.filter(c => c.member_count >= 4).sort((a, b) => b.member_count - a.member_count),
      notQualified: all.filter(c => c.member_count < 4 && c.member_count > 0).sort((a, b) => b.member_count - a.member_count),
    };
  }

  /** Clear all caches */
  clearCache(): void {
    this.configCache = null;
    this.bracketCache = null;
    this.qualifiedCache = null;
  }
}

export const Season3Service = Season3ServiceClass.getInstance();
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/dakotabrown/runstr.project && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/services/season/Season3Service.ts
git commit -m "Feature: Add Season III data service with caching"
```

---

## Task 6: Edge Function — resolve-season3-matchup

**Files:**
- Create: `supabase/functions/resolve-season3-matchup/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
/**
 * resolve-season3-matchup — Nightly cron-triggered edge function
 *
 * 1. Find today's live matchup
 * 2. Tally final step counts from workout_submissions
 * 3. Determine winner (steps → active members → seed)
 * 4. Advance winner/loser through the bracket
 * 5. Set next day's matchup to 'live'
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Bracket map (duplicated from client constants for edge function isolation) ──

interface Dest {
  bracket: string;
  round: number;
  match_number: number;
  slot: 'a' | 'b';
}

const BRACKET_MAP: Record<string, { winner_to: Dest | null; loser_to: Dest | null }> = {
  'winners:1:1': { winner_to: { bracket: 'winners', round: 2, match_number: 1, slot: 'a' }, loser_to: { bracket: 'losers', round: 1, match_number: 1, slot: 'a' } },
  'winners:1:2': { winner_to: { bracket: 'winners', round: 2, match_number: 1, slot: 'b' }, loser_to: { bracket: 'losers', round: 1, match_number: 2, slot: 'a' } },
  'winners:1:3': { winner_to: { bracket: 'winners', round: 2, match_number: 2, slot: 'a' }, loser_to: { bracket: 'losers', round: 1, match_number: 3, slot: 'a' } },
  'winners:1:4': { winner_to: { bracket: 'winners', round: 2, match_number: 2, slot: 'b' }, loser_to: { bracket: 'losers', round: 1, match_number: 4, slot: 'a' } },
  'winners:1:5': { winner_to: { bracket: 'winners', round: 2, match_number: 3, slot: 'a' }, loser_to: { bracket: 'losers', round: 1, match_number: 4, slot: 'b' } },
  'winners:1:6': { winner_to: { bracket: 'winners', round: 2, match_number: 3, slot: 'b' }, loser_to: { bracket: 'losers', round: 1, match_number: 3, slot: 'b' } },
  'winners:1:7': { winner_to: { bracket: 'winners', round: 2, match_number: 4, slot: 'a' }, loser_to: { bracket: 'losers', round: 1, match_number: 2, slot: 'b' } },
  'winners:1:8': { winner_to: { bracket: 'winners', round: 2, match_number: 4, slot: 'b' }, loser_to: { bracket: 'losers', round: 1, match_number: 1, slot: 'b' } },
  'winners:2:1': { winner_to: { bracket: 'winners', round: 3, match_number: 1, slot: 'a' }, loser_to: { bracket: 'losers', round: 2, match_number: 4, slot: 'b' } },
  'winners:2:2': { winner_to: { bracket: 'winners', round: 3, match_number: 1, slot: 'b' }, loser_to: { bracket: 'losers', round: 2, match_number: 3, slot: 'b' } },
  'winners:2:3': { winner_to: { bracket: 'winners', round: 3, match_number: 2, slot: 'a' }, loser_to: { bracket: 'losers', round: 2, match_number: 2, slot: 'b' } },
  'winners:2:4': { winner_to: { bracket: 'winners', round: 3, match_number: 2, slot: 'b' }, loser_to: { bracket: 'losers', round: 2, match_number: 1, slot: 'b' } },
  'winners:3:1': { winner_to: { bracket: 'winners', round: 4, match_number: 1, slot: 'a' }, loser_to: { bracket: 'losers', round: 4, match_number: 2, slot: 'b' } },
  'winners:3:2': { winner_to: { bracket: 'winners', round: 4, match_number: 1, slot: 'b' }, loser_to: { bracket: 'losers', round: 4, match_number: 1, slot: 'b' } },
  'winners:4:1': { winner_to: { bracket: 'grand_finals', round: 1, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:1:1': { winner_to: { bracket: 'losers', round: 2, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:1:2': { winner_to: { bracket: 'losers', round: 2, match_number: 2, slot: 'a' }, loser_to: null },
  'losers:1:3': { winner_to: { bracket: 'losers', round: 2, match_number: 3, slot: 'a' }, loser_to: null },
  'losers:1:4': { winner_to: { bracket: 'losers', round: 2, match_number: 4, slot: 'a' }, loser_to: null },
  'losers:2:1': { winner_to: { bracket: 'losers', round: 3, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:2:2': { winner_to: { bracket: 'losers', round: 3, match_number: 1, slot: 'b' }, loser_to: null },
  'losers:2:3': { winner_to: { bracket: 'losers', round: 3, match_number: 2, slot: 'a' }, loser_to: null },
  'losers:2:4': { winner_to: { bracket: 'losers', round: 3, match_number: 2, slot: 'b' }, loser_to: null },
  'losers:3:1': { winner_to: { bracket: 'losers', round: 4, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:3:2': { winner_to: { bracket: 'losers', round: 4, match_number: 2, slot: 'a' }, loser_to: null },
  'losers:4:1': { winner_to: { bracket: 'losers', round: 5, match_number: 1, slot: 'a' }, loser_to: null },
  'losers:4:2': { winner_to: { bracket: 'losers', round: 5, match_number: 1, slot: 'b' }, loser_to: null },
  'losers:5:1': { winner_to: { bracket: 'grand_finals', round: 1, match_number: 1, slot: 'b' }, loser_to: null },
  'grand_finals:1:1': { winner_to: null, loser_to: null },
  'grand_finals:2:1': { winner_to: null, loser_to: null },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    console.log('[resolve-season3] Starting nightly resolution...');

    // 1. Find today's live matchup
    const today = new Date().toISOString().split('T')[0];
    const { data: liveMatches, error: liveErr } = await supabase
      .from('season3_matchups')
      .select('*')
      .eq('status', 'live');

    if (liveErr) throw liveErr;
    if (!liveMatches || liveMatches.length === 0) {
      console.log('[resolve-season3] No live matchup found. Exiting.');
      return new Response(JSON.stringify({ message: 'No live matchup today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const matchup = liveMatches[0];
    console.log(`[resolve-season3] Resolving matchup: ${matchup.bracket} R${matchup.round} M${matchup.match_number}`);

    // 2. Handle bye (one club is NULL)
    if (!matchup.club_a_id || !matchup.club_b_id) {
      const winnerId = matchup.club_a_id ?? matchup.club_b_id;
      const loserId = null;

      await supabase.from('season3_matchups').update({
        winner_id: winnerId,
        loser_id: loserId,
        status: 'completed',
      }).eq('id', matchup.id);

      if (winnerId) {
        await advanceTeam(supabase, matchup, winnerId, 'winner');
      }

      await activateNextMatch(supabase);
      console.log(`[resolve-season3] Bye resolved. Winner: ${winnerId}`);
      return new Response(JSON.stringify({ message: 'Bye resolved', winner: winnerId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Tally final step counts
    const { data: steps, error: stepErr } = await supabase
      .from('workout_submissions')
      .select('club_id, step_count, npub')
      .in('club_id', [matchup.club_a_id, matchup.club_b_id])
      .eq('leaderboard_date', matchup.match_date);

    if (stepErr) throw stepErr;

    let clubASteps = 0;
    let clubBSteps = 0;
    const clubAMembers = new Set<string>();
    const clubBMembers = new Set<string>();

    for (const row of steps ?? []) {
      if (row.club_id === matchup.club_a_id) {
        clubASteps += row.step_count ?? 0;
        if (row.npub) clubAMembers.add(row.npub);
      } else {
        clubBSteps += row.step_count ?? 0;
        if (row.npub) clubBMembers.add(row.npub);
      }
    }

    // 4. Determine winner
    let winnerSide: 'a' | 'b';
    if (clubASteps > clubBSteps) {
      winnerSide = 'a';
    } else if (clubBSteps > clubASteps) {
      winnerSide = 'b';
    } else if (clubAMembers.size > clubBMembers.size) {
      winnerSide = 'a';
    } else if (clubBMembers.size > clubAMembers.size) {
      winnerSide = 'b';
    } else {
      // Seed tiebreaker
      winnerSide = (matchup.seed_a ?? 99) <= (matchup.seed_b ?? 99) ? 'a' : 'b';
    }

    const winnerId = winnerSide === 'a' ? matchup.club_a_id : matchup.club_b_id;
    const loserId = winnerSide === 'a' ? matchup.club_b_id : matchup.club_a_id;

    console.log(`[resolve-season3] Club A: ${clubASteps} steps (${clubAMembers.size} active), Club B: ${clubBSteps} steps (${clubBMembers.size} active)`);
    console.log(`[resolve-season3] Winner: ${winnerSide} (${winnerId})`);

    // 5. Update matchup
    await supabase.from('season3_matchups').update({
      club_a_steps: clubASteps,
      club_b_steps: clubBSteps,
      club_a_active: clubAMembers.size,
      club_b_active: clubBMembers.size,
      winner_id: winnerId,
      loser_id: loserId,
      status: 'completed',
    }).eq('id', matchup.id);

    // 6. Advance teams
    await advanceTeam(supabase, matchup, winnerId, 'winner');
    if (loserId) {
      await advanceTeam(supabase, matchup, loserId, 'loser');
    }

    // 7. Handle grand finals reset
    if (matchup.bracket === 'grand_finals' && matchup.round === 1 && winnerSide === 'b') {
      // Losers bracket champ beat winners bracket champ — activate reset match
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      await supabase.from('season3_matchups').update({
        match_date: tomorrowStr,
        club_a_id: matchup.club_b_id, // GF1 winner (losers champ) goes to slot A
        club_b_id: matchup.club_a_id, // GF1 loser (winners champ) goes to slot B
        status: 'scheduled',
      }).eq('bracket', 'grand_finals').eq('round', 2).eq('match_number', 1);
    }

    // 8. Check if tournament is complete
    const { data: allMatchups } = await supabase
      .from('season3_matchups')
      .select('bracket, round, status, winner_id, club_a_id')
      .order('match_date');

    const gf1 = allMatchups?.find((m: any) => m.bracket === 'grand_finals' && m.round === 1);
    const gf2 = allMatchups?.find((m: any) => m.bracket === 'grand_finals' && m.round === 2);
    const isComplete = (gf1?.status === 'completed' && gf1.winner_id === gf1.club_a_id)
      || (gf2?.status === 'completed');

    if (isComplete) {
      await supabase.from('season3_config').update({ value: 'completed' }).eq('key', 'status');
      console.log('[resolve-season3] Tournament complete!');
    } else {
      // Activate next match
      await activateNextMatch(supabase);
      // Update config status to active if not already
      await supabase.from('season3_config').update({ value: 'active' }).eq('key', 'status');
    }

    return new Response(JSON.stringify({
      message: 'Matchup resolved',
      winner: winnerId,
      club_a_steps: clubASteps,
      club_b_steps: clubBSteps,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[resolve-season3] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/** Advance a team to their next matchup slot based on the bracket map */
async function advanceTeam(
  supabase: any,
  matchup: any,
  teamId: string,
  role: 'winner' | 'loser',
) {
  const key = `${matchup.bracket}:${matchup.round}:${matchup.match_number}`;
  const advancement = BRACKET_MAP[key];
  if (!advancement) {
    console.log(`[resolve-season3] No advancement found for ${key}`);
    return;
  }

  const dest = role === 'winner' ? advancement.winner_to : advancement.loser_to;
  if (!dest) {
    console.log(`[resolve-season3] No ${role} destination for ${key} (eliminated or champion)`);
    return;
  }

  // Find the seed of the advancing team
  const seed = (matchup.club_a_id === teamId) ? matchup.seed_a : matchup.seed_b;

  const column = dest.slot === 'a' ? 'club_a_id' : 'club_b_id';
  const seedColumn = dest.slot === 'a' ? 'seed_a' : 'seed_b';

  const { error } = await supabase
    .from('season3_matchups')
    .update({ [column]: teamId, [seedColumn]: seed })
    .eq('bracket', dest.bracket)
    .eq('round', dest.round)
    .eq('match_number', dest.match_number);

  if (error) {
    console.error(`[resolve-season3] Failed to advance ${role} to ${dest.bracket}:${dest.round}:${dest.match_number}: ${error.message}`);
  } else {
    console.log(`[resolve-season3] Advanced ${role} ${teamId} to ${dest.bracket} R${dest.round} M${dest.match_number} slot ${dest.slot}`);
  }
}

/** Find and activate the next scheduled/pending matchup that has both clubs assigned */
async function activateNextMatch(supabase: any) {
  const { data, error } = await supabase
    .from('season3_matchups')
    .select('*')
    .in('status', ['scheduled', 'pending'])
    .not('club_a_id', 'is', null)
    .order('match_date', { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.log('[resolve-season3] No next match to activate');
    return;
  }

  const next = data[0];

  // If the match has both clubs OR is a bye (only one club), activate it
  // Byes with NULL club_b are also valid to activate
  await supabase.from('season3_matchups')
    .update({ status: 'live' })
    .eq('id', next.id);

  console.log(`[resolve-season3] Activated next match: ${next.bracket} R${next.round} M${next.match_number} on ${next.match_date}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/resolve-season3-matchup/index.ts
git commit -m "Feature: Add Season III nightly matchup resolution edge function"
```

---

## Task 7: Cron Migration

**Files:**
- Create: `supabase/migrations/171_season3_cron.sql`

- [ ] **Step 1: Create the cron migration**

```sql
-- Season III: Nightly matchup resolution cron job
-- Runs at midnight UTC daily during the tournament

SELECT cron.schedule(
  'resolve-season3-matchup',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/resolve-season3-matchup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/171_season3_cron.sql
git commit -m "Feature: Add Season III nightly resolution cron job"
```

---

## Task 8: useSeason3 Hook

**Files:**
- Create: `src/hooks/useSeason3.ts`

- [ ] **Step 1: Create the hook**

```typescript
/**
 * useSeason3 — React hook for the Season III screen
 *
 * Provides bracket state, live scores, qualified clubs, and tournament phase.
 * Polls live step counts every 60s during an active matchup.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { Season3Service } from '../services/season/Season3Service';
import { Season3BracketService } from '../services/season/Season3BracketService';
import { getSeason3Status } from '../constants/season3';
import type {
  MatchupWithClubs,
  QualifiedClub,
  LiveScore,
  Season3Config,
  Season3Status,
} from '../types/season3';

interface UseSeason3Return {
  // Data
  bracket: MatchupWithClubs[];
  todaysMatchup: MatchupWithClubs | null;
  liveScores: LiveScore | null;
  qualifiedClubs: QualifiedClub[];
  notQualifiedClubs: QualifiedClub[];
  config: Season3Config | null;
  champion: string | null;
  runnerUp: string | null;

  // State
  tournamentPhase: Season3Status;
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
}

export function useSeason3(): UseSeason3Return {
  const [bracket, setBracket] = useState<MatchupWithClubs[]>([]);
  const [todaysMatchup, setTodaysMatchup] = useState<MatchupWithClubs | null>(null);
  const [liveScores, setLiveScores] = useState<LiveScore | null>(null);
  const [qualifiedClubs, setQualifiedClubs] = useState<QualifiedClub[]>([]);
  const [notQualifiedClubs, setNotQualifiedClubs] = useState<QualifiedClub[]>([]);
  const [config, setConfig] = useState<Season3Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { status: tournamentPhase } = getSeason3Status();

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);

      const [configData, bracketData, clubsData] = await Promise.all([
        Season3Service.getConfig(forceRefresh),
        Season3Service.getBracket(forceRefresh).catch(() => [] as MatchupWithClubs[]),
        Season3Service.getAllClubsWithStatus(forceRefresh),
      ]);

      setConfig(configData);
      setBracket(bracketData);
      setQualifiedClubs(clubsData.qualified);
      setNotQualifiedClubs(clubsData.notQualified);

      const liveMatch = bracketData.find(m => m.status === 'live') ?? null;
      setTodaysMatchup(liveMatch);

      // Fetch live steps if there's an active matchup
      if (liveMatch?.club_a_id && liveMatch?.club_b_id && liveMatch?.match_date) {
        const scores = await Season3Service.getLiveSteps(
          liveMatch.club_a_id,
          liveMatch.club_b_id,
          liveMatch.match_date,
        );
        setLiveScores(scores);
      } else {
        setLiveScores(null);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load Season III data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    Season3Service.clearCache();
    await loadData(true);
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll live scores every 60s during active matchup
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (todaysMatchup?.club_a_id && todaysMatchup?.club_b_id && todaysMatchup?.match_date) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const scores = await Season3Service.getLiveSteps(
            todaysMatchup.club_a_id!,
            todaysMatchup.club_b_id!,
            todaysMatchup.match_date!,
          );
          setLiveScores(scores);
        } catch {
          // Silent fail on poll
        }
      }, 60_000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [todaysMatchup?.id]);

  // Refresh on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData(true);
      }
    });
    return () => subscription.remove();
  }, [loadData]);

  // Derive champion/runner-up
  const results = Season3BracketService.getResults(bracket);

  return {
    bracket,
    todaysMatchup,
    liveScores,
    qualifiedClubs,
    notQualifiedClubs,
    config,
    champion: results?.champion ?? null,
    runnerUp: results?.runnerUp ?? null,
    tournamentPhase: config?.status ?? tournamentPhase,
    isLoading,
    error,
    refresh,
  };
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/dakotabrown/runstr.project && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSeason3.ts
git commit -m "Feature: Add useSeason3 hook with live score polling"
```

---

## Task 9: Season3EventCard — Compete Tab Card

**Files:**
- Create: `src/components/season3/Season3EventCard.tsx`

- [ ] **Step 1: Create the event card**

Follows the pattern of `src/components/events/Season2EventCard.tsx`.

```typescript
/**
 * Season3EventCard — Featured card on the Compete tab
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { getSeason3Status } from '../../constants/season3';

interface Season3EventCardProps {
  onPress?: () => void;
}

export const Season3EventCard: React.FC<Season3EventCardProps> = ({ onPress }) => {
  const { isRegistration, isActive } = getSeason3Status();

  const statusText = isActive
    ? 'LIVE'
    : isRegistration
      ? 'REGISTRATION OPEN'
      : 'COMING SOON';

  const statusColor = isActive
    ? theme.colors.success
    : theme.colors.accent;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>SEASON III</Text>
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{statusText}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>CLUB BATTLES</Text>
      <Text style={styles.description}>
        16 clubs. Double elimination. Daily step battles.
      </Text>

      <View style={styles.tags}>
        <View style={styles.tag}>
          <Ionicons name="people-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.tagText}>Team Competition</Text>
        </View>
        <View style={styles.tag}>
          <Ionicons name="footsteps-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.tagText}>Steps</Text>
        </View>
        <View style={styles.tag}>
          <Ionicons name="trophy-outline" size={14} color={theme.colors.accent} />
          <Text style={styles.tagText}>Rewards</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    gap: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/season3/Season3EventCard.tsx
git commit -m "Feature: Add Season III event card for Compete tab"
```

---

## Task 10: MatchupCard Component

**Files:**
- Create: `src/components/season3/MatchupCard.tsx`

- [ ] **Step 1: Create the matchup card**

Used in both the "Today's Matchup" hero area and in the bracket view for completed/upcoming matches.

```typescript
/**
 * MatchupCard — Displays a single Season III matchup
 *
 * Shows two clubs head-to-head with step counts.
 * Live matchups show animated step counters.
 * Completed matchups show final scores with winner highlighted.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import type { MatchupWithClubs, LiveScore } from '../../types/season3';
import { Season3BracketService } from '../../services/season/Season3BracketService';

interface MatchupCardProps {
  matchup: MatchupWithClubs;
  liveScores?: LiveScore | null;
  isHero?: boolean;
}

function formatSteps(steps: number): string {
  if (steps >= 1_000_000) return `${(steps / 1_000_000).toFixed(1)}M`;
  if (steps >= 1_000) return `${(steps / 1_000).toFixed(1)}K`;
  return steps.toLocaleString();
}

export const MatchupCard: React.FC<MatchupCardProps> = ({ matchup, liveScores, isHero = false }) => {
  const isLive = matchup.status === 'live';
  const isCompleted = matchup.status === 'completed';

  const clubASteps = isLive ? (liveScores?.club_a_steps ?? 0) : matchup.club_a_steps;
  const clubBSteps = isLive ? (liveScores?.club_b_steps ?? 0) : matchup.club_b_steps;

  const clubAName = matchup.club_a_name ?? 'TBD';
  const clubBName = matchup.club_b_name ?? 'TBD';

  const roundLabel = Season3BracketService.getRoundLabel(matchup.bracket, matchup.round);

  const isClubAWinner = isCompleted && matchup.winner_id === matchup.club_a_id;
  const isClubBWinner = isCompleted && matchup.winner_id === matchup.club_b_id;

  return (
    <View style={[styles.card, isHero && styles.heroCard, isLive && styles.liveCard]}>
      {/* Round label */}
      <View style={styles.header}>
        <Text style={styles.roundLabel}>{roundLabel}</Text>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        {matchup.match_date && !isLive && (
          <Text style={styles.dateText}>{matchup.match_date}</Text>
        )}
      </View>

      {/* Head-to-head */}
      <View style={styles.versus}>
        {/* Club A */}
        <View style={[styles.club, isClubAWinner && styles.winnerClub]}>
          <Text style={[styles.clubName, isClubAWinner && styles.winnerText]} numberOfLines={1}>
            {clubAName}
          </Text>
          {(isLive || isCompleted) && (
            <Text style={[styles.steps, isHero && styles.heroSteps]}>
              {formatSteps(clubASteps)}
            </Text>
          )}
        </View>

        <Text style={styles.vsText}>VS</Text>

        {/* Club B */}
        <View style={[styles.club, isClubBWinner && styles.winnerClub]}>
          <Text style={[styles.clubName, isClubBWinner && styles.winnerText]} numberOfLines={1}>
            {clubBName}
          </Text>
          {(isLive || isCompleted) && (
            <Text style={[styles.steps, isHero && styles.heroSteps]}>
              {formatSteps(clubBSteps)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  heroCard: {
    padding: 20,
    borderColor: theme.colors.accent,
  },
  liveCard: {
    borderColor: theme.colors.accent,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  liveText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  versus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  club: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  winnerClub: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  clubName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  winnerText: {
    color: theme.colors.accent,
  },
  vsText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  steps: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  heroSteps: {
    fontSize: 28,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/season3/MatchupCard.tsx
git commit -m "Feature: Add Season III matchup card component"
```

---

## Task 11: QualifiedClubsList Component

**Files:**
- Create: `src/components/season3/QualifiedClubsList.tsx`

- [ ] **Step 1: Create the qualified clubs list**

```typescript
/**
 * QualifiedClubsList — Shows clubs that qualify for Season III
 *
 * Displayed during registration phase. Shows qualified (4+ members)
 * and not-yet-qualified clubs to motivate recruitment.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { QualifiedClub } from '../../types/season3';

interface QualifiedClubsListProps {
  qualified: QualifiedClub[];
  notQualified: QualifiedClub[];
  maxClubs: number;
}

export const QualifiedClubsList: React.FC<QualifiedClubsListProps> = ({
  qualified,
  notQualified,
  maxClubs,
}) => {
  return (
    <View style={styles.container}>
      {/* Qualified section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>QUALIFIED ({qualified.length}/{maxClubs})</Text>
      </View>

      {qualified.length === 0 && (
        <Text style={styles.emptyText}>No clubs have qualified yet</Text>
      )}

      {qualified.map((club, index) => (
        <View key={club.id} style={styles.clubRow}>
          <View style={styles.clubInfo}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
          </View>
          <Text style={styles.memberCount}>{club.member_count} members</Text>
        </View>
      ))}

      {/* Not qualified section */}
      {notQualified.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>NOT YET QUALIFIED</Text>
            <Text style={styles.sectionSubtitle}>Need 4+ members</Text>
          </View>

          {notQualified.map((club) => (
            <View key={club.id} style={[styles.clubRow, styles.dimRow]}>
              <View style={styles.clubInfo}>
                <Ionicons name="ellipse-outline" size={16} color={theme.colors.textMuted} />
                <Text style={[styles.clubName, styles.dimText]} numberOfLines={1}>{club.name}</Text>
              </View>
              <Text style={[styles.memberCount, styles.dimText]}>{club.member_count}/4 members</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  clubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  clubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  clubName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
  },
  memberCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  dimRow: {
    opacity: 0.6,
  },
  dimText: {
    color: theme.colors.textMuted,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/season3/QualifiedClubsList.tsx
git commit -m "Feature: Add Season III qualified clubs list component"
```

---

## Task 12: BracketView Component

**Files:**
- Create: `src/components/season3/BracketView.tsx`

- [ ] **Step 1: Create the bracket visualization**

This is a horizontally scrollable bracket showing all matchups organized by round. Each matchup is a compact node showing club names and scores.

```typescript
/**
 * BracketView — Double-elimination bracket visualization
 *
 * Shows winners bracket, losers bracket, and grand finals.
 * Horizontally scrollable. Completed matches show scores,
 * live match is highlighted, upcoming shows "TBD".
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Season3BracketService } from '../../services/season/Season3BracketService';
import type { MatchupWithClubs } from '../../types/season3';

interface BracketViewProps {
  matchups: MatchupWithClubs[];
}

/** Compact matchup node for the bracket */
function BracketNode({ matchup }: { matchup: MatchupWithClubs }) {
  const isLive = matchup.status === 'live';
  const isCompleted = matchup.status === 'completed';
  const isClubAWinner = isCompleted && matchup.winner_id === matchup.club_a_id;
  const isClubBWinner = isCompleted && matchup.winner_id === matchup.club_b_id;

  return (
    <View style={[styles.node, isLive && styles.liveNode]}>
      {isLive && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>LIVE</Text>
        </View>
      )}
      <View style={[styles.teamRow, isClubAWinner && styles.winnerRow]}>
        <Text style={[styles.teamName, isClubAWinner && styles.winnerName]} numberOfLines={1}>
          {matchup.club_a_name ?? 'TBD'}
        </Text>
        {isCompleted && (
          <Text style={[styles.score, isClubAWinner && styles.winnerName]}>
            {(matchup.club_a_steps / 1000).toFixed(0)}K
          </Text>
        )}
      </View>
      <View style={styles.divider} />
      <View style={[styles.teamRow, isClubBWinner && styles.winnerRow]}>
        <Text style={[styles.teamName, isClubBWinner && styles.winnerName]} numberOfLines={1}>
          {matchup.club_b_name ?? 'TBD'}
        </Text>
        {isCompleted && (
          <Text style={[styles.score, isClubBWinner && styles.winnerName]}>
            {(matchup.club_b_steps / 1000).toFixed(0)}K
          </Text>
        )}
      </View>
    </View>
  );
}

/** Group matchups by bracket section and round */
function groupBySection(matchups: MatchupWithClubs[]): {
  winners: Map<number, MatchupWithClubs[]>;
  losers: Map<number, MatchupWithClubs[]>;
  grandFinals: MatchupWithClubs[];
} {
  const winners = new Map<number, MatchupWithClubs[]>();
  const losers = new Map<number, MatchupWithClubs[]>();
  const grandFinals: MatchupWithClubs[] = [];

  for (const m of matchups) {
    if (m.bracket === 'grand_finals') {
      grandFinals.push(m);
    } else if (m.bracket === 'winners') {
      if (!winners.has(m.round)) winners.set(m.round, []);
      winners.get(m.round)!.push(m);
    } else {
      if (!losers.has(m.round)) losers.set(m.round, []);
      losers.get(m.round)!.push(m);
    }
  }

  return { winners, losers, grandFinals };
}

export const BracketView: React.FC<BracketViewProps> = ({ matchups }) => {
  if (matchups.length === 0) {
    return (
      <View style={styles.emptyBracket}>
        <Text style={styles.emptyText}>Bracket will be revealed on May 15</Text>
      </View>
    );
  }

  const { winners, losers, grandFinals } = groupBySection(matchups);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
      <View style={styles.bracketContainer}>
        {/* Winners Bracket */}
        <Text style={styles.bracketLabel}>WINNERS BRACKET</Text>
        <View style={styles.roundsRow}>
          {Array.from(winners.entries())
            .sort(([a], [b]) => a - b)
            .map(([round, roundMatchups]) => (
              <View key={`w-${round}`} style={styles.roundColumn}>
                <Text style={styles.roundLabel}>
                  {Season3BracketService.getRoundLabel('winners', round)}
                </Text>
                {roundMatchups
                  .sort((a, b) => a.match_number - b.match_number)
                  .map((m) => (
                    <BracketNode key={m.id} matchup={m} />
                  ))}
              </View>
            ))}
        </View>

        {/* Grand Finals */}
        {grandFinals.length > 0 && (
          <>
            <Text style={[styles.bracketLabel, { marginTop: 20 }]}>GRAND FINALS</Text>
            <View style={styles.roundsRow}>
              {grandFinals
                .sort((a, b) => a.round - b.round)
                .map((m) => (
                  <BracketNode key={m.id} matchup={m} />
                ))}
            </View>
          </>
        )}

        {/* Losers Bracket */}
        <Text style={[styles.bracketLabel, { marginTop: 20 }]}>LOSERS BRACKET</Text>
        <View style={styles.roundsRow}>
          {Array.from(losers.entries())
            .sort(([a], [b]) => a - b)
            .map(([round, roundMatchups]) => (
              <View key={`l-${round}`} style={styles.roundColumn}>
                <Text style={styles.roundLabel}>
                  {Season3BracketService.getRoundLabel('losers', round)}
                </Text>
                {roundMatchups
                  .sort((a, b) => a.match_number - b.match_number)
                  .map((m) => (
                    <BracketNode key={m.id} matchup={m} />
                  ))}
              </View>
            ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  bracketContainer: {
    padding: 16,
    minWidth: '100%',
  },
  bracketLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 2,
    marginBottom: 8,
  },
  roundsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roundColumn: {
    gap: 8,
    minWidth: 150,
  },
  roundLabel: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  node: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    minWidth: 140,
  },
  liveNode: {
    borderColor: theme.colors.accent,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.accent,
  },
  liveLabel: {
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  winnerRow: {
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
  },
  teamName: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
  },
  winnerName: {
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.bold,
  },
  score: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  emptyBracket: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/season3/BracketView.tsx
git commit -m "Feature: Add Season III bracket visualization component"
```

---

## Task 13: Season3Screen

**Files:**
- Create: `src/screens/season3/Season3Screen.tsx`

- [ ] **Step 1: Create the main screen**

```typescript
/**
 * Season3Screen — Main Season III Club Battles screen
 *
 * Three phases: Registration, Tournament (live bracket), Completed.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useSeason3 } from '../../hooks/useSeason3';
import { MatchupCard } from '../../components/season3/MatchupCard';
import { BracketView } from '../../components/season3/BracketView';
import { QualifiedClubsList } from '../../components/season3/QualifiedClubsList';
import { SEASON_3_CONFIG } from '../../constants/season3';

export const Season3Screen: React.FC = () => {
  const navigation = useNavigation();
  const {
    bracket,
    todaysMatchup,
    liveScores,
    qualifiedClubs,
    notQualifiedClubs,
    config,
    champion,
    runnerUp,
    tournamentPhase,
    isLoading,
    refresh,
  } = useSeason3();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  // Countdown text
  const countdownText = useMemo(() => {
    const deadline = new Date(SEASON_3_CONFIG.registrationDeadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? 's' : ''} until bracket reveal`;
  }, []);

  // Upcoming schedule (next 5 matches)
  const upcomingMatches = useMemo(() => {
    return bracket
      .filter(m => m.status === 'scheduled' || m.status === 'pending')
      .filter(m => m.club_a_id || m.club_b_id)
      .slice(0, 5);
  }, [bracket]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons
          name="chevron-back"
          size={24}
          color={theme.colors.text}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>SEASON III</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>CLUB BATTLES</Text>
          <Text style={styles.bannerSubtitle}>
            16 clubs. Double elimination. One step battle per day.
          </Text>
          {config?.prize_pool_first && config.prize_pool_first !== 'TBD' && (
            <Text style={styles.prizeText}>
              Rewards for 1st and 2nd place
            </Text>
          )}
        </View>

        {/* ── Registration Phase ── */}
        {(tournamentPhase === 'registration' || tournamentPhase === 'bracket_set') && (
          <>
            {countdownText && (
              <View style={styles.countdown}>
                <Ionicons name="time-outline" size={16} color={theme.colors.accent} />
                <Text style={styles.countdownText}>{countdownText}</Text>
              </View>
            )}

            <View style={styles.section}>
              <QualifiedClubsList
                qualified={qualifiedClubs}
                notQualified={notQualifiedClubs}
                maxClubs={config?.max_clubs ?? 16}
              />
            </View>

            {/* Empty bracket preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BRACKET</Text>
              <BracketView matchups={bracket} />
            </View>
          </>
        )}

        {/* ── Tournament Phase ── */}
        {tournamentPhase === 'active' && (
          <>
            {/* Today's Matchup */}
            {todaysMatchup && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TODAY'S BATTLE</Text>
                <MatchupCard
                  matchup={todaysMatchup}
                  liveScores={liveScores}
                  isHero
                />
              </View>
            )}

            {!todaysMatchup && (
              <View style={styles.section}>
                <Text style={styles.noMatchText}>No battle today. Next match coming soon.</Text>
              </View>
            )}

            {/* Bracket */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BRACKET</Text>
              <BracketView matchups={bracket} />
            </View>

            {/* Upcoming Schedule */}
            {upcomingMatches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>UPCOMING</Text>
                {upcomingMatches.map((m) => (
                  <View key={m.id} style={styles.scheduleRow}>
                    <Text style={styles.scheduleDate}>{m.match_date ?? 'TBD'}</Text>
                    <Text style={styles.scheduleTeams}>
                      {m.club_a_name ?? 'TBD'} vs {m.club_b_name ?? 'TBD'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Completed Phase ── */}
        {tournamentPhase === 'completed' && (
          <>
            {champion && (
              <View style={styles.championBanner}>
                <Ionicons name="trophy" size={32} color={theme.colors.accent} />
                <Text style={styles.championTitle}>CHAMPION</Text>
                <Text style={styles.championName}>
                  {bracket.find(m => m.club_a_id === champion)?.club_a_name
                    ?? bracket.find(m => m.club_b_id === champion)?.club_b_name
                    ?? 'Unknown'}
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FINAL BRACKET</Text>
              <BracketView matchups={bracket} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    letterSpacing: 3,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  prizeText: {
    fontSize: 13,
    color: theme.colors.accent,
    marginTop: 8,
    fontWeight: theme.typography.weights.semiBold,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  noMatchText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  scheduleDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    width: 80,
  },
  scheduleTeams: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
  },
  championBanner: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  championTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 2,
    marginTop: 8,
  },
  championName: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 4,
  },
});

export default Season3Screen;
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/dakotabrown/runstr.project && npx tsc --noEmit --pretty 2>&1 | tail -10`
Expected: No new errors from season3 files

- [ ] **Step 3: Commit**

```bash
git add src/screens/season3/Season3Screen.tsx
git commit -m "Feature: Add Season III screen with registration, tournament, and completed phases"
```

---

## Task 14: Navigation Integration

**Files:**
- Modify: `src/navigation/AppNavigator.tsx` (line 82 for type, line 41 for import, line 495 for route)
- Modify: `src/screens/CompeteScreen.tsx` (lines 46-47 for handler, line 97 for prop)
- Modify: `src/components/compete/EventsContent.tsx` (line 27 for prop, line 58 for card)

- [ ] **Step 1: Add Season3 route to AppNavigator.tsx**

Add to `RootStackParamList` (after the `Season2: undefined;` line ~82):

```typescript
  Season3: undefined;
```

Add import (near the Season2Screen import ~line 41):

```typescript
import { Season3Screen } from '../screens/season3/Season3Screen';
```

Add Stack.Screen (after the Season2 Stack.Screen block ~line 495):

```typescript
        {/* Season3 Screen - Season III Club Battles */}
        <Stack.Screen
          name="Season3"
          component={Season3Screen}
          options={defaultScreenOptions}
        />
```

- [ ] **Step 2: Add handler to CompeteScreen.tsx**

Add after `handleSeason2Press` (after line 47):

```typescript
  // Handle Season III card press - navigate to Season3Screen
  const handleSeason3Press = useCallback(() => {
    navigation.navigate('Season3');
  }, [navigation]);
```

Update EventsContent props (line 95-100) to pass the handler:

```typescript
        <EventsContent
          onEinundzwanzigPress={handleEinundzwanzigPress}
          onSeason2Press={undefined}
          onSeason3Press={handleSeason3Press}
          onLeaderboardPress={handleLeaderboardPress}
          onDynamicEventPress={handleDynamicEventPress}
        />
```

- [ ] **Step 3: Update EventsContent.tsx**

Add to `EventsContentProps` interface (after line 27):

```typescript
  onSeason3Press?: () => void;
```

Add to destructured props (after `onSeason2Press` in the component function params):

```typescript
  onSeason3Press,
```

Add Season3EventCard import at the top (after the Season2EventCard import ~line 18):

```typescript
import { Season3EventCard } from '../season3/Season3EventCard';
```

Add the card JSX before the Season2 card (insert before line 56):

```typescript
      {/* 0. RUNSTR Season III - Club Battles */}
      <View style={styles.featuredEvent}>
        <Season3EventCard onPress={onSeason3Press} />
      </View>
```

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/dakotabrown/runstr.project && npx tsc --noEmit --pretty 2>&1 | tail -10`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/screens/CompeteScreen.tsx src/components/compete/EventsContent.tsx
git commit -m "Feature: Wire up Season III navigation from Compete tab"
```

---

## Task 15: Verification

- [ ] **Step 1: Run full typecheck**

Run: `cd /Users/dakotabrown/runstr.project && npm run typecheck`
Expected: Clean pass (or only pre-existing errors)

- [ ] **Step 2: Write verification script**

Create `scripts/verify/verify-season3.ts`:

```typescript
/**
 * Verify Season III implementation:
 * - All new files exist
 * - Types are importable
 * - Bracket map covers all 30 matchup slots
 * - Bracket advancement is consistent (every winner_to/loser_to points to a valid slot)
 */

import { BRACKET_MAP, bracketKey } from '../../src/constants/season3';

// All expected matchup slots
const expectedSlots = [
  // Winners
  ...Array.from({ length: 8 }, (_, i) => bracketKey('winners', 1, i + 1)),
  ...Array.from({ length: 4 }, (_, i) => bracketKey('winners', 2, i + 1)),
  ...Array.from({ length: 2 }, (_, i) => bracketKey('winners', 3, i + 1)),
  bracketKey('winners', 4, 1),
  // Losers
  ...Array.from({ length: 4 }, (_, i) => bracketKey('losers', 1, i + 1)),
  ...Array.from({ length: 4 }, (_, i) => bracketKey('losers', 2, i + 1)),
  ...Array.from({ length: 2 }, (_, i) => bracketKey('losers', 3, i + 1)),
  ...Array.from({ length: 2 }, (_, i) => bracketKey('losers', 4, i + 1)),
  bracketKey('losers', 5, 1),
  // Grand Finals
  bracketKey('grand_finals', 1, 1),
  bracketKey('grand_finals', 2, 1),
];

console.log('Checking bracket map coverage...');

let errors = 0;

// Check every expected slot has a map entry
for (const slot of expectedSlots) {
  if (!BRACKET_MAP[slot]) {
    console.error(`MISSING: ${slot} not in BRACKET_MAP`);
    errors++;
  }
}

// Check every advancement destination points to a valid slot
for (const [key, adv] of Object.entries(BRACKET_MAP)) {
  if (adv.winner_to) {
    const dest = bracketKey(adv.winner_to.bracket, adv.winner_to.round, adv.winner_to.match_number);
    if (!BRACKET_MAP[dest]) {
      console.error(`BAD DEST: ${key} winner_to ${dest} not in map`);
      errors++;
    }
  }
  if (adv.loser_to) {
    const dest = bracketKey(adv.loser_to.bracket, adv.loser_to.round, adv.loser_to.match_number);
    if (!BRACKET_MAP[dest]) {
      console.error(`BAD DEST: ${key} loser_to ${dest} not in map`);
      errors++;
    }
  }
}

console.log(`\nBracket map has ${Object.keys(BRACKET_MAP).length} entries, expected ${expectedSlots.length}`);
console.log(errors === 0 ? 'All checks passed!' : `${errors} errors found`);

process.exit(errors > 0 ? 1 : 0);
```

- [ ] **Step 3: Run verification**

Run: `cd /Users/dakotabrown/runstr.project && npx tsx scripts/verify/verify-season3.ts`
Expected: "All checks passed!"

- [ ] **Step 4: Commit verification script**

```bash
git add scripts/verify/verify-season3.ts
git commit -m "Chore: Add Season III bracket map verification script"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Supabase migration | `170_season3_setup.sql` |
| 2 | TypeScript types | `src/types/season3.ts` |
| 3 | Constants + bracket map | `src/constants/season3.ts` |
| 4 | Bracket service | `src/services/season/Season3BracketService.ts` |
| 5 | Data service | `src/services/season/Season3Service.ts` |
| 6 | Edge function | `supabase/functions/resolve-season3-matchup/index.ts` |
| 7 | Cron migration | `171_season3_cron.sql` |
| 8 | React hook | `src/hooks/useSeason3.ts` |
| 9 | Event card | `src/components/season3/Season3EventCard.tsx` |
| 10 | Matchup card | `src/components/season3/MatchupCard.tsx` |
| 11 | Qualified clubs list | `src/components/season3/QualifiedClubsList.tsx` |
| 12 | Bracket visualization | `src/components/season3/BracketView.tsx` |
| 13 | Main screen | `src/screens/season3/Season3Screen.tsx` |
| 14 | Navigation wiring | `AppNavigator.tsx`, `CompeteScreen.tsx`, `EventsContent.tsx` |
| 15 | Verification | `scripts/verify/verify-season3.ts` |
