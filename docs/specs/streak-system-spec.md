# RUNSTR Streak System Spec

## What Counts

Any deliberately tracked workout counts toward the streak. This includes running, cycling, hiking, strength exercises, meditation, breathwork, journaling, and habits. Walking as a tracked GPS workout counts. Passive step accumulation via HealthKit/Health Connect background sync does NOT count. The distinction: a streak represents a deliberate decision to be active, not an automatic byproduct of daily movement.

## Grace Period (2 days)

- Miss 1 day: streak pauses, not broken
- Miss 2 days: streak still paused, final grace day
- Miss 3 days: streak resets to zero
- Grace days do NOT inflate the streak count — only days with qualifying activity increment the number
- Example: User works out Mon-Fri (5-day streak), skips Sat-Sun (grace period), works out Monday — streak resumes at 6, not 8

## No Reward Bonus

Streaks are purely motivational. There is NO percentage bonus on workout rewards tied to streak length. The existing `getStreakBonus()` function and the streak bonus in the reward edge function should be removed. The reward for a streak is the streak itself.

## All-Time Tracking

Streaks track across the user's entire history, not just the current week. The query should not be limited to recent data — it needs the full workout history to compute longest streak accurately.

## Push Notifications

- **Grace period start** (missed 1 day): "Your [N]-day streak is pausing. Work out by tomorrow to keep it going."
- **Final grace day** (missed 2 days): "Last chance — your [N]-day streak resets tonight."
- **Milestone celebrations**: "You hit a [N]-day streak!" at round numbers (7, 14, 30, 60, 90, 100, 150, 200, 365)
- All streak notifications are opt-out, not opt-in

## UI (StreakSection component)

- Single streak number (current streak)
- Current week dots below (Mon-Sun): filled = qualifying activity that day, empty = no activity
- Current day gets a subtle highlight ring
- "Best: X days" label below the dots for all-time longest streak
- No flame icon, no color escalation — minimal monochrome design
- During grace period: streak number dims slightly (reduced opacity) to indicate the clock is ticking
- No streak bonus badge (remove existing "+X% streak bonus" text)

## Data Source

- Query: `workout_submissions` table filtered by npub
- Exclude: rows where the only activity is passive step counting (activity_type = 'steps' or 'daily_steps')
- Include: all other activity types (running, walking, cycling, hiking, pushups, pullups, situps, squats, curls, bench, meditation, breathwork, journal, habits, etc.)

## Streak Calculation Changes

Current `computeStreaks()` in ProfileDataService.ts breaks on `daysSinceLast > 1`. Updated logic:

1. Sort unique workout dates ascending
2. Walk backwards from most recent date
3. For each gap between consecutive dates:
   - Gap of 1 day (consecutive): streak continues
   - Gap of 2-3 days (within grace period): streak continues, but gap days don't count
   - Gap of 4+ days: streak breaks
4. Current streak is 0 if most recent workout was 3+ days ago (grace period expired)
5. Longest streak uses same gap tolerance logic across full history
