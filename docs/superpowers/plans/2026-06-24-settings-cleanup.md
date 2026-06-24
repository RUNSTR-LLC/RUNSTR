# Settings Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the single-link "Workout Data" accordion from Settings and surface the existing 1301/kind-1 post-format toggle.

**Architecture:** Two independent, low-risk edits to the Settings screen. The format-preference machinery and the toggle UI already exist (`NostrPostingPreferencesService` defaults to `kind1301`; the picker is gated behind `SHOW_FORMAT_TOGGLE = false`). This just removes one section and un-hides the picker.

**Tech Stack:** React Native, TypeScript, Expo.

## Global Constraints

- Verify via `npm run typecheck` (must pass) + simulator check. No jest tests for this area.
- Terminology firewall: user-facing labels stay jargon-free — no "Nostr"/"1301"/"kind" in visible text. Internal values stay `kind1` / `kind1301`.
- 500-line file limit.
- Single-branch: commit directly to `main` with `Refactor:`/`Chore:` prefix.

---

### Task 1: Remove the "Workout Data" accordion

**Files:**
- Modify: `src/screens/SettingsScreen.tsx:34` (import), `:129-131` (usage)
- Modify: `src/screens/useSettingsState.ts:333-336` (`handleAllWorkoutsPress`), `:529` (export)
- Delete: `src/components/settings/WorkoutDataSection.tsx` (orphaned after this task)

**Reachability confirmed:** `WorkoutHistory` is still reachable via `TopBar.tsx:31` (clock icon) and Profile's inline recent-workouts list, so removing the Settings entry strands nothing.

- [ ] **Step 1: Remove the import** in `src/screens/SettingsScreen.tsx` — delete line 34:
```tsx
import { WorkoutDataSection } from '../components/settings/WorkoutDataSection';
```

- [ ] **Step 2: Remove the usage** in `src/screens/SettingsScreen.tsx` — delete the block at lines 129-131:
```tsx
          <WorkoutDataSection
            onAllWorkoutsPress={state.handleAllWorkoutsPress}
          />
```

- [ ] **Step 3: Remove the now-unused handler** in `src/screens/useSettingsState.ts` — delete the `handleAllWorkoutsPress` callback (lines 333-336) and its entry in the returned object (line 529). Leave the `navigation` reference intact (used by `handleBack` etc.).

- [ ] **Step 4: Delete the orphaned section file**
```bash
git rm src/components/settings/WorkoutDataSection.tsx
```

- [ ] **Step 5: Typecheck**
```bash
npm run typecheck
```
Expected: PASS (no references to `WorkoutDataSection` or `handleAllWorkoutsPress` remain).

- [ ] **Step 6: Commit**
```bash
git add src/screens/SettingsScreen.tsx src/screens/useSettingsState.ts
git commit -m "Refactor: remove single-link Workout Data accordion from Settings"
```

---

### Task 2: Surface the post-format toggle in Settings

**Files:**
- Modify: `src/components/settings/NostrPostingSection.tsx:31` (`SHOW_FORMAT_TOGGLE`), `:48` (local default), `:28-31` (comment)

**Interfaces:**
- Consumes: `NostrPostingPreferencesService.getPostFormat()` / `setPostFormat()` (already wired in this component; default is `kind1301`).

- [ ] **Step 1: Flip the gate** in `src/components/settings/NostrPostingSection.tsx` — change line 31:
```tsx
const SHOW_FORMAT_TOGGLE = true;
```

- [ ] **Step 2: Fix the local state default** so the picker doesn't flash `kind1` before the async load resolves — change line 48:
```tsx
  const [format, setFormat] = useState<PostFormat>('kind1301');
```

- [ ] **Step 3: Update the stale comment** at lines 28-31 to reflect that the toggle is now visible:
```tsx
// Post-format picker, surfaced in the Sharing accordion. Default is a workout
// note (kind 1301) for cross-app interop (Amethyst/POWR/Chachi); a user can
// opt into a card post (kind 1) that renders in every Nostr client.
const SHOW_FORMAT_TOGGLE = true;
```

- [ ] **Step 4: Typecheck**
```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Simulator check** — open Settings → Sharing accordion. Confirm: "Auto-post workouts" toggle, then a "Post format" picker with "Workout note" selected by default and "Card post" selectable. Selecting one persists (re-open Settings → selection retained).

- [ ] **Step 6: Commit**
```bash
git add src/components/settings/NostrPostingSection.tsx
git commit -m "Feature: surface post-format picker in Settings (default workout note)"
```

---

## Self-Review

- **Spec coverage:** Drop Workout Data tab (Task 1 ✓). Surface format toggle (Task 2 ✓). Keep Wallet (untouched ✓). Leave orphaned files (only `WorkoutDataSection`, which this change orphans, is removed ✓). Default 1301 already true in preference service (no task needed; confirmed).
- **Placeholder scan:** none.
- **Type consistency:** `PostFormat` ('kind1' | 'kind1301') used consistently; `getPostFormat`/`setPostFormat` names match the service.
