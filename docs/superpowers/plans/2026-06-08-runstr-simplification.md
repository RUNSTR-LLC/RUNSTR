# RUNSTR Simplification Pass — Implementation Plan (Hide, not delete)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present RUNSTR as three surfaces (Leaderboard · Social feed · Dashboard) by **hiding** teams/clubs/chat, custom events, and season competitions behind a feature-flag file — plus collapsing posting to one card and adding a Me ↔ ALS reward toggle — without deleting code, touching the reward path, or breaking the daily leaderboard.

**Architecture:** A **visibility refactor**, not a deletion. One new file, `src/config/features.ts`, holds boolean flags (`teams`, `customEvents`, `seasons` = `false`). Every hidden surface's nav entry point / render is gated on a flag. Hidden code stays compiled and reachable-by-flag-flip. The tab swap (History→Leaderboard), single-card change, and reward toggle are real end-state changes. **`workoutPublishingService.ts` and `charities.ts` are NOT modified** — rewards keep working as-is. Each task is one revertible commit, gated on `npm run typecheck` (must stay at 0 errors) + named verify scripts.

**Tech Stack:** React Native + TypeScript (Expo), Zustand, AsyncStorage, NDK (Nostr), Supabase. Verify scripts run with `npx tsx`.

**Critical invariants (never break these):**
- Rewards keep flowing: do not touch `workoutPublishingService.ts`, `RewardDestinationService.ts` routing logic, `charities.ts`, `NWCGatewayService`, or `SupabaseRewardService`. The toggle only *sets* `@runstr:selected_team_id`; it does not change routing logic.
- Daily leaderboard pipeline untouched: `LeaderboardsScreen`, `StepCompetitionService`, `PendingSubmissionService`, `Season1Service`.
- `ActivityTrackerScreen` is flagged dead in memory but mapped as the live workout-finish screen — do not touch it in this pass.
- Hidden ≠ deleted: no `git rm` of feature files. Revival must be a flag flip.

