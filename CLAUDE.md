# RUNSTR — Claude Context

## What is RUNSTR

RUNSTR is a Nostr-native running tracker. Tagline: **RUNSTR — Run with Nostr.**

One loop: log in, track a run, it becomes a kind 1301 note on relays. That is the whole product surface right now. Login is anonymous-first ("Start"), the tracker is pinned to running, and a finished run auto-publishes as a kind 1301 workout note that renders natively in Amethyst, POWR, and Chachi.

**Phase 1** of a simplification (design: `docs/superpowers/specs/2026-09-18-runstr-simplification-design.md`) hid the old three-pillar cardio/social/rewards product — still on disk, nothing deleted. **Phase 2 (2026-10-18) made the live app fully Nostr:** no Supabase traffic, 1301 is the only workout post, and the encrypted kind 30078 backup is the private copy of history. See "What's hidden, not gone" and "Phase 2: fully Nostr" below before assuming a feature doesn't exist.

**The in-app terminology firewall is gone.** Saying "Nostr" to the user is now correct and expected — the tagline says it. There is no longer a rule against user-facing "Nostr", "nsec", "relay", or "1301" language; use whatever is clearest. The one framing rule that survives:

> **Interoperability, not ownership.** Nostr's value here is that it *frees* a workout to be portable and readable by other clients (Amethyst, POWR, Chachi) — not that it makes the data private or exclusively "yours." Publishing a 1301 makes a workout public. Self-custody/"your keys" language belongs to wallet contexts, not to how Nostr is pitched for workouts.

**Read [North Star.md](./docs/North%20Star.md) for the full product identity and direction.**

## What's hidden, not gone

Twelve of thirteen simplification tasks are committed (this doc is the thirteenth). Concretely:

- **One surface.** The bottom tab bar is hidden (`tabBarStyle: { display: 'none' }` in `BottomTabNavigator.tsx`, gated on `FEATURES.social || FEATURES.leaderboard`, both `false`). Social, Leaderboard, Clubs, Events, Rewards, Level, seasons — 16 routes total — are unregistered from `AuthenticatedStack` in `src/App.tsx` but the screen files still exist.
- **Running only, by display.** The activity selector is hidden (`FEATURES.activitySelector: false`) and `ProfileScreen.renderTracker()` is pinned to `RunningTrackerScreen`. History filters through the single predicate `isRunningWorkout()` in `src/utils/isRunningWorkout.ts`.
- **Collection is untouched.** Apple Health and Health Connect still import walks, rides, hikes, and steps — only what's *shown* is filtered. Step counter services (`DailyStepCounterService`, `NativeStepCounterService`) keep running in the background; `FEATURES.stepTracking: false` just hides the steps hero from the stats card and history.
- **1301 backfill is automatic now.** On login, `Nostr1301ImportService.backfillInBackground()` merges the user's 1301 history from relays into local storage, throttled to once per 6 hours (`BACKFILL_INTERVAL_MS`, `@runstr:last_1301_backfill` in AsyncStorage). It runs after `currentUser` resolves in `src/App.tsx`, never blocks the UI, and only ever adds — it does not delete or overwrite local workouts. Local AsyncStorage remains the source of truth.
- **Everything is a flag, not a deletion.** All Phase 1 hiding lives in `src/config/features.ts` under the "Phase 1 (2026-09-18)" block. Flip a flag back to `true` and the route/UI reappears; nothing needs to be rebuilt. Reversal is a config change plus a `git revert` of the route-prune commit if the route itself was unregistered.
- **Supabase code is still on disk** (~60 files, mostly hidden screens) but the live app makes no Supabase calls — see "Phase 2: fully Nostr" below.
- **Rewards still exist in the codebase.** The external zapper and `reward_payments` table are untouched — they're just not surfaced in the UI (`FEATURES.earnings: false`, `walletSettings: false`). With `FEATURES.supabase: false` the zapper receives no new workouts.

## Phase 2: fully Nostr (2026-10-18)

One flag, `FEATURES.supabase: false` in `src/config/features.ts` ("Phase 2" block), gates every Supabase call from the live app. Flip it to `true` to restore all of it. Gated paths:

- **Workout submission** — the `SupabaseCompetitionService.submitWorkoutSimple` choke point (all ~10 callers: tracker, HealthKit, Health Connect, background sync, pending queue, steps, journal), the Supabase branch of `saveWorkoutToNostr`, `LocalWorkoutStorageService.autoSubmitToSupabase`, the foreground retry queue, the restore → Supabase queue, and the 1301 feed dual-write.
- **Startup/login reads and writes** — reward polling (`App.tsx`), push token registration (`ExpoNotificationProvider` + the `token_key` upsert in `AuthContext`), PPQ key migration, Season 2 leaderboard prefetch, profile earnings badge, profile section queries.
- **UI** — the "Compete" / "Retry Compete" button in history is hidden.

