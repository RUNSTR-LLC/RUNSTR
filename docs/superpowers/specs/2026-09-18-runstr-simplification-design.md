# RUNSTR Simplification — Phase 1 Design

**Date:** 2026-09-18
**Status:** Approved design, pending implementation plan
**Scope:** Hiding pass (approach C) + 1301/local-history work

---

## 1. Goal

Reduce RUNSTR to a Nostr-native running tracker. One loop:

> log in → track a run → it becomes a kind 1301 note on relays.

Everything else is either an integration (Apple Health, Health Connect, MCP later)
or hidden.

Target tagline: **RUNSTR — Run with Nostr.**

### In scope (Phase 1)

- Hiding every surface that is not the tracker, history, or settings
- Running-only history display
- Promoting the existing Nostr 1301 backfill from a manual modal action to
  automatic on-login/on-refresh merging
- Relay set review

### Explicitly deferred

| Deferred | Why |
|---|---|
| NIP-46 bunker login | Net-new subsystem; no code exists in `src/` today |
| Login screen inversion (Amber/bunker headline, `Start` demoted to Advanced) | Ships with bunker |
| MCP tab | Parked — undecided product surface |
| Apple Watch app | Later phase |
| WOT reward selection | Moves **out** of the app into a Claude Code skill; not app work |
| Split voice announcement fix | A bug, not a simplification. Fix separately, any time. |

### Non-goals

- Deleting code. Nothing is deleted in Phase 1.
- Removing Supabase. It is in 38 files including `AuthContext.tsx`; it is hidden
  at the UI layer and left running underneath.
- Changing what the sync layer collects. Apple Health / Health Connect keep
  importing walks, cycles, hikes and steps. Only the *display* is filtered.

---

## 2. Decisions taken

| Question | Decision |
|---|---|
| Hiding mechanism | **Approach C** — prune routes at the navigator, flag interiors inside kept screens |
| History source of truth | **Local truth + relay backfill.** Local AsyncStorage stays authoritative; 1301s merge in |
| Non-running data | **Keep collecting, show only running.** No data loss, no sync rewiring |
| iOS login (later phase) | Build NIP-46 bunker; Amber remains the Android fast path |
| Anonymous `Start` (later phase) | Survives, demoted under Advanced |
| `SavedRoutes`, `NotificationBadge` | **Untouched.** Not in scope |
| Relay set | Add `wss://relay.nostr.band`; stop at four (§5.3) |
| Steps | **Display-only hiding.** Counter services keep running (§5.4) |

---

## 3. Reachability findings

These determine where the work lands. Recorded because the filenames mislead —
see the Reachability Check section of `CLAUDE.md`.

| Finding | Consequence |
|---|---|
| `src/navigation/AppNavigator.tsx` serves **only the login path** | Nav pruning happens in `src/App.tsx`, not here. Editing `AppNavigator.tsx` ships nothing. |
| The live registry is `AuthenticatedStack` in `src/App.tsx:391-641` | All route changes land in one file |
| `src/config/features.ts` already exists, with `customEvents: false`, `seasons: false` | The flag mechanism is established, not invented. Phase 1 extends it. |
| History already reads local AsyncStorage (`UnifiedWorkoutsTab`) | No rescue needed; Supabase is a write-side effect (`supabaseSubmitted` flag) |
| `Nostr1301ImportService.importUserHistory(pubkey)` already does the full backfill | Phase 1 promotes it; it does not build it |
| Its only caller is `ImportDataModal`, behind the history cloud button | The backfill is currently reachable only via the button being hidden |
| `markAsSynced` has exactly one caller: `WorkoutSummaryModal.tsx:309` | **Duplication risk** — see §5.2 |
| `AgentSkillSection.tsx` / `AgentSkillSetupModal.tsx` rendered nowhere | Pre-existing dead code. Flagged, not touched. |

---

## 4. Hiding surface

### 4.1 Tier 1 — route prune (`src/App.tsx`)

