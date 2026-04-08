# Season III: Club Battles — Design Spec

## Overview

Season III is a 16-team double-elimination bracket tournament where Fitness Clubs compete head-to-head on daily step counts. One matchup per day, ~30 game days over 5-6 weeks. Steps are the universal metric — levels the playing field between runners and walkers.

## Timeline

- **Registration period:** Now through May 15, 2026
- **Bracket generation:** May 15 (manual SQL function call)
- **Tournament starts:** May 19, 2026 (Monday)
- **Tournament ends:** ~late June 2026 (~30 matchup days)

## Eligibility

- Active clubs with 4+ members at bracket generation time
- Cap: 16 clubs (first 16 qualifying, randomly seeded)
- Free to enter — no entry fee for clubs
- Once bracket is generated, clubs are locked in regardless of future member changes

## Tournament Format

### Double Elimination Bracket (16 teams)

**Winners Bracket:**
- Round 1: 8 matchups (16 to 8)
- Round 2: 4 matchups (8 to 4)
- Round 3: 2 matchups (4 to 2)
- Round 4: 1 matchup (winners finals)

**Losers Bracket:**
- Losers Round 1: 4 matchups (8 WR1 losers down to 4)
- Losers Round 2: 4 matchups (4 LR1 winners vs 4 WR2 losers)
- Losers Round 3: 2 matchups (4 down to 2)
- Losers Round 4: 2 matchups (2 LR3 winners vs 2 WR3 losers)
- Losers Round 5: 1 matchup (losers finals)

**Grand Finals:**
- 1 matchup: winners bracket champion vs losers bracket champion
- If losers bracket team wins, reset match (1 additional day)

**Total: 28-30 matchups depending on grand finals reset.**

### Scoring

- **Metric:** Total steps from all club members for the matchup day
- **Source:** `workout_submissions` table — `step_count` grouped by `club_id` for the `leaderboard_date`
- **Tiebreaker:** Most active members (unique members who logged steps). If still tied, higher-seeded club advances.

### Rewards

- Prize pool for 1st and 2nd place clubs
- Manual payout: Dakota zaps the winning captains, captains distribute to teammates at their discretion
- No automated payout logic needed

## Data Model

### New table: `season3_matchups`

```sql
CREATE TABLE season3_matchups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round           INTEGER NOT NULL,
  bracket         TEXT NOT NULL CHECK (bracket IN ('winners', 'losers', 'grand_finals')),
  match_number    INTEGER NOT NULL,
  match_date      DATE,
  club_a_id       UUID REFERENCES user_teams(id),
  club_b_id       UUID REFERENCES user_teams(id),
  club_a_steps    BIGINT DEFAULT 0,
  club_b_steps    BIGINT DEFAULT 0,
  winner_id       UUID REFERENCES user_teams(id),
  loser_id        UUID REFERENCES user_teams(id),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'live', 'completed')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(round, bracket, match_number)
);
```

### New table: `season3_config`

```sql
CREATE TABLE season3_config (
  key             TEXT PRIMARY KEY,
  value           TEXT NOT NULL
);

INSERT INTO season3_config (key, value) VALUES
  ('registration_deadline', '2026-05-15'),
  ('start_date', '2026-05-19'),
  ('status', 'registration'),
  ('min_members', '4'),
  ('max_clubs', '16'),
  ('prize_pool_first', 'TBD'),
  ('prize_pool_second', 'TBD');
```

### No new registration tables

Qualifying clubs are derived at bracket generation time from:

```sql
SELECT ut.id, ut.name, COUNT(cm.member_npub) as member_count
FROM user_teams ut
JOIN club_memberships cm ON cm.club_id = ut.id
WHERE ut.is_active = true
GROUP BY ut.id, ut.name
HAVING COUNT(cm.member_npub) >= 4
ORDER BY random()
LIMIT 16;
```

### Step counting reuses existing infrastructure

Live matchup scoring query:

```sql
SELECT club_id, SUM(step_count) as total_steps
FROM workout_submissions
WHERE club_id IN (club_a_id, club_b_id)
AND leaderboard_date = match_date
GROUP BY club_id;
```

No new submission logic. `StepCompetitionService` already auto-submits daily steps with `club_id`.

## Bracket Generation

SQL function `generate_season3_bracket()` called manually on May 15 via Supabase SQL editor.

1. Queries active clubs with 4+ members
2. Randomly orders them, takes up to 16
3. Creates all matchup rows using a hardcoded 16-team double-elimination bracket map
4. Assigns dates starting May 19 (one matchup per day, every day including weekends)
5. Populates Round 1 matchups with seeded club IDs
6. Later rounds have NULL club IDs — filled in as teams advance

The bracket map is a fixed constant: for each matchup slot, it defines where the winner goes and where the loser goes. This is a solved structure for 16-team double elimination.

## Nightly Resolution: `resolve-season3-matchup` Edge Function

