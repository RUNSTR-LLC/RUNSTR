# Phase 1 — Strength Cut: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Strength category from the activity grid so the in-app tracker only surfaces cardio activities. New strength workouts can no longer be created in-app; historical strength workouts on Nostr still render correctly in feeds.

**Architecture:** Single-row grid (cardio only) instead of two-row (cardio + strength). Both screens that render the grid (`ProfileScreen`, `ActivityTrackerScreen`) drop their strength branches. `StrengthTrackerScreen.tsx` is deleted. Display/parse code that handles `strength_training` workouts in feeds (`workoutCardGenerator.ts`) is preserved — historical kind 1301 events on Nostr still need to render.

**Tech Stack:** React Native + TypeScript (Expo). Verification via `npm run typecheck` and a short `npx tsx` script in `scripts/verify/`. Commits directly to `main` per the rolling-branch workflow.

**Reference spec:** `docs/superpowers/specs/2026-05-04-cardio-only-simplification-design.md`

---

## File Map

| File | Change | Why |
|---|---|---|
| `src/services/activity/ActivityGridService.ts` | Modify | Remove Strength row from `ACTIVITY_GRID`, update display-name map, update header comments, narrow `key` type to `'cardio'` |
| `src/services/activity/DefaultActivityService.ts` | Modify | Remove `'strength'` from valid types, display map, icon map |
| `src/screens/activity/ActivityTrackerScreen.tsx` | Modify | Drop `StrengthTrackerScreen` import, drop `StrengthExercise` type, drop the `case 'strength':` block |
| `src/screens/ProfileScreen.tsx` | Modify | Drop `StrengthTrackerScreen` import and the strength rendering branch |
| `src/screens/activity/StrengthTrackerScreen.tsx` | Delete | No longer reachable |
| `src/services/nostr/workoutCardGenerator.ts` | Modify (comment only) | Comment at line 1454 references "saved by StrengthTrackerScreen" — update comment, keep rendering logic |
| `scripts/verify/verify-strength-removed.ts` | Create | Assert ACTIVITY_GRID has one row, no strength references in tracker screens |

**Intentionally untouched:**
- `src/screens/activity/ManualWorkoutScreen.tsx` — manual entry stays per spec, including its `'strength'` category options. Manual entry scope is a separate decision.
- `workoutCardGenerator.ts:1448-1462` `strength_training`/`gym` rendering logic — historical workouts already on Nostr need to render correctly.

---

## Task 1: Cut Strength from ActivityGridService

**Files:**
- Modify: `src/services/activity/ActivityGridService.ts`

- [ ] **Step 1.1: Read the current file**

```bash
cat src/services/activity/ActivityGridService.ts
```

Confirm the structure: header comment block, `CategoryRow` interface, `ACTIVITY_GRID` array (currently 2 entries: cardio + strength), `ACTIVITY_DISPLAY_NAMES` map (currently 9 entries: 4 cardio + 5 strength).

- [ ] **Step 1.2: Update the file**

Replace the contents of `src/services/activity/ActivityGridService.ts` lines 1-55 with:

```typescript
/**
 * ActivityGridService - Manages 2D grid navigation for activities
 *
 * Categories (rows): Cardio
 * Activities (columns): Run, Walk, Cycle, Hike
 *
 * Swipe Left/Right: Navigate within category
 * Swipe Up/Down: Disabled (single category — no vertical navigation)
 *
 * Note: Strength category removed 2026-05-04 — cardio-only simplification.
 * Note: Diet category removed earlier due to ScrollView conflicts.
 * Note: Wellness category removed earlier — unused by user base.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Category row definition
export interface CategoryRow {
  name: string;
  key: 'cardio';
  activities: string[];
}

// Grid position
export interface GridPosition {
  row: number;
  column: number;
}

// Activity grid configuration (cardio-only)
export const ACTIVITY_GRID: CategoryRow[] = [
  {
    name: 'Cardio',
    key: 'cardio',
    activities: ['run', 'walk', 'cycle', 'hiking'],
  },
];

// Display names for activities
export const ACTIVITY_DISPLAY_NAMES: Record<string, string> = {
  run: 'Run',
  walk: 'Walk',
  cycle: 'Cycle',
  hiking: 'Hike',
};
```