What replaced it:

- **Kind 1301 only.** `workoutPublishingService.postWorkout()` always publishes a 1301 and ignores the stored post-format preference; the Settings "Post format" picker is hidden (`SHOW_FORMAT_TOGGLE = false`). The kind 1 path (`postWorkoutToSocial`, card uploads, `SocialFeedService`) is unreachable but not deleted.
- **Personal records are local.** `StatsCard` computes PRs from `LocalWorkoutStorageService`, not the Supabase `workouts` table.
- **Encrypted backup is chunked.** Workouts live in kind 30078 chunk events (`d` = `runstr-workout-backup:w0…wN`, 100 per chunk oldest-first, halved if over ~49KB compressed — the NIP-44 limit after base64). The main event (`d` = `runstr-workout-backup`) holds habits/journal/preferences and a `['chunks', N]` tag. Chunks publish before the main event; unchanged chunks are skipped, with a full re-send weekly. Logic in `src/services/backup/backupChunks.ts`. v1 single-event backups still restore.
- **Auto-restore on login.** `RestoreService.restoreInBackground()` runs once per install (`@runstr:auto_restore_done`) for nsec users, then the 1301 backfill runs. Additive only. Amber users are skipped (decrypt opens an Amber prompt) and restore from Settings → Import.
- **Verified statically only** (`scripts/verify/verify-no-supabase-submission.ts`, `verify-backup-chunks.ts`). A simulator run confirming zero `supabase.co` requests and a real fresh-install restore has not been done yet.

## Deferred (not bugs)

These are deliberate Phase 1 gaps, not defects. Do not "fix" them without checking the design doc first.

- **NIP-46 bunker login** — no code exists yet anywhere in `src/`. Amber (Android) is the only real external-signer path today; anonymous `Start` still works on both platforms and remains the hero action.
- **Login screen inversion** — Amber/bunker become the headline and `Start` moves under Advanced only once bunker login ships. Today's login screen is unchanged from before Phase 1.
- **MCP tab** — parked, undecided. `AgentSkillSection.tsx` and `AgentSkillSetupModal.tsx` already exist in `src/components/settings/` but are rendered nowhere — pre-existing dead code, not new breakage.
- **WOT reward selection** — moved *out* of the app entirely. It now runs as a Claude Code skill (see `runstr-fitness` skill) operating against public 1301 notes, not as in-app logic.
- **Split voice announcements** — a known bug, tracked separately from this simplification. Not touched here.

## Known limitations

- **Archival relay coverage is unresolved.** The design originally chose to add `wss://relay.nostr.band` for backfill (broad archival index), but that relay is excluded in this codebase — it causes SSL failures that stall the iOS Simulator for 40+ seconds (see the note in `src/services/cache/UnifiedWorkoutCache.ts` and in `GlobalNDKService.DEFAULT_RELAYS`). Backfill runs against the three existing relays (`relay.damus.io`, `nos.lol`, `relay.primal.net`) only. Coverage of long-past 1301s — especially ones published before those relays retained the event — is best-effort, not guaranteed. This is an open question, not a settled tradeoff.
- **A foreign 1301 note can import one duplicate.** A workout note published by another client (Amethyst, POWR) without a `workout_start_time` tag falls back to the note's publish time for dedup matching, which can miss the dedup time window and import one extra copy alongside the original. It does not recur on later backfills — the Nostr event id is stored once imported, so subsequent runs match on event id and skip it. This is a one-time, bounded imperfection, not an ongoing duplication bug.

## Activities

Running only, in the tracker and in history. The old cardio set (run/walk/cycle/hike) still gets collected via Apple Health and Health Connect sync — see "What's hidden, not gone" — but the app only tracks and displays running.

## Integrations

- **Apple Health** (iOS) and **Health Connect** (Android) — background sync, unchanged by Phase 1.
- **MCP** — planned, not built. See "Deferred" above.

## Key Technologies

