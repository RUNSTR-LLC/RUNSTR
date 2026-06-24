# Settings Screen Cleanup — Design

**Date:** 2026-06-24
**Status:** Approved for planning
**Related:** [2026-06-24-workout-feed-redesign-design.md](./2026-06-24-workout-feed-redesign-design.md) (the format toggle surfaced here is consumed by the feed redesign)

## Goal

Trim and clarify the Settings screen with a minimal, low-risk pass. Two concrete changes only — no orphaned-file deletion, no wallet removal (the Wallet section is in active use).

## Scope

### 1. Remove the "Workout Data" accordion

- **What:** The `WorkoutDataSection` accordion contains a single "All Workouts" row that navigates to `WorkoutHistoryScreen`.
- **Why:** A whole collapsible section for one link is overkill, and workout history is already reachable from the Profile tab.
- **Action:** Remove the `WorkoutDataSection` from `SettingsScreen.tsx`. Confirm `WorkoutHistoryScreen` remains reachable from the Profile tab before removal (reachability check). If "All Workouts" is the *only* entry point to that screen, relocate the row into the Profile tab rather than deleting it.
- **Files:** `src/screens/SettingsScreen.tsx`, `src/components/settings/WorkoutDataSection.tsx`.

### 2. Surface the 1301 vs kind-1 post-format toggle in Settings

- **What:** `src/components/settings/NostrPostingSection.tsx` already contains a post-format chooser, gated behind `SHOW_FORMAT_TOGGLE = false` (currently dead/hidden).
- **Why:** Users should be able to choose their post format, and Settings is the right home (not the workout-completion flow). The default changes to **1301** (see feed redesign spec); this toggle lets a user opt into **kind 1** ("card post — shows in every Nostr app").
- **Action:**
  - Flip `SHOW_FORMAT_TOGGLE` to `true` (or remove the gate) so the chooser renders inside the **Sharing** accordion.
  - Verify the chooser reads/writes the persisted format preference (`NostrPostingPreferencesService` / `getPostFormat()`), and that the **default** value is `kind1301` once the feed redesign lands.
  - User-facing copy keeps the terminology firewall: present it as a plain choice (e.g. "Workout note" vs "Card post"), no "Nostr"/"1301"/"kind" jargon in the visible labels. Internal values stay `kind1301` / `kind1`.
- **Files:** `src/components/settings/NostrPostingSection.tsx`, `NostrPostingPreferencesService` (preference read/write), `src/screens/useSettingsState.ts` (handler wiring if needed).

## Explicitly out of scope

- **Wallet section** — keep as-is (in active use; earlier assumption that it was dead was wrong).
- **Orphaned section files** (`AppleHealthSection`, `PrivacySection`, `AdvancedFeaturesSection`, `AgentSkillSection`, `WearableConnectionModal`, `AgentSkillSetupModal`) — leave alone for now.
- **`useSettingsState.ts` 500-line split** — not part of this pass.
- Voice-announcement / health-sync condensation — deferred.

## Verification

1. `npm run typecheck` passes.
2. Settings renders: Workout Data accordion gone; Sharing accordion shows the format chooser.
3. Toggling the format updates the persisted preference (confirm via a short `scripts/verify/` script reading the stored value, or manual sim check).
4. Workout history still reachable from Profile.
