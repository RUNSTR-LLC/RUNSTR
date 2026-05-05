# Rewards-First Navigation — Design

**Date:** 2026-05-05
**Status:** Brainstorm-approved, ready for plan
**Scope:** Two user-visible changes orienting the app around rewards. Continuation of the cardio-only simplification.

## Goal

Make rewards the primary signal in two places where users currently see something else:

1. **Home tab** — replace the kind 0 profile description with a team line showing the user's current club + an unread chat-message badge.
2. **History tab** — replace the multi-source workout list with a per-payment ledger ("reward transaction history") showing every successful payout the user has earned, ordered most-recent-first.

The existing `WorkoutHistoryScreen` is preserved (not deleted) and made reachable from Settings, so users who want their full workout list still have a path. Apple Health and Health Connect sync controls also move to Settings.

## In scope

Two user-visible changes, organized into two sequenced phases.

## Out of scope

- **No new in-app wallet.** Rewards still route to the user's external Lightning address via the existing `RewardLightningAddressService`. CoinOS auto-provision is explicitly *not* part of this spec.
- **No new workout-detail screen.** The reward-history row's expand-on-tap behavior surfaces workout details inline (distance, duration, pace, calories) without navigating away. A dedicated detail screen is deferred.
- **`MonthlyStatsPanel` on the Profile screen** — untouched. It remains a workout-count surface, separate from the new rewards-first surfaces.
- **Levels system** — untouched.
- **Pending or failed reward payments** — not surfaced in the new screen; only `status = 'success'` rows render.
- **Filters / search / date pickers on the new screen** — deferred.

## The two changes

### 1. Home tab: team line + chat alert badge

The kind 0 `about` text under the user's display name on the Home (Profile) screen is replaced with a one-line team display **when the user has joined a club**.

**Layout (when joined):**
```
[user avatar]   [edit icon]
Anonymous Athlete
[team avatar] Team: RUNSTR              [bell icon]  [unread badge]
EARNINGS    LEVEL
0           0
```

- Team avatar (small, ~24px) + label `Team: <club name>`, in the existing `theme.colors.text` orange.
- Right-aligned bell icon. When `unreadCount > 0`, a small numeric badge appears on the bell.
- Tapping anywhere on the team line navigates to `ClubChat` (existing route, existing screen).

**Layout (when not joined):**
- The kind 0 `about` text renders as it does today. No team line, no bell. Existing behavior preserved.

**Unread-count source:**
- New methods on `ClubChatService`:
  - `getUnreadCount(clubId: string): Promise<number>` — counts kind 9 messages in the user's current club newer than the locally-stored `lastSeenChatAt` for that club, capped at 99.
  - `markChatAsSeen(clubId: string): Promise<void>` — writes the current timestamp to `@runstr:club_chat_last_seen:<clubId>`.
- `ClubChatScreen` calls `markChatAsSeen` on `useFocusEffect` so opening the chat clears the badge.
- The team line subscribes to chat-message updates (or refreshes on `ProfileScreen` focus) and re-queries the count.

**Files touched:**
- New: `src/components/profile/TeamLine.tsx`
- Modified: `src/services/club/ClubChatService.ts` — add `getUnreadCount`, `markChatAsSeen`
- Modified: `src/screens/ProfileScreen.tsx` — render `<TeamLine />` in place of (or before) the about-text line, with a fallback to about text when no club joined
- Modified: `src/screens/ClubChatScreen.tsx` — call `markChatAsSeen` on focus

### 2. History tab → Reward Transaction Screen

The History bottom-tab destination changes from `WorkoutHistoryScreen` to a new `RewardHistoryScreen`.

**Layout:**
```
┌─────────────────────────────────────┐
│  1,247                              │
│  sats this month                    │
│  ─────────────────────────────────  │
│  TODAY                              │
│   [run icon]  Run · 5K     +147 sats│
│   [walk icon] Walk · 18m    +85 sats│
│                                     │
│  YESTERDAY                          │
│   [run icon]  Run · 3K      +95 sats│
│                                     │
│  TUE MAR 4                          │
│   [cycle icon] Cycle · 12km +210 sats│
└─────────────────────────────────────┘
```