Triggered by pg_cron at midnight UTC daily during the tournament.

### Logic:

1. Query `season3_matchups` for today's match (status = 'live')
2. If no live match today, exit
3. Query `workout_submissions` for final step totals:
   - SUM(step_count) WHERE club_id = club_a_id AND leaderboard_date = match_date
   - SUM(step_count) WHERE club_id = club_b_id AND leaderboard_date = match_date
4. Store step totals on the matchup row
5. Determine winner (higher steps, tiebreaker if needed)
6. Set winner_id, loser_id, status = 'completed'
7. Advance winner to next matchup slot (fill in club_a_id or club_b_id on the next row)
8. If losers bracket: advance loser to their losers bracket slot
9. Set tomorrow's matchup status to 'live'

### Tiebreaker logic:

1. Most unique members who logged steps that day
2. If still tied, higher original seed (lower match position in Round 1)

### Cron setup:

```sql
SELECT cron.schedule(
  'resolve-season3-matchup',
  '0 0 * * *',  -- midnight UTC daily
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/resolve-season3-matchup',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```

## Service Layer

### `Season3Service.ts`

Main service for reading tournament state:

- `getConfig()` — fetch season3_config, cached 10 min
- `getQualifiedClubs()` — clubs with 4+ members, cached 5 min
- `getBracket()` — all matchup rows, cached 5 min
- `getTodaysMatchup()` — current live matchup, cached 1 min
- `getLiveSteps(clubAId, clubBId, date)` — live step totals from workout_submissions, cached 1 min
- `getClubTournamentHistory(clubId)` — all matchups involving a club

### `Season3BracketService.ts`

Bracket logic (used by the edge function and the generation script):

- `BRACKET_MAP` — hardcoded 16-team double-elim structure defining winner/loser advancement paths
- `advanceWinner(matchup)` — populate next matchup slot for the winner
- `advanceLoser(matchup)` — populate losers bracket slot (only from winners bracket losses)
- `isGrandFinalsReset(matchup)` — check if grand finals needs a reset match

### `useSeason3.ts` Hook

Provides the screen with reactive data:

- `bracket` — full bracket state
- `todaysMatchup` — current live match
- `liveScores` — { clubASteps, clubBSteps }, polls every 60s during live match
- `qualifiedClubs` — for registration phase
- `tournamentPhase` — 'registration' | 'active' | 'completed'
- `config` — prize pool, dates, etc.

## Season III Screen

### Three phases:

**Registration (now - May 15):**
- Season III banner with prize pool and countdown to May 15
- "Qualified Clubs" list — club name, member count, captain
- "Not Yet Qualified" section — clubs under 4 members
- Empty 16-slot bracket template at the bottom

**Tournament (May 19 - ~late June):**
- "Today's Matchup" hero card — two clubs head-to-head with live step counters
- Full bracket visualization — completed results filled in, today's match highlighted, upcoming matches visible
- "Schedule" section — upcoming match dates
- Tap any matchup for details

**Completed:**
- Final bracket with all results
- Champion and runner-up highlighted

### Navigation:

- Featured `Season3EventCard.tsx` on the Compete tab (like Season II)
- Taps through to `Season3Screen.tsx`

## Bracket Visualization Component

The bracket UI shows the full double-elimination structure:

- Winners bracket on top, losers bracket below, grand finals centered
- Each matchup node shows: club names (or "TBD"), step totals (if completed), winner highlight
- Today's live match pulses/highlights
- Horizontally scrollable for the full bracket width
- Club logos/avatars where available

## What We Reuse

- `workout_submissions` table (has `club_id`, `step_count`, `leaderboard_date`)
- `StepCompetitionService` (auto-submits daily steps)
- `club_memberships` (member count queries)
- Full club infrastructure (pages, chat, membership)
- Compete tab navigation pattern
- `process-club-payouts` cron pattern (template for edge function)

## What's New

- `season3_matchups` + `season3_config` tables (1 migration)
- `generate_season3_bracket()` SQL function
- `resolve-season3-matchup` edge function + pg_cron trigger
- `Season3Service.ts` + `Season3BracketService.ts`
- `useSeason3.ts` hook
- `Season3Screen.tsx`
- `Season3EventCard.tsx`
- Bracket visualization component

## Risk Areas and Mitigations

1. **Double-elimination advancement logic** — hardcode the 16-team bracket map as a constant. Test thoroughly with dummy data before launch.
2. **Ties** — tiebreaker rules defined: most active members, then higher seed.
3. **Clubs losing members mid-tournament** — clubs locked in once bracket generates.
4. **Step submission timing** — `StepCompetitionService` submits on app foreground every 30 min. Members must open the app for steps to count. This is existing behavior and motivates daily engagement.
5. **Edge function failure** — if nightly resolution fails, bracket stalls but no data is lost. Can be re-triggered manually or resolved via SQL editor.