- [ ] **Step 1.3: Update the navigation comments later in the file**

Find the comment on what was line 173 (`return null; // Already at bottom category (Strength)`). Update it:

```typescript
return null; // Single category — no vertical navigation
```

Use `grep -n "Already at bottom category" src/services/activity/ActivityGridService.ts` to find the exact current line number, then `Edit` to replace.

- [ ] **Step 1.4: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS. The narrowed `key: 'cardio'` type may surface consumers that compare against `'strength'` — those should be Tasks 2-5. If typecheck fails with errors that don't match Tasks 2-5's targets, stop and investigate.

- [ ] **Step 1.5: Commit**

```bash
git add src/services/activity/ActivityGridService.ts
git commit -m "$(cat <<'EOF'
Refactor: Drop Strength category from activity grid

Phase 1 of cardio-only simplification (see
docs/superpowers/specs/2026-05-04-cardio-only-simplification-design.md).

ACTIVITY_GRID is now single-row (cardio). CategoryRow.key narrows from
'cardio' | 'strength' to 'cardio'. Strength activity display names removed.

Consumers updated in subsequent commits.
EOF
)"
```

---

## Task 2: Cut Strength from DefaultActivityService

**Files:**
- Modify: `src/services/activity/DefaultActivityService.ts`

- [ ] **Step 2.1: Read the file to confirm structure**

```bash
sed -n '1,130p' src/services/activity/DefaultActivityService.ts
```

Look for: the activity-type union (line ~16), the display name map (line ~95), the icon map (line ~110), the `isValidDefaultActivity` predicate (line ~120).

- [ ] **Step 2.2: Remove `'strength'` from the activity type union**

```bash
grep -n "strength" src/services/activity/DefaultActivityService.ts
```

For each line containing `'strength'`:
- Type union line (e.g. `| 'strength'`): remove that line
- Display name entry (`strength: 'Strength',`): remove that line
- Icon mapping entry (`strength: 'barbell',`): remove that line
- `isValidDefaultActivity` array: remove `'strength'` from the array

Use `Edit` for each, never `Bash sed`. After each edit, verify with `grep -n "strength" src/services/activity/DefaultActivityService.ts`. Final grep should return nothing (or only case-insensitive false positives — rerun with `grep -ni "strength"` to be sure).

- [ ] **Step 2.3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS, with the same caveat as Task 1.5 — failures here should be in `ActivityTrackerScreen.tsx` or `ProfileScreen.tsx` (Tasks 3-4), not new surfaces. If new surfaces appear, stop and investigate.

- [ ] **Step 2.4: Commit**

```bash
git add src/services/activity/DefaultActivityService.ts
git commit -m "$(cat <<'EOF'
Refactor: Drop Strength from DefaultActivityService

Removes 'strength' from the activity type union, display name map,
icon map, and validity check. Tracker screens updated in next commits.
EOF
)"
```

---

## Task 3: Remove StrengthTrackerScreen rendering from ActivityTrackerScreen

**Files:**
- Modify: `src/screens/activity/ActivityTrackerScreen.tsx`

- [ ] **Step 3.1: Locate the strength references**

```bash
grep -n "Strength\|strength" src/screens/activity/ActivityTrackerScreen.tsx
```

Expected hits:
- Line ~6: header comment "Cardio → Strength → Wellness" (outdated)
- Line ~31: `import { StrengthTrackerScreen } from './StrengthTrackerScreen';`
- Lines ~43-44: `// Strength exercise type mapping` + `type StrengthExercise = ...`
- Lines ~347-352: the `case 'strength': { ... }` block in the render switch

- [ ] **Step 3.2: Update the header comment**

Use `Edit` to change the navigation comment block (around line 6) so it matches the simplified single-category grid:

```typescript
/**
 * ActivityTrackerScreen - Main activity tracking interface
 *
 * Navigation:
 * - Swipe Left/Right: Navigate between cardio activities (Run / Walk / Cycle / Hike)
 *
 * Single-category grid post cardio-only simplification (2026-05-04).
 */
```

(Match the existing style — preserve the surrounding lines exactly. Use the `Read` tool first if needed to copy-paste the surrounding context.)

