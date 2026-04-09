# Profile Dashboard Redesign v2

## Problem

The v1 profile redesign (LevelCard, ActivityBreakdown, RecentWorkouts as stacked cards) requires scrolling to see all content. The Start Workout button isn't prominent enough. "Set Destination" label is confusing — should say "Rewards".

## Design

### Owner Profile — Dashboard Grid

Layout (top to bottom):
1. **Header** — gear icon (or music controls)
2. **ProfileHero** — as-is (banner + avatar + name + bio)
3. **NotificationBadge** — if any pending
4. **Start Workout button** — outlined accent (transparent bg, 1px #FF7B1C border, accent text), full width, 48px height, borderRadius 12. No `>` symbol.
5. **2x2 Dashboard Grid** — four tappable summary cards:
   - **Top-left: Level** — level number (large), title, XP progress bar. Not navigable.
   - **Top-right: Rewards** — "Rewards" label + destination name. Taps → Rewards screen. Shows "Set Destination" if none configured.
   - **Bottom-left: Breakdown** — "Breakdown" label + compact counts (C:12 S:5 W:3) with tiny colored indicator dots or bars.
   - **Bottom-right: Workouts** — workout count + 1-2 most recent workout summaries. Taps → WorkoutHistory screen.

Grid cards: `cardBackground` bg, `border` borderColor, borderRadius 10, padding 10. Equal widths via `flex: 1`, gap 10.

### Other User Profile

1. **ProfileHero** — as-is (with back button)
2. **LevelCard** — full-width, same as current
3. **ActivityBreakdown** — full-width, same as current
4. **ClubAffiliationsSection** — if any clubs

No Start Workout, Rewards, Recent Workouts, or Competitions.

### Removed from both views

- `ActiveCompetitionsSection` — competitions live in Events tab
- `ProfileBadgesRow` — destination info moved into Rewards grid card; club badges stay only on other-user view via ClubAffiliationsSection
- `ProfileStatsGrid` (already removed in v1)
- `PersonalRecordsSection` (already removed in v1)

## New Component

**`ProfileDashboardGrid`** (`src/components/profile/ProfileDashboardGrid.tsx`)

Props:
- `levelData: ProfileLevelData | null`
- `activityBreakdown: ActivityBreakdownData | null`
- `recentWorkouts: RecentWorkout[]`
- `rewardDestination: string | null`
- `isLoading: boolean`
- `onRewardsPress: () => void`
- `onWorkoutsPress: () => void`

Renders the 2x2 grid with four internal card subcomponents.

## Changes to Existing Files

- **ProfileScreen.tsx** — Replace LevelCard + ActivityBreakdown + RecentWorkoutsSection + ActiveCompetitionsSection + ProfileBadgesRow with ProfileDashboardGrid (owner) or LevelCard + ActivityBreakdown + ClubAffiliationsSection (other user). Update Start Workout button to outlined accent style.
- **ProfileBadgesRow.tsx** — No longer used on owner profile. Still referenced? No — other-user view uses ClubAffiliationsSection directly. Can be deleted or left unused.