Unregister from `AuthenticatedStack`. Files stay on disk; reversal is a git revert.

| Routes | Reason |
|---|---|
| `Rewards`, `Compete`, `Leaderboards`, `DynamicEventDetail` | earnings + events |
| `Season2`, `Season3`, `EinundzwanzigDetail` | seasons (already flagged off) |
| `ClubChat`, `ClubPage`, `Comments` | clubs + social |
| `LevelDetail` | level |
| `JournalHistory`, `HealthProfile`, `AdvancedAnalytics`, `StatsDetail`, `Experimental` | non-running surfaces |

**Retained:** `MainTabs`, `Settings`, `HelpSupport`, `ContactSupport`,
`PrivacyPolicy`, `WorkoutHistory`, `ProfileEdit`, `SavedRoutes`.

Every `navigate(...)` call targeting an unregistered route must be removed or
guarded in the same change, or it becomes a runtime no-op/crash. Known sites
include `ProfileScreen`'s `onLevelPress` and `onEarningsPress`.

### 4.2 Tier 2 — bottom navigation collapse

In `BottomTabNavigator.tsx`: drop the `Social` and `Leaderboard` `Tab.Screen`s,
leaving one tab, and hide the bar via `tabBarStyle: { display: 'none' }`.

**Keep the tab navigator.** Replacing `MainTabs` with a bare `ProfileScreen`
breaks `navigation.getParent()` (used by `ProfileScreen` to reach stack routes)
and every by-name navigation to `MainTabs`. One hidden tab preserves the tree.

### 4.3 Tier 3 — interior flags (`src/config/features.ts`)

| Flag | Render site | Effect |
|---|---|---|
| `social` | `BottomTabNavigator` | drop Social tab |
| `leaderboard` | `BottomTabNavigator` | drop Leaderboard tab |
| `teams` *(flip `true`→`false`)* | `ProfileScreen` + others | hide club affiliations |
| `level` | `ProfileHero` ×2, `LevelCard` | hide level + ring |
| `earnings` | `ProfileHero` props | hide earnings |
| `activitySelector` | `ProfileScreen:452` | hide `ActivityCategoryBar`; pin `renderTracker()` to `RunningTrackerScreen` |
| `stepTracking` | `StatsCard`, history | hide steps from display (see §5.4) |
| `cloudBackupButton` | `WorkoutHistoryScreen:274` | hide cloud export/import |
| `walletSettings` | `SettingsScreen:140` | hide `WalletSection` |
| `privateMode` | `FitnessTrackingSection` | hide toggle (private is now implicit) |
| `shareSheet` | workout post flow | default to the 1301 workout note |
| `journalHabits` | `UnifiedWorkoutsTab` | hide journal/habit timeline entries |

`activitySelector` is load-bearing: `ProfileScreen.renderTracker()` switches on
`activityGridService.getActivityAt(gridPosition)`. Pinning it to running is what
makes "running only" true at the tracker while sync keeps collecting everything.

---

## 5. History and 1301

### 5.1 Running-only display

A single predicate, `isRunningWorkout(workout)`, in `src/utils/`, gated by a
`runningOnlyHistory` flag, applied at the **display layer only**:

- `UnifiedWorkoutsTab` merge output
- the `WorkoutTabNavigator` tabs (`AllWorkoutsTab`, `PublicWorkoutsTab`,
  `PrivateWorkoutsTab`, `AppleHealthTab`, `HealthConnectTab`)
- `StatsCard` aggregates

Storage, sync and publishing are untouched. One predicate, not per-site
conditions, so the definition of "a run" cannot drift between surfaces.

Note: commit `a41fb9a7` fixed Health Connect walks being mislabeled as runs.
The predicate must not undo that — it consumes the corrected type, it does not
re-derive it.

### 5.2 Backfill promotion

**Current:** manual, one-time, progress-bar import from `ImportDataModal`.
**Target:** automatic background merge on login, and on history pull-to-refresh.