- [ ] **Step 3.3: Remove the StrengthTrackerScreen import**

Use `Edit` to delete the line:
```typescript
import { StrengthTrackerScreen } from './StrengthTrackerScreen';
```

- [ ] **Step 3.4: Remove the StrengthExercise type alias**

Use `Edit` to delete:
```typescript
// Strength exercise type mapping
type StrengthExercise = 'pushups' | 'pullups' | 'situps' | 'curls' | 'bench';
```

(Both the comment line and the type line.)

- [ ] **Step 3.5: Remove the `case 'strength':` rendering branch**

The switch around lines 320-360 currently has:

```typescript
      case 'cardio':
        switch (activity) {
          case 'run':
            return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          case 'walk':
            return <WalkingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          case 'cycle':
            return <CyclingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          case 'hiking':
            return <HikingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          default:
            return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
        }
      case 'strength': {
        const validExercises: StrengthExercise[] = ['pushups', 'pullups', 'situps', 'curls', 'bench'];
        const exercise = validExercises.includes(activity as StrengthExercise)
          ? (activity as StrengthExercise)
          : 'pushups';
        // StrengthTrackerScreen does not accept onWorkoutStateChange — strength tracking
        // intentionally does not trigger the full-screen takeover. Strength sessions are
        // set-based and the user needs access to the header/nav to adjust settings mid-session.
        return <StrengthTrackerScreen initialExercise={exercise} />;
      }
      default:
        return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
```

Use `Edit` to delete the entire `case 'strength': { ... }` block (8 lines), leaving the surrounding structure intact:

```typescript
      case 'cardio':
        switch (activity) {
          case 'run':
            return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          case 'walk':
            return <WalkingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          case 'cycle':
            return <CyclingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          case 'hiking':
            return <HikingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          default:
            return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
        }
      default:
        return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
```

- [ ] **Step 3.6: Verify no leftover strength references**

```bash
grep -n "Strength\|strength" src/screens/activity/ActivityTrackerScreen.tsx
```

Expected: no output. If any references remain, investigate before continuing.

- [ ] **Step 3.7: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS, with `ProfileScreen.tsx` (Task 4) potentially still showing strength-related errors.

- [ ] **Step 3.8: Commit**

```bash
git add src/screens/activity/ActivityTrackerScreen.tsx
git commit -m "$(cat <<'EOF'
Refactor: Remove Strength rendering from ActivityTrackerScreen

Drops StrengthTrackerScreen import, StrengthExercise type, and the
case 'strength' switch branch. Header comment updated to reflect
single-category cardio grid.
EOF
)"
```

---

## Task 4: Remove StrengthTrackerScreen rendering from ProfileScreen

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`

- [ ] **Step 4.1: Locate the strength references**

```bash
grep -n "Strength\|strength\|StrengthExercise" src/screens/ProfileScreen.tsx
```

Expected hits (verified at plan-write time):
- Line ~43: `import { StrengthTrackerScreen } from './activity/StrengthTrackerScreen';`
- Line ~295: `type StrengthExercise = 'pushups' | 'pullups' | 'situps' | 'curls' | 'bench';` (local type alias)
- Lines ~333-341: the strength rendering branch (`const validExercises ...`, `const exercise = ...`, the `onWorkoutStateChange` comment, and the `<StrengthTrackerScreen .../>` return)

- [ ] **Step 4.2: Read the strength branch in context**

```bash
sed -n '320,360p' src/screens/ProfileScreen.tsx
```

Identify the exact `case 'strength': { ... }` block including any associated `validExercises` array, comment about `onWorkoutStateChange`, and the `<StrengthTrackerScreen ... />` return.

- [ ] **Step 4.3: Remove the StrengthTrackerScreen import**

Use `Edit` to delete:
```typescript
import { StrengthTrackerScreen } from './activity/StrengthTrackerScreen';
```

- [ ] **Step 4.4: Remove the local `StrengthExercise` type alias**

Use `Edit` to delete line 295 (or wherever the grep places it):

```typescript
  type StrengthExercise = 'pushups' | 'pullups' | 'situps' | 'curls' | 'bench';
