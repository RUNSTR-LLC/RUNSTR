# Simplified Events — Design Spec

## Overview

Simplify event creation to two taps: pick a template, pick a duration. Drop pledge complexity. Add optional auto-recurring (weekly/monthly). Club events surface on the Events tab alongside daily leaderboards. Competition winners earn XP bonuses. A daily cron handles recurring event creation and competition finalization with XP awards.

## Goals

1. **Two-tap creation** — captains create events in seconds, not minutes
2. **Auto-recurring** — set it once, events repeat forever
3. **Visible everywhere** — club events show on the Events tab for discovery
4. **Incentivized** — XP bonuses for placing, so competitions matter

## Simplified Creation Flow

Captain taps "Create Event" on their club page:

```
┌──────────────────────────────────────┐
│           Create Event               │
├──────────────────────────────────────┤
│                                      │
│  ┌────────┐ ┌────────┐              │
│  │  5K    │ │  10K   │              │
│  │  Race  │ │  Race  │              │
│  └────────┘ └────────┘              │
│  ┌────────┐ ┌────────┐              │
│  │  Half  │ │ Steps  │              │
│  │Marathon│ │Challenge│              │
│  └────────┘ └────────┘              │
│                                      │
│  Duration:  [1d] [3d] [7d] [30d]    │
│                                      │
│  Repeat:    [Off] [Weekly] [Monthly] │
│                                      │
│         [ CREATE EVENT ]             │
└──────────────────────────────────────┘
```

### What happens on create:
- Event starts immediately (`start_date = now()`)
- `end_date = start_date + duration`
- Event name auto-generated: "{Club Name} {Template Name}" (e.g., "RUNSTR Club 5K Race")
- Event image: club's `banner_url` automatically (no image picker)
- Pledge days: 0 (no entry fee)
- All club members auto-joined
- Event appears on Events tab AND club page
- If recurring: `recurring_interval` stored for cron

### What's removed from creation:
- Pledge/ticket days picker
- Image picker
- Lightning address requirement
- Winner selection picker (defaults to `top_ranked`)
- Custom event name (auto-generated from club name + template)
- Description (set to null — not needed for template events)

### Templates (existing 4, unchanged):
| Template | Activity | Scoring | Key |
|----------|----------|---------|-----|
| 5K Race | running | fastest_time | `5k_race` |
| 10K Race | running | fastest_time | `10k_race` |
| Half Marathon | running | total_distance | `half_marathon` |
| Step Challenge | walking | total_steps | `step_challenge` |

### Duration options:
| Option | Days |
|--------|------|
| 1d | 1 |
| 3d | 3 |
| 7d | 7 |
| 30d | 30 |

All durations available for all templates. Captain decides what makes sense.

### Recurring options:
| Option | Behavior |
|--------|----------|
| Off | One-time event |
| Weekly | New event auto-created every week |
| Monthly | New event auto-created every month |

## Events Tab Changes

### Current behavior:
- Shows hardcoded featured events (Season II, Daily Leaderboards, etc.)
- Shows dynamic events from `SupabaseCompetitionService.fetchDynamicCompetitions()` — this already fetches ALL competitions (no `club_id IS NULL` filter). Club events may already appear.
- Note: `AutoJoinService` DOES filter `club_id IS NULL` for auto-join — this is correct and must NOT be changed (prevents auto-joining club events from non-club workouts).

### New behavior:
- Verify club events already appear on Events tab (they likely do). If any client-side filtering exists in `EventsContent.tsx`, remove it.
- Club events appear mixed in, sorted by start date (newest first)
- Club events display the club's `banner_url` as the event image
- Club events show a small club name badge on the card
- Anyone can see club events on the Events tab
- Only club members can join (non-members see "Join club to compete")

### No layout changes to the Events tab — just more events appearing.

## Auto-Recurring Events

### Schema additions to `competitions` table:
```
recurring_interval    TEXT DEFAULT 'none' ('none' | 'weekly' | 'monthly')
recurring_parent_id   UUID (nullable, references competitions.id — links recurring instances)
is_finalized          BOOLEAN DEFAULT false
```

### Cron job: `finalize-and-recur-events`

New Edge Function, runs daily. Two responsibilities:

**1. Finalize ended competitions:**
- Query `competitions` where `end_date < now()` AND `is_finalized = false`
- For each: calculate leaderboard, award XP bonuses, set `is_finalized = true`