- **Frontend**: React Native + TypeScript (Expo)
- **Data Store**: Local AsyncStorage is the source of truth for history. Relays are the only backend: public 1301 notes plus the private encrypted 30078 backup. Supabase code remains on disk but is switched off (`FEATURES.supabase: false`).
- **Identity**: Nostr via NDK (auth, profiles, publishing, relay backfill) — now a visible, named part of the product, not a hidden layer.
- **Rewards**: Present in the codebase, unsurfaced in the UI, and receiving no new workouts while `FEATURES.supabase` is off (`FEATURES.earnings: false`, `walletSettings: false`). An external service ("runstr-zapper", separate repo, not in this codebase) polls Supabase, validates workouts, sends payments to the user's lightning address, and writes payment records to the `reward_payments` table. The app only reads payment status (via `SupabaseRewardService`) — it never sends rewards itself. The in-repo `claim-reward` Edge Function exists but its `claim_reward` workout-reward branch is vestigial; the live operations are `pay_invoice`, `create_invoice`, `lookup_invoice`, `get_balance`, and `register_donation` (called from `NWCGatewayService`)
- **State**: Zustand + AsyncStorage (local-first, cache-first)

## Nostr Usage

Nostr is the substrate the product is named after — visible and named in the UI, not hidden.

| Action | Kind | Notes |
|--------|------|-------|
| Profile reads | 0 | Names, pictures, addresses |
| Social posts | 1 | Retired in Phase 2 — workout posts are 1301 only; kind 1 code is unreachable |
| Profile updates | 0 | When user edits profile |
| Encrypted backups | 30078 | Auto-backup after workouts (3-min debounce), NIP-44 self-encrypted, chunked (`runstr-workout-backup` + `:w0…wN`). Auto-restored once per install on login (nsec users) |
| **Workouts** | **1301** | **Auto-published to relays by default (the card-share sheet is hidden) for cross-app interop (Amethyst/POWR/Chachi). The only workout upload — no Supabase submission. Sensitive tags — lightning/team/charity/verification — are stripped by the allowlist in `publishWorkout1301()` before publishing. On login, `Nostr1301ImportService.backfillInBackground()` merges the user's relay history back into local AsyncStorage, which remains the source of truth for what history displays — see "What's hidden, not gone" above.** |

## Critical Rules

- **500-line file limit** — Split files that exceed this
- **NDK exclusively** — NEVER use nostr-tools. Use `GlobalNDKService.getInstance()` for all Nostr ops. NEVER create new NDK() or NostrRelayManager() instances
- **Crypto polyfill** — `react-native-get-random-values` must be imported FIRST in index.js
- **Key generation** — `NDKPrivateKeySigner.generate()` not nostr-tools `generateSecretKey()`
- **Kind 1301 format** — Plain text content (not JSON), lowercase exercise types (`running` not `run`), distance as `['distance', '5.2', 'km']`, duration as HH:MM:SS. Full spec: [docs/KIND_1301_SPEC.md](./docs/KIND_1301_SPEC.md)
- **Real data only** — No mock data, all functionality uses actual Nostr relays and local storage

## Architecture Principles

- **Local history is the source of truth** — AsyncStorage is authoritative for what the user sees; relay backfill only ever adds to it, never deletes or overwrites
- **Nostr is visible** — Auth, publishing, relay backfill; named as "Nostr" in the UI, no firewall
- **No Supabase in the live app** — Everything goes through `FEATURES.supabase` (off). New code must not call Supabase; use relays (1301, 30078) and local storage
- **Background-first** — App works passively via HealthKit/Health Connect sync
- **Performance-first** — Aggressive caching eliminates loading states. See [docs/PERFORMANCE_GUIDE.md](./docs/PERFORMANCE_GUIDE.md)
- **Local-first** — Store locally, sync in background

## Project Structure

```
src/
├── components/        # UI components (<500 lines each)
│   ├── ui/           # Card, Button, Avatar, StatusBar
│   ├── activity/     # Workout tracking (GPS)
│   ├── club/         # Fitness Club (chat, events, leaderboard)
│   ├── rewards/      # Lightning address, earnings
│   ├── profile/      # Profile components
│   └── compete/      # Event components
├── screens/          # App screens
├── services/         # Business logic
│   ├── nostr/        # NDK services (identity layer)
│   ├── backend/      # Supabase services (switched off — FEATURES.supabase)
│   ├── rewards/      # Reward delivery, payments
│   ├── fitness/      # HealthKit, Health Connect, background sync
│   ├── activity/     # GPS tracking, step counting
│   └── competition/  # Leaderboards and events
├── store/           # Zustand state management
├── types/           # TypeScript definitions
└── utils/           # Helper functions
```

## App Flow

The one loop: log in → track a run → it becomes a kind 1301 note on relays.