```

- [ ] **Step 4.5: Remove the strength rendering branch**

Use `Edit` to delete the `case 'strength': { ... }` block (the `validExercises` array, the `exercise` ternary, the `onWorkoutStateChange` explanation comment, and the `<StrengthTrackerScreen ... />` return — roughly lines 333-341). Preserve the surrounding `case 'cardio':` block and the `default:` fallback exactly.

- [ ] **Step 4.6: Verify no leftover references**

```bash
grep -n "Strength\|strength" src/screens/ProfileScreen.tsx
```

Expected: no output.

- [ ] **Step 4.7: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS clean.

- [ ] **Step 4.8: Commit**

```bash
git add src/screens/ProfileScreen.tsx
git commit -m "$(cat <<'EOF'
Refactor: Remove Strength rendering from ProfileScreen

Drops StrengthTrackerScreen import and the case 'strength' rendering
branch. ProfileScreen now only renders cardio trackers.
EOF
)"
```

---

## Task 5: Delete StrengthTrackerScreen.tsx and clean up the comment in workoutCardGenerator.ts

**Files:**
- Delete: `src/screens/activity/StrengthTrackerScreen.tsx`
- Modify: `src/services/nostr/workoutCardGenerator.ts` (comment only)

- [ ] **Step 5.1: Confirm StrengthTrackerScreen has no remaining importers**

```bash
grep -rn "StrengthTrackerScreen" src --include="*.ts" --include="*.tsx"
```

Expected: only the file itself appears (`src/screens/activity/StrengthTrackerScreen.tsx` and any internal self-references). No external importers. If any remain, stop and update them first — Tasks 3 and 4 should have caught them all.

- [ ] **Step 5.2: Delete the file**

```bash
rm src/screens/activity/StrengthTrackerScreen.tsx
```

- [ ] **Step 5.3: Update the comment in workoutCardGenerator.ts**

```bash
grep -n "saved by StrengthTrackerScreen" src/services/nostr/workoutCardGenerator.ts
```

Use `Edit` to change the comment at the matched line from:

```typescript
        // Get reps breakdown from top-level field (saved by StrengthTrackerScreen)
```

to:

```typescript
        // Get reps breakdown from the top-level field (historical strength workouts on Nostr)
```

The `repsBreakdown` field on workouts may still be present in events from before the cut — preserving the read path is intentional.

- [ ] **Step 5.4: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS clean.

- [ ] **Step 5.5: Commit**

```bash
git add -u src/screens/activity/StrengthTrackerScreen.tsx src/services/nostr/workoutCardGenerator.ts
git commit -m "$(cat <<'EOF'
Refactor: Delete StrengthTrackerScreen, preserve historical strength rendering

StrengthTrackerScreen.tsx is no longer reachable from any screen
following the activity-grid simplification. Deleted.