**2. Create recurring instances:**
- Query `competitions` where `recurring_interval != 'none'` AND `end_date < now()` AND `is_finalized = true`
- Check no future instance exists (no record with same `recurring_parent_id` AND `start_date > now()`)
- For each: create new competition with same template, duration, club_id, scoring
- New start_date = old end_date (back-to-back)
- New end_date = start_date + original duration
- Auto-join all current club members
- Set `recurring_parent_id` to the ORIGINAL event's ID (always points to the first event in the chain, never the immediate predecessor). This ensures the duplicate-check query works correctly across the entire chain.

### Captain control:
- Edit event → set `recurring_interval = 'none'` to stop recurring
- Cron stops creating new instances

## XP Bonuses for Competition Placement

### When a competition is finalized:

| Placement | XP Bonus |
|-----------|----------|
| 1st | +500 XP |
| 2nd | +250 XP |
| 3rd | +100 XP |
| 4th-10th | +50 XP |
| Finisher (at least 1 qualifying workout) | +25 XP |

### Implementation:
- Finalization cron calculates leaderboard rankings from `competition_entries` / `workout_submissions`
- Awards XP by calling a Supabase RPC or updating a `competition_xp_awards` table
- `WorkoutLevelService` picks up the bonus XP on next level stats calculation
- Notification sent: "You placed 2nd in RUNSTR Club 5K Race! +250 XP"

### Everyone who participates gets something (25 XP). Encourages joining even if you won't win.

## Schema Changes

### Migration: `162_simplified_events.sql` (next after 161)

```sql
-- Add recurring and finalization columns
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS recurring_interval TEXT DEFAULT 'none';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES competitions(id);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;

-- XP awards table
CREATE TABLE IF NOT EXISTS competition_xp_awards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  npub TEXT NOT NULL,
  placement INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competition_id, npub)
);

CREATE INDEX IF NOT EXISTS idx_competition_xp_awards_npub ON competition_xp_awards(npub);
CREATE INDEX IF NOT EXISTS idx_competition_xp_awards_competition ON competition_xp_awards(competition_id);

ALTER TABLE competition_xp_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read xp awards" ON competition_xp_awards FOR SELECT USING (true);
-- INSERT only via service role (cron Edge Function). No client-side INSERT policy needed.

-- Backfill: mark all existing ended competitions as finalized
-- so the cron doesn't try to finalize months-old competitions on first run
UPDATE competitions SET is_finalized = true WHERE end_date < NOW();
```

## Modified Files

### Event creation modal
- `src/components/subscription/SimpleEventCreationModal.tsx` — simplify to template + duration + recurring only. Remove pledge, image, Lightning address, winner selection inputs. Auto-generate event name. Use club banner as image.

### Events tab
- `src/components/compete/EventsContent.tsx` or `src/services/backend/SupabaseCompetitionService.ts` — remove `club_id IS NULL` filter. Add club name badge rendering to event cards.

### Edge Function
- Create: `supabase/functions/finalize-and-recur-events/index.ts` — daily cron for finalization + recurring
- Modify: `supabase/functions/manage-competition/index.ts`:
  - Add `recurring_interval` to the `insertData` object construction and parameter destructuring
  - Add `recurring_interval` to the `handleUpdate` allowed fields whitelist (so captains can stop recurring)
  - Default `ticket_pledge_days` to 0
  - Auto-use club `banner_url` as `image_url`

### XP integration
- The caller (screen/component) fetches competition XP from Supabase and passes it to `WorkoutLevelService` as an additional parameter. This preserves the local-first, no-network-dependency pattern of the level service. Do NOT add Supabase queries inside `WorkoutLevelService` itself.
- Example: `getLevelStats(pubkey, workouts, competitionXP)` where `competitionXP` is pre-fetched from `competition_xp_awards`.

### Cron schedule
- `supabase/migrations/163_event_cron.sql` — schedule `finalize-and-recur-events` daily

## What Doesn't Change

- Existing templates (5K, 10K, Half, Steps)
- Competition participants table
- Auto-join on workout submission
- Daily leaderboards
- Club infrastructure (chat, memberships)
- How workouts enter competitions

## Edge Cases

### Club with no banner
Use a default placeholder image (app icon or generic fitness image).

### Captain leaves club
Recurring events tied to the club continue — they're club events, not captain events. New captain inherits management.

### Competition with 0 participants at end
Finalize with no XP awards. Mark `is_finalized = true`.

### Competition with 1 participant
They get 1st place + 500 XP. They earned it by showing up.

### Recurring event with deleted club
Cron skips — checks `club.is_active` before creating next instance.

## Implementation Notes

- Simplified creation modal should be under 300 lines (current is ~400 with pledge complexity)
- XP awards query: `SELECT SUM(xp_awarded) FROM competition_xp_awards WHERE npub = ?` added to level calculation
- Event card club badge: small text overlay at bottom-left of image, muted color
- All new files under 500 lines per CLAUDE.md