**Trade-off acknowledged:** Hiding stops UI bugs (users can't reach hidden screens) but background behavior of hidden features (e.g. auto-share-to-club-chat) keeps running. That's intentional for this pass; deletion is a possible later follow-up.

---

## File Structure Overview

**Created:**
- `src/config/features.ts` — central visibility flags
- `scripts/verify/verify-feature-flags.ts`
- `scripts/verify/verify-three-tab-navigation.ts`
- `scripts/verify/verify-single-post-path.ts`
- `scripts/verify/verify-charity-toggle.ts`

**Modified:**
- `src/navigation/BottomTabNavigator.tsx` — History tab → Leaderboard tab; Home title → "Dashboard"
- `src/screens/SocialScreen.tsx` — gate `ClubsRow`, `EventsList`, season banners behind flags
- `src/screens/ProfileScreen.tsx` — gate club affiliations / team cards behind `FEATURES.teams`
- Various screens with nav buttons to Clubs/Compete/Seasons — gate those buttons behind flags
- `src/services/nostr/workoutCardGenerator.ts` — `getAvailableTemplates()` returns one template
- `src/components/profile/shared/EnhancedSocialShareModal.tsx` — single-card preview, no picker
- `src/screens/SettingsScreen.tsx` — Me/ALS reward toggle + reward-history entry point
- `src/navigation/AppNavigator.tsx` — ensure `RewardHistory` reachable as a pushed screen

**NOT touched:** `workoutPublishingService.ts`, `charities.ts`, `RewardDestinationService.ts` routing, NWC services, daily-leaderboard services.

---

## Task 0: Baseline, branch, and the feature-flag file

**Files:**
- Create: `src/config/features.ts`

- [ ] **Step 1: Confirm clean starting state**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 2: Create working branch**

```bash
git checkout -b simplify-three-surfaces
```

- [ ] **Step 3: Create the feature-flag file**

Create `src/config/features.ts`:
```ts
/**
 * Feature visibility flags.
 *
 * Set a flag to `false` to HIDE a surface from the UI without deleting its code.
 * Hidden features remain compiled and reachable by flipping the flag back to `true`.
 * This is the simplification approach decided 2026-06-08: hide, don't delete.
 *
 * NOTE: hiding stops UI access only. Background behavior of a hidden feature
 * (e.g. auto-share-to-club-chat) may still run. That is intentional for this pass.
 */
export const FEATURES = {
  /** Fitness Clubs / Teams: club pages, team chat, captain tools, club affiliations. */
  teams: false,
  /** Captain/user-created events and the Compete hub. */
  customEvents: false,
  /** Season 2 / Season 3 / Einundzwanzig competitions and banners. */
  seasons: false,
} as const;

export type FeatureFlag = keyof typeof FEATURES;
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 5: Commit**

```bash
git add src/config/features.ts
git commit -m "Feature: add central feature-flag file for hide-not-delete simplification"
```

---

## Task 1: Tab swap — Leaderboard / Social / Dashboard

**Files:**
- Modify: `src/navigation/BottomTabNavigator.tsx`

- [ ] **Step 1: Replace the History tab with a Leaderboard tab**

In `BottomTabNavigator.tsx`:
- Add a lazy import for `LeaderboardsScreen` next to the existing lazy imports (confirm export name first: `grep "export" src/screens/LeaderboardsScreen.tsx`):
```tsx
const LeaderboardsScreen = React.lazy(() =>
  import('../screens/LeaderboardsScreen').then((m) => ({
    default: m.LeaderboardsScreen,
  }))
);
```
- In `BottomTabParamList`, replace `History: undefined;` with `Leaderboard: undefined;`.
- In the `tabBarIcon` switch, replace the `route.name === 'History'` branch with `route.name === 'Leaderboard'` using an Ionicon such as `podium`/`trophy`.
- Replace the `<Tab.Screen name="History">` block with:
```tsx
{/* Leaderboard Tab - Always-on daily competitions */}
<Tab.Screen name="Leaderboard" options={{ title: t('profile:tabLeaderboard') ?? 'Leaderboard', lazy: true }}>
  {() => (
    <Suspense fallback={<LoadingFallback />}>
      <LeaderboardsScreen />
    </Suspense>
  )}
</Tab.Screen>
```
- Remove the now-unused `RewardHistoryScreen` lazy import (its entry point moves to Settings in Task 5).

- [ ] **Step 2: Rename the Home tab title to "Dashboard"**

Change the Home tab `title` to `t('profile:tabDashboard') ?? 'Dashboard'`. Keep the route name `Home` (avoids breaking deep links/handlers).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add src/navigation/BottomTabNavigator.tsx
git commit -m "Refactor: tabs become Leaderboard/Social/Dashboard"
```

---

## Task 2: Social tab → pure feed (gate clubs + events)

**Files:**
- Modify: `src/screens/SocialScreen.tsx`

- [ ] **Step 1: Gate the non-feed sections behind flags**

In `SocialScreen.tsx`, import the flags and wrap the relevant render blocks:
```tsx
import { FEATURES } from '../config/features';
```
- Wrap `<ClubsRow ... />` in `{FEATURES.teams && ( ... )}`.
- Wrap `<EventsList ... />` in `{FEATURES.customEvents && ( ... )}`.
- Wrap any Season banner/section (e.g. `Season2Banner`) in `{FEATURES.seasons && ( ... )}`.
- Leave the Nostr feed (`SocialFeedService` + `SocialFeedPost`) untouched. Keep imports (they're still referenced inside the gated blocks, so no unused-import errors).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 3: Commit**

```bash
git add src/screens/SocialScreen.tsx
git commit -m "Refactor: Social tab is a pure feed (clubs/events/seasons gated off)"
```

---

## Task 3: Hide remaining team/event/season entry points

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: any screen with a nav button to Clubs/Compete/Seasons (discover in Step 1)

- [ ] **Step 1: Find every remaining entry point**

Run:
```bash
grep -rn "navigate('Compete'\|navigate(\"Compete\|navigate('ClubPage'\|navigate('ClubsScreen'\|navigate('Season2'\|navigate('Season3'\|CompactTeamCard\|ClubAffiliationsSection" src --include="*.tsx" --include="*.ts"
```
This lists the buttons/sections that still lead to hidden surfaces.

- [ ] **Step 2: Gate ProfileScreen team/club sections**

In `ProfileScreen.tsx`:
- Import `FEATURES`.
- Wrap `<ClubAffiliationsSection ... />` and `<CompactTeamCard ... />` (and any "View Team"/"Discover Clubs" button) in `{FEATURES.teams && ( ... )}`.
- Leave `onNavigateToTeam` props in place (they're harmless when the button isn't rendered).

- [ ] **Step 3: Gate any other discovered entry points**

For each result from Step 1 that renders a button/card into a hidden surface, wrap it in the matching flag (`FEATURES.teams`, `FEATURES.customEvents`, or `FEATURES.seasons`). Do not remove the underlying screens/routes.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Refactor: gate remaining team/event/season entry points behind feature flags"
```

---

## Task 4: One posting style (single card, no picker)

**Files:**
- Modify: `src/services/nostr/workoutCardGenerator.ts`
- Modify: `src/components/profile/shared/EnhancedSocialShareModal.tsx`

- [ ] **Step 1: Lock `getAvailableTemplates()` to one template**

In `workoutCardGenerator.ts`, change `getAvailableTemplates()` to return exactly one entry (recommend the lead card; confirm which id renders best — `elegant` is the current lead option):
```ts
getAvailableTemplates(): Array<{ id: string; name: string; description: string }> {
  return [
    { id: 'elegant', name: 'RUNSTR Card', description: 'The standard workout share card' },
  ];
}
```
Leave all other template render branches in the file intact (dormant) so they can return later.

- [ ] **Step 2: Render a single fixed card in the share modal**

In `EnhancedSocialShareModal.tsx`: since `getAvailableTemplates()` returns one item, ensure no selectable picker UI renders — show a single fixed card preview and default the chosen template to `'elegant'`. Confirm `SocialShareModal.tsx` still routes only to the Nostr share path (Twitter/Instagram already greyed).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Feature: collapse posting to a single share card (other templates hidden)"
```

---

## Task 5: Me ↔ ALS reward toggle + reward history entry point

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/navigation/AppNavigator.tsx` (ensure `RewardHistory` is a reachable pushed screen)

**Note:** This task does NOT modify `charities.ts` or `RewardDestinationService` routing. It only adds a UI control that writes `@runstr:selected_team_id` (`'self'` for Me, `'als-foundation'` for ALS) and a button to reach reward history. The existing routing already: pays the user when a lightning address + `self` are set, otherwise pays ALS (default).

- [ ] **Step 1: Add the Me/ALS toggle to Settings**

In `SettingsScreen.tsx`, add a two-option control labeled **Me** / **ALS Network**:
- On select, persist via `RewardDestinationService.setSelectedCharity('self')` or `('als-foundation')` (use the existing setter; if the method name differs, match it — check `RewardDestinationService` exports).
- Under "Me", show the user's lightning address (or a prompt to add one in profile).
- Under "ALS Network", show the donate website link (`https://secure.alsnetwork.org/...`).
- Read the current value on mount to show the active selection.

- [ ] **Step 2: Add a reward-history entry point**

In `SettingsScreen.tsx`, add a row that navigates to `RewardHistory`. In `AppNavigator.tsx`, register `<Stack.Screen name="RewardHistory">` rendering `RewardHistoryScreen` if not already present, and wire the navigation.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 4: Verify reward routing + history unaffected**

```bash
npx tsx scripts/verify/verify-reward-destination-routing.ts 2>&1 | tail -5
npx tsx scripts/verify/verify-reward-history.ts 2>&1 | tail -5
```
Expected: both pass (routing logic unchanged).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Feature: Me/ALS reward toggle + reward history reachable from Settings"
```

---

## Task 6: Guard scripts (test what we never tested)

**Files:**
- Create: `scripts/verify/verify-feature-flags.ts`
- Create: `scripts/verify/verify-three-tab-navigation.ts`
- Create: `scripts/verify/verify-single-post-path.ts`
- Create: `scripts/verify/verify-charity-toggle.ts`

- [ ] **Step 1: `verify-feature-flags.ts` — the hide is active**

```ts
// Verifies the hidden surfaces are flagged off (the simplification is in effect).
import { FEATURES } from '../../src/config/features';

const expectedOff: Array<keyof typeof FEATURES> = ['teams', 'customEvents', 'seasons'];
const stillOn = expectedOff.filter((k) => FEATURES[k] !== false);

if (stillOn.length) { console.error('❌ These should be hidden (false):', stillOn); process.exit(1); }
console.log('✅ teams/customEvents/seasons are all hidden');
```

Run: `npx tsx scripts/verify/verify-feature-flags.ts`
Expected: `✅ teams/customEvents/seasons are all hidden`

- [ ] **Step 2: `verify-three-tab-navigation.ts` — exactly 3 tabs**

```ts
// Verifies the bottom tab navigator exposes exactly Home(Dashboard)/Social/Leaderboard.
// Routes for hidden features may remain registered (hide-not-delete), so we only assert tabs.
import { readFileSync } from 'fs';
import { join } from 'path';

const nav = readFileSync(join(__dirname, '../../src/navigation/BottomTabNavigator.tsx'), 'utf8');
const tabNames = [...nav.matchAll(/<Tab\.Screen\s+name=["'](\w+)["']/g)].map((m) => m[1]);
const expected = ['Home', 'Social', 'Leaderboard'];
const ok = expected.every((n) => tabNames.includes(n)) && tabNames.length === expected.length;

console.log('Tabs found:', tabNames);
if (!ok) { console.error('❌ Expected exactly Home/Social/Leaderboard'); process.exit(1); }
console.log('✅ Exactly 3 tabs: Dashboard/Social/Leaderboard');
```

Run: `npx tsx scripts/verify/verify-three-tab-navigation.ts`
Expected: `✅ Exactly 3 tabs: Dashboard/Social/Leaderboard`

- [ ] **Step 3: `verify-single-post-path.ts` — one card template**

```ts
// Verifies posting is collapsed to a single card template (no multi-template picker).
import { readFileSync } from 'fs';
import { join } from 'path';

const gen = readFileSync(join(__dirname, '../../src/services/nostr/workoutCardGenerator.ts'), 'utf8');
const m = gen.match(/getAvailableTemplates\([\s\S]*?return\s*\[([\s\S]*?)\];/);
if (!m) { console.error('❌ getAvailableTemplates() not found'); process.exit(1); }
const idCount = (m[1].match(/\bid:/g) || []).length;

console.log('Templates exposed:', idCount);
if (idCount !== 1) { console.error(`❌ Expected exactly 1 template, found ${idCount}`); process.exit(1); }
console.log('✅ Single posting card template');
```

Run: `npx tsx scripts/verify/verify-single-post-path.ts`
Expected: `✅ Single posting card template`

- [ ] **Step 4: `verify-charity-toggle.ts` — Me + ALS available, ALS default**

```ts
// Verifies the reward toggle can resolve to Me (self) and ALS, and ALS is the default.
// charities.ts is intentionally NOT trimmed in the hide approach, so we assert presence, not count.
import { readFileSync } from 'fs';
import { join } from 'path';

const charities = readFileSync(join(__dirname, '../../src/constants/charities.ts'), 'utf8');
const dest = readFileSync(join(__dirname, '../../src/services/rewards/RewardDestinationService.ts'), 'utf8');

const hasSelf = /SELF_TEAM_ID\s*=\s*['"]self['"]/.test(charities) || /id:\s*['"]self['"]/.test(charities);
const hasALS = /id:\s*['"]als-foundation['"]/.test(charities) && /RunningBTC@primal\.net/.test(charities);
const alsDefault = /DEFAULT_CHARITY_ID\s*=\s*['"]als-foundation['"]/.test(dest);

if (!hasSelf) { console.error('❌ Self/Me destination missing'); process.exit(1); }
if (!hasALS) { console.error('❌ ALS destination or address missing'); process.exit(1); }
if (!alsDefault) { console.error('❌ ALS is not the default destination'); process.exit(1); }
console.log('✅ Me + ALS available; ALS is default');
```

Run: `npx tsx scripts/verify/verify-charity-toggle.ts`
Expected: `✅ Me + ALS available; ALS is default`

- [ ] **Step 5: Commit**

```bash
git add scripts/verify/verify-feature-flags.ts scripts/verify/verify-three-tab-navigation.ts scripts/verify/verify-single-post-path.ts scripts/verify/verify-charity-toggle.ts
git commit -m "Test: add guard scripts for feature flags, 3-tab nav, single post path, charity toggle"
```

---

## Task 7: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Typecheck clean**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 2: Run all verify scripts**

```bash
PASS=0; FAIL=0
for s in scripts/verify/verify-*.ts; do
  if npx tsx "$s" >/dev/null 2>&1; then PASS=$((PASS+1)); else echo "FAIL: $s"; FAIL=$((FAIL+1)); fi
done
echo "PASS=$PASS FAIL=$FAIL"
```
Expected: the 4 new scripts pass; reward + leaderboard scripts pass (unchanged). Record a before/after scorecard. Any failing legacy script that fails because a feature is now *hidden* (not broken) should be noted, not "fixed" by un-hiding.

- [ ] **Step 3: Boot smoke test (manual)**

Launch via the runstr-simulator skill (full erase+reinstall per project memory — stale QUIC cache otherwise). Confirm: exactly 3 tabs; Social shows only the feed; Leaderboard loads; sharing a workout shows one card; Settings shows the Me/ALS toggle and a reward-history link.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "Test: full verify sweep after simplification"
```

---

## Task 8: Website handoff (5-paragraph brief)

**Files:**
- Create: `docs/website-handoff-2026-06.md`

- [ ] **Step 1: Write the brief**

Five paragraphs: (1) what RUNSTR is now — cardio rewards, three surfaces; (2) workout → reward flow + Me/ALS toggle; (3) social feed + single-share experience; (4) the always-on daily leaderboard; (5) the No Burnout consolidation framing and RUNSTR's place under it. Follow CLAUDE.md terminology (rewards, lightning address — never "sats/Bitcoin/Nostr" in user-facing copy). Draft now; revise with the user at session end to match the polished app.

- [ ] **Step 2: Commit**

```bash
git add docs/website-handoff-2026-06.md
git commit -m "Docs: website handoff brief for simplified RUNSTR"
```

---

## Self-Review Notes

- **Spec coverage:** hide teams/events/seasons → Tasks 2,3 + flags (Task 0); tab swap → Task 1; single card → Task 4; Me/ALS toggle → Task 5; reward history reachable → Task 5; testing → Tasks 6,7; handoff → Task 8.
- **Invariants honored:** `workoutPublishingService.ts` and `charities.ts` appear nowhere in the modify list; routing logic untouched; daily-leaderboard services untouched; `ActivityTrackerScreen` untouched.
- **Type consistency:** `FEATURES.{teams,customEvents,seasons}`, `@runstr:selected_team_id`, ids `'self'`/`'als-foundation'`, `RunningBTC@primal.net`, and single-`elegant` `getAvailableTemplates()` are used consistently across Tasks 0,2,3,4,5,6.
- **Reversibility:** every hidden surface is one flag flip from returning; no `git rm`.
