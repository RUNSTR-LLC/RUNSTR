# RUNSTR — Claude Context

## What is RUNSTR

RUNSTR is a Nostr-native running tracker. Tagline: **RUNSTR — Run with Nostr.**

One loop: log in, track a run, it becomes a kind 1301 note on relays. That is the whole product surface right now. Login is anonymous-first ("Start"), the tracker is pinned to running, and a finished run auto-publishes as a kind 1301 workout note that renders natively in Amethyst, POWR, and Chachi.

**This is Phase 1 of a simplification** (design: `docs/superpowers/specs/2026-09-18-runstr-simplification-design.md`). RUNSTR used to be a three-pillar cardio/social/rewards app; that product is still on disk but hidden — nothing is deleted. See "What's hidden, not gone" below before assuming a feature doesn't exist.

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
- **Supabase is still running underneath**, in ~38 files including `AuthContext.tsx`. It was hidden at the UI layer, not removed.
- **Rewards still exist in the codebase.** The external zapper and `reward_payments` table are untouched — they're just not surfaced in the UI (`FEATURES.earnings: false`, `walletSettings: false`).

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
- **Data Store**: Supabase — still running underneath (~38 files, including `AuthContext.tsx`), hidden at the UI layer, not the thing Phase 1 users interact with. Local AsyncStorage is the source of truth for what a user sees in history.
- **Identity**: Nostr via NDK (auth, profiles, publishing, relay backfill) — now a visible, named part of the product, not a hidden layer.
- **Rewards**: Present in the codebase and unsurfaced in Phase 1 UI (`FEATURES.earnings: false`, `walletSettings: false`). An external service ("runstr-zapper", separate repo, not in this codebase) polls Supabase, validates workouts, sends payments to the user's lightning address, and writes payment records to the `reward_payments` table. The app only reads payment status (via `SupabaseRewardService`) — it never sends rewards itself. The in-repo `claim-reward` Edge Function exists but its `claim_reward` workout-reward branch is vestigial; the live operations are `pay_invoice`, `create_invoice`, `lookup_invoice`, `get_balance`, and `register_donation` (called from `NWCGatewayService`)
- **State**: Zustand + AsyncStorage (local-first, cache-first)

## Nostr Usage

Nostr is the substrate the product is named after — visible and named in the UI, not hidden.

| Action | Kind | Notes |
|--------|------|-------|
| Profile reads | 0 | Names, pictures, addresses |
| Social posts | 1 | Only when user taps "Share" |
| Profile updates | 0 | When user edits profile |
| Encrypted backups | 30078 | Auto-backup after workouts |
| **Workouts** | **1301** | **Auto-published to relays by default (the card-share sheet is hidden) for cross-app interop (Amethyst/POWR/Chachi). Also submitted to Supabase underneath. Sensitive tags — lightning/team/charity/verification — are stripped by the allowlist in `publishWorkout1301()` before publishing. On login, `Nostr1301ImportService.backfillInBackground()` merges the user's relay history back into local AsyncStorage, which remains the source of truth for what history displays — see "What's hidden, not gone" above.** |

## Critical Rules

- **500-line file limit** — Split files that exceed this
- **NDK exclusively** — NEVER use nostr-tools. Use `GlobalNDKService.getInstance()` for all Nostr ops. NEVER create new NDK() or NostrRelayManager() instances
- **Crypto polyfill** — `react-native-get-random-values` must be imported FIRST in index.js
- **Key generation** — `NDKPrivateKeySigner.generate()` not nostr-tools `generateSecretKey()`
- **Kind 1301 format** — Plain text content (not JSON), lowercase exercise types (`running` not `run`), distance as `['distance', '5.2', 'km']`, duration as HH:MM:SS. Full spec: [docs/KIND_1301_SPEC.md](./docs/KIND_1301_SPEC.md)
- **Real data only** — No mock data, all functionality uses actual Supabase/Nostr

## Architecture Principles

- **Local history is the source of truth** — AsyncStorage is authoritative for what the user sees; relay backfill only ever adds to it, never deletes or overwrites
- **Nostr is visible** — Auth, publishing, relay backfill; named as "Nostr" in the UI, no firewall
- **Supabase runs underneath, hidden** — Still receives workout submissions and still drives the (unsurfaced) reward pipeline; not what powers the history screen
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
│   ├── backend/      # Supabase services (data store)
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
3. **Publish:** Finishing a run auto-publishes it as a kind 1301 note to relays (the card-share sheet is hidden; 1301 is the default, not a choice). It's also submitted to Supabase underneath.
4. **History:** Local AsyncStorage renders immediately. On login, and throttled to once per 6 hours, `Nostr1301ImportService` backfills the user's relay history into local storage in the background — see "What's hidden, not gone" above for the dedup and relay-coverage caveats.
5. **Rewards:** Not part of the visible loop in Phase 1. The reward pipeline (external zapper, `reward_payments`) still exists but is unsurfaced — see Deferred and Known limitations.

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