Three hardening requirements, all blocking:

**1. Widen dedup (correctness — highest risk).**
`saveImportedNostrWorkout` dedups on `nostrEventId` alone. That ID is written
back only by `markAsSynced`, whose sole caller is `WorkoutSummaryModal.tsx:309`.
GPS runs finished through the summary modal are therefore covered; workouts
published outside it (Health-synced) are not. Automating the backfill as-is
duplicates those on every launch.

Add a second dedup key: `(type, startTime within ±60s, duration)`. A match on
either key is a duplicate.

**2. Remove the O(n²) scan (performance).**
`saveImportedNostrWorkout` calls `getAllWorkouts()` inside the per-workout loop.
Acceptable behind a one-time progress bar; not on every login. Hoist the existing
workout set once and dedup in memory.

**3. Never block the UI.**
Backfill runs in the background after `currentUser` resolves. Local history
renders immediately. Failures are logged, never surfaced as a blocking error.
Backfill only ever **adds** — it must never delete or overwrite a local workout.

**Cadence.** Keep the existing `NOSTR_IMPORT_FLAG`
(`nostr_workout_import_completed`) for run-once full-import semantics; use a
`since` timestamp for incremental merges on subsequent refreshes.

### 5.3 Relays

Current `GlobalNDKService.DEFAULT_RELAYS`:
`relay.damus.io`, `nos.lol`, `relay.primal.net`.

For backfill, archival **coverage** is the only property that matters, and none
of the three promise it — a 1301 published months ago may no longer be served.

**Decision:** add `wss://relay.nostr.band` (broad archival index) and stop
there. Four relays keeps connection cost low while adding the one property the
current set lacks.

### 5.4 Steps — display-only

"Stop tracking steps" is scoped to **display only**. `DailyStepCounterService`
and `NativeStepCounterService` keep running; the `stepTracking` flag hides steps
from `StatsCard` and the history screen.

This follows the collection rule in §2: the app keeps collecting what it
collects, history shows running only. Disabling the counter services themselves
is a separate change touching background tasks and battery behavior, and is not
in Phase 1.

---

## 6. Documentation consequence

`CLAUDE.md` and `docs/North Star.md` currently mandate the opposite of this app:
three pillars, rewards, cardio-not-running-only, and an in-app terminology
firewall forbidding the word "Nostr". The tagline "Run with Nostr" breaks that
firewall deliberately.

Both documents become actively misleading to any future session the moment
Phase 1 lands. **Rewriting them is part of Phase 1, not cleanup afterward.**

---

## 7. Verification

Per the Verification Protocol in `CLAUDE.md`:

1. `npm run typecheck` — the route prune will surface dangling `navigate()`
   targets and unused imports; both are signal, not noise.
2. `scripts/verify/verify-simplification-phase1.ts` — asserts each unregistered
   route is absent from `AuthenticatedStack`, and each flag is `false`.
3. `scripts/verify/verify-1301-backfill.ts` — the important one. Seeds local
   workouts with and without `nostrEventId`, runs the backfill against a fixture
   set of 1301s, asserts **zero duplicates** and zero local workouts lost.
4. Simulator check on a full erase + reinstall (per
   `feedback_always_erase_simulator`), confirming history renders runs only and
   backfill repopulates after reinstall.

Item 3 is the one that must pass before this ships. Everything else is
reversible; duplicated history is not.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Backfill duplicates Health-synced runs | Widened dedup (§5.2.1); verification script asserts zero duplicates |
| Route prune leaves dangling `navigate()` calls | `npm run typecheck` + guarded removal in the same change |
| Hidden surfaces keep running in the background | Known and accepted — matches the existing note in `features.ts` |
| Relay coverage gaps silently lose old history | §5.3 relay addition; local remains truth so nothing is lost locally |
| Docs contradict the app | §6 — rewrite in Phase 1 |