- **Header:** big number (theme.size.xl or `2xl`), bold, in `theme.colors.text`. Subtitle "sats this month" beneath it in `theme.colors.textMuted`.
- **Date grouping:** rows grouped under date headers. `TODAY`, `YESTERDAY`, then `EEE MMM D` for older entries (uppercase, letterspaced, `theme.colors.textMuted`).
- **Each row:** leading activity icon (matching RUNSTR's existing activity iconography — `fitness-outline` for run, `walk-outline` for walk, `bicycle-outline` for cycle, `compass-outline` for hike), primary label `<Activity Type> · <short metric>`, trailing `+N sats` in `theme.colors.text`.
  - Short metric is distance for distance-based activities (Run/Walk/Cycle/Hike), duration for others.
- **Tap behavior:** row expands inline to show full workout metadata (distance, duration, pace, calories, elevation gain — whatever the workout has). Tap again to collapse. Animated height change.
  - For workouts whose metadata isn't in `LocalWorkoutStorageService` (e.g., Apple Health imports that earned but were never tracked locally), the expanded row shows "Workout details unavailable" gracefully.
- **Pull-to-refresh:** re-queries `SupabaseRewardService.getUserPayments(npub)`.

**Data flow:**
- Source query: `SupabaseRewardService.getUserPayments(npub)` (exists at `:78`) returns all `reward_payments` rows for the user. Filter to `status === 'success'` client-side.
- Sort: `paid_at DESC`.
- Monthly total: filter `paid_at >= startOfMonth(now)` and sum `amount_sats` client-side. The dataset is small (typically <100 rows per user even after a year).
- Workout detail on expand: `payment.workout_id` joins to `LocalWorkoutStorageService.getWorkoutById(workout_id)` (verify method exists during implementation; if not, add it).

**Empty state:**
- First-time user with zero successful payments sees: header reads "0 / sats this month", and the body reads "Complete a cardio workout to earn your first reward." (Static, in `theme.colors.textMuted`.)

**Files touched:**
- New: `src/screens/RewardHistoryScreen.tsx`
- Modified: `src/navigation/BottomTabNavigator.tsx` — History tab routes to `RewardHistoryScreen` instead of `WorkoutHistoryScreen`. The lazy import switches.
- Modified: `src/screens/SettingsScreen.tsx` — add three rows: "All Workouts" (→ `WorkoutHistoryScreen`), "Apple Health Sync" (→ opens the Apple Health tab/section of `WorkoutHistoryScreen`), "Health Connect Sync" (→ Android equivalent).
- Untouched: `WorkoutHistoryScreen.tsx` itself stays. Its internal Apple Health and Health Connect sub-tabs continue to work as a deeper view; only the *entry points* from Settings shift.

## Phasing

Two phases. Independently shippable.

### Phase A — Home team line + chat alert badge
**Touches:** `TeamLine.tsx` (new), `ClubChatService.ts`, `ProfileScreen.tsx`, `ClubChatScreen.tsx`.
**Risk:** Low. Single new component + one storage key + two existing service methods. Conditional rendering means existing unjoined users see no behavioral change.

### Phase B — Reward Transaction screen + Settings rewire
**Touches:** `RewardHistoryScreen.tsx` (new), `BottomTabNavigator.tsx`, `SettingsScreen.tsx`. `WorkoutHistoryScreen.tsx` stays alive but loses its bottom-tab entry point.
**Risk:** Medium. New screen with several states (loading, empty, populated, expanded rows). Reversible: if the screen doesn't land well, swap one line in `BottomTabNavigator` to point History back at `WorkoutHistoryScreen`.

## Architecture notes

**Storage:** One new AsyncStorage key family — `@runstr:club_chat_last_seen:<clubId>`. No schema changes. No new Supabase tables.

**Navigation:** No new top-level routes. The two changes use existing routes (`ClubChat`, `WorkoutHistoryScreen`'s Stack registration) and only swap which screen the History bottom tab renders. The Settings menu picks up three new rows but those navigate to existing screens.

**Performance:** `RewardHistoryScreen` queries the same `reward_payments` table the existing `RewardsScreen` already reads, so no new query patterns. Monthly total computation is O(rows in current month) — trivial.

**Reversibility:** Both phases are one-line swaps to revert. Phase A's `ProfileScreen` change can fall back to about text. Phase B's `BottomTabNavigator` line can flip back to `WorkoutHistoryScreen`.

## Verification per phase

Each phase ships with a short `scripts/verify/` script confirming:

- **Phase A:** `TeamLine` renders only when a club is joined; `markChatAsSeen` writes the timestamp on chat focus; `getUnreadCount` returns 0 immediately after.
- **Phase B:** History bottom tab renders `RewardHistoryScreen`; the screen renders the expected header + grouped rows for a fixture user; tapping a row toggles expansion; Settings menu has the three new entries.

Plus `npm run typecheck` clean after each phase.

## Open implementation questions

These are details to settle during the implementation plan:

1. **Phase A unread-count refresh cadence** — is a `useFocusEffect` on `ProfileScreen` enough, or do we need a real-time subscription to chat updates? `useFocusEffect` is simpler and probably sufficient — users typically navigate Home → Chat → back to Home, which re-fires focus.
2. **Phase B "short metric" formatting** — for a 5.23 km run, render as "Run · 5K" (rounded), "Run · 5.2K" (one decimal), or "Run · 5.23K" (two)? Bank-app convention is rounded amounts, so likely "5K" / "10K" / "12km" with no fractional part for distances ≥ 1km. Confirm during plan.
3. **Phase B inline expand animation** — `LayoutAnimation.easeInEaseOut` is the React Native default and matches the rest of the app. Use that unless implementation reveals a reason not to.