workoutCardGenerator.ts still renders historical strength_training
workouts (existing kind 1301 events on Nostr) — comment updated to
reflect that the data is now historical.
EOF
)"
```

(`git add -u` here picks up the deletion automatically. The modified file is also explicitly listed.)

---

## Task 6: Verification script and final typecheck

**Files:**
- Create: `scripts/verify/verify-strength-removed.ts`

- [ ] **Step 6.1: Write the verification script**

Create `scripts/verify/verify-strength-removed.ts` with:

```typescript
/**
 * Verification: Strength category fully removed from the activity grid
 *
 * Asserts:
 *  - ACTIVITY_GRID has exactly one row (cardio)
 *  - That row's key is 'cardio'
 *  - That row's activities are exactly ['run', 'walk', 'cycle', 'hiking']
 *  - StrengthTrackerScreen.tsx no longer exists on disk
 *  - Neither ActivityTrackerScreen.tsx nor ProfileScreen.tsx mentions Strength
 *
 * Run: npx tsx scripts/verify/verify-strength-removed.ts
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ACTIVITY_GRID } from '../../src/services/activity/ActivityGridService';

const repoRoot = resolve(__dirname, '../..');
const failures: string[] = [];

// 1. Grid shape
if (ACTIVITY_GRID.length !== 1) {
  failures.push(`ACTIVITY_GRID has ${ACTIVITY_GRID.length} rows; expected 1`);
}
if (ACTIVITY_GRID[0]?.key !== 'cardio') {
  failures.push(`ACTIVITY_GRID[0].key is ${ACTIVITY_GRID[0]?.key}; expected 'cardio'`);
}
const expectedActivities = ['run', 'walk', 'cycle', 'hiking'];
const actualActivities = ACTIVITY_GRID[0]?.activities ?? [];
if (
  actualActivities.length !== expectedActivities.length ||
  !expectedActivities.every((a, i) => actualActivities[i] === a)
) {
  failures.push(
    `ACTIVITY_GRID[0].activities is ${JSON.stringify(actualActivities)}; ` +
      `expected ${JSON.stringify(expectedActivities)}`,
  );
}

// 2. StrengthTrackerScreen.tsx removed
const strengthScreenPath = resolve(repoRoot, 'src/screens/activity/StrengthTrackerScreen.tsx');
if (existsSync(strengthScreenPath)) {
  failures.push(`File still exists: ${strengthScreenPath}`);
}

// 3. No strength references in tracker screens
const filesToScan = [
  'src/screens/activity/ActivityTrackerScreen.tsx',
  'src/screens/ProfileScreen.tsx',
];
for (const rel of filesToScan) {
  const abs = resolve(repoRoot, rel);
  if (!existsSync(abs)) {
    failures.push(`Expected file missing: ${rel}`);
    continue;
  }
  const contents = readFileSync(abs, 'utf8');
  if (/strength/i.test(contents)) {
    failures.push(`${rel} still mentions 'strength' (case-insensitive)`);
  }
}

if (failures.length > 0) {
  console.error('Strength-cut verification FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('Strength-cut verification PASSED.');
console.log(`  ACTIVITY_GRID: ${ACTIVITY_GRID.length} row, activities = [${actualActivities.join(', ')}]`);
console.log(`  StrengthTrackerScreen.tsx: removed`);
console.log(`  ActivityTrackerScreen.tsx + ProfileScreen.tsx: no 'strength' mentions`);
```

- [ ] **Step 6.2: Run the verification script**

```bash
npx tsx scripts/verify/verify-strength-removed.ts
```

Expected output:
```
Strength-cut verification PASSED.
  ACTIVITY_GRID: 1 row, activities = [run, walk, cycle, hiking]
  StrengthTrackerScreen.tsx: removed
  ActivityTrackerScreen.tsx + ProfileScreen.tsx: no 'strength' mentions
```

If FAILED: read the failure list, fix the offending file, re-run.

- [ ] **Step 6.3: Final typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6.4: Final reachability sweep**

```bash
grep -rn "StrengthTrackerScreen\|case 'strength'" src --include="*.ts" --include="*.tsx"
```

Expected: no output. Any remaining hit indicates a missed reference — investigate and fix before committing.

- [ ] **Step 6.5: Commit**

```bash
git add scripts/verify/verify-strength-removed.ts
git commit -m "$(cat <<'EOF'
Chore: Add verify-strength-removed.ts

Verification script for Phase 1 of cardio-only simplification.
Asserts ACTIVITY_GRID is single-row cardio, StrengthTrackerScreen.tsx
no longer exists, and tracker screens contain no strength references.
EOF
)"
```

- [ ] **Step 6.6: Push to main**

```bash
git pull --ff-only
git push origin main
```

If `git pull --ff-only` fails (someone else pushed), `git pull --rebase`, re-run `npm run typecheck`, re-run the verification script, then push.

---

## Manual smoke test (after merge)

Per `feedback_always_erase_simulator.md`: erase + reinstall the simulator before testing.

- [ ] Open the app on the simulator
- [ ] Navigate to the Home tab (which renders the activity grid)
- [ ] Confirm only cardio tiles are visible (Run / Walk / Cycle / Hike)
- [ ] Swipe between cardio activities — left/right works
- [ ] Swipe up/down — confirm no second category appears (Strength should be gone)
- [ ] Open a kind 1301 strength workout from a teammate's profile (if any historical ones exist) — confirm it still renders correctly in the feed (workoutCardGenerator preserves the read path)

If any of those fail, file a follow-up. If all pass, Phase 1 is shipped and we can plan Phase 2 (tab restructure).