1. **Auth (anonymous-first, unchanged by Phase 1):** Tap "Start" — no login required. Optional "Advanced" login with nsec or Amber. NIP-46 bunker login does not exist yet — see Deferred above.
2. **Track:** The tracker opens directly on running — the activity selector is hidden. GPS tracks the run; Apple Health / Health Connect still sync everything else in the background, unshown.
3. **Publish:** Finishing a run auto-publishes it as a kind 1301 note to relays (the card-share sheet is hidden; 1301 is the only format). The encrypted 30078 backup updates 3 minutes later.
4. **History:** Local AsyncStorage renders immediately. On login, the encrypted backup restores once per install (nsec users), then `Nostr1301ImportService` backfills relay history (throttled to once per 6 hours) — see "What's hidden, not gone" and "Phase 2" above for the dedup, relay-coverage, and Amber caveats.
5. **Rewards:** Not part of the visible loop. The reward pipeline (external zapper, `reward_payments`) still exists but gets no new workouts while `FEATURES.supabase` is off — see Deferred and Known limitations.

## Git Workflow

**Single-branch model: all work happens on `main`. Releases are tagged, not branched.** Full details: [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md)

1. Routine work commits and pushes directly to `main` — `git pull --ff-only` first, run `npm run typecheck`, stage specific files, use prefixes (`Fix:`, `Feature:`, `Refactor:`, `Docs:`, `Chore:`)
2. Use a feature branch only when the change needs review, is risky, or the user explicitly asks for one
3. Never force-push, never bypass hooks (`--no-verify`), never `git add .`
4. Releases: bump version, commit, tag (`v1.10.0`), push tag, build from the tag

## Development Commands

```bash
npm install                # Install dependencies
npx expo start             # Start Metro on port 8081 (NEVER use --ios flag)
npm run typecheck          # TypeScript validation (run before every commit)
npm run lint               # Code linting
open ios/RUNSTR.xcworkspace # Open Xcode, Cmd+R to build
```

Full testing protocol and troubleshooting: [docs/DEV_WORKFLOW.md](./docs/DEV_WORKFLOW.md)

## Reachability Check (do this BEFORE editing)

Names lie. This codebase has accumulated multiple plausible owners for the same feature — e.g. `StepsDisplayScreen`, `WalkingTrackerScreen`, `ActivityTrackerScreen`, and `StatsCard` all render daily steps; `DailyStepCounterService`, `NativeStepCounterService`, and `HealthKitBackgroundService` all touch step data. Editing the wrong file looks like progress and ships nothing.

Before investing in a fix or feature in a file:

1. **Grep its consumers.** `grep -rn "ComponentName\|fileName" src --include="*.ts" --include="*.tsx"` — what imports it?
2. **Trace to a reachable root.** Follow imports up to a navigation entry (`App.tsx`, navigators, bottom-tab routes), an `index.js` import, or a service called from an active code path. If the chain dead-ends, the file is dead — flag it and ask before editing.
3. **When the user reports a UI symptom, confirm the screen.** If two or more components could plausibly render what they're describing, ask for a screenshot or the exact navigation path before picking a file. Don't infer from the filename.
4. **When you find dead code adjacent to your work, name it in the report.** Don't silently delete; surface it so the user can confirm.

## Verification Protocol

After implementing any fix or feature, verify before reporting done:
1. Run `npm run typecheck`
2. Write a short verification script in `scripts/verify/` (10-50 lines, runs with `npx tsx`)
3. Run it and report results

For debugging, write a diagnostic script in `scripts/diagnostics/` first — confirm the bug, make the fix, re-run to confirm.

## Documentation Map

| Document | Purpose |
|----------|---------|
| [North Star.md](./docs/North%20Star.md) | Product identity and direction (source of truth) |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture, data flow, NDK details |
| [USER_FLOW.md](./docs/USER_FLOW.md) | User interaction maps and screen flows |
| [book/](./book/) | The RUNSTR Book (16 chapters) |
| [docs/DEV_WORKFLOW.md](./docs/DEV_WORKFLOW.md) | Metro, Xcode, testing protocol, troubleshooting |
| [docs/VIDEO_GUIDE.md](./docs/VIDEO_GUIDE.md) | Remotion video creation |
| [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md) | Single-branch model, commit rules, tag-based releases |
| [docs/KIND_1301_SPEC.md](./docs/KIND_1301_SPEC.md) | Workout event specification |
| [docs/PERFORMANCE_GUIDE.md](./docs/PERFORMANCE_GUIDE.md) | Caching architecture and optimization |
| [docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) | Environment variables |
| [docs/LESSONS_LEARNED.md](./docs/LESSONS_LEARNED.md) | Troubleshooting history |
