# RUNSTR — Claude Context

## What is RUNSTR

RUNSTR is a cardio workout companion built around three pillars: Workouts, Social, and Rewards. You complete a cardio workout (run, walk, cycle, or hike), share it, and earn a reward. Workouts can be tracked in-app via GPS or synced automatically from any device or app connected to Apple Health or Health Connect. Rewards go to a lightning address — if the user's Nostr profile has a lud16, that's the default; otherwise they paste one into Settings.

**Read [North Star.md](./docs/North%20Star.md) for the full product identity and direction.**

## Terminology Rules

**Use "rewards" everywhere. Avoid "Bitcoin", "sats", "Lightning", "Nostr" in documentation, code comments, and user-facing text except where technically necessary in implementation code.**

| Use This | Not This |
|----------|----------|
| rewards | sats, Bitcoin |
| wallet | Lightning wallet |
| password | nsec (user-facing) |
| Fitness Club | Run Club |
| event | competition |
| lightning address | reward destination |

Never use "cryptocurrency", "blockchain", or "decentralized" in user-facing contexts.

## Product Structure

**Three-Tab Navigation:** Profile (workouts, history, settings) · Social (feed, Fitness Clubs) · Events (daily leaderboard, club events)

**Activities:** Cardio only — Run, Walk, Cycle, Hike with GPS tracking.

**Rewards:** Sent to the user's lightning address. Defaults to the user's Nostr lud16 if present. Daily reward per workout, extra rewards for placing in events.

**Fitness Clubs:** Club page with leaderboard, real-time chat, captain-created events. Captains earn rewards per member workout.

**Events:** Daily leaderboard (5K, 10K, Half, Marathon, Steps — always active). Captain-created club events. Moving toward user-created events. "Events" and "competitions" are the same concept — use "events".

**Background Sync:** HealthKit background delivery (iOS), WorkManager every 15min (Android). Auto-submit to Supabase, auto-trigger rewards. Users earn without opening the app.

## Key Technologies

- **Frontend**: React Native + TypeScript (Expo)
- **Data Store**: Supabase (workouts, competitions, leaderboards, rewards, clubs, chat)
- **Identity**: Nostr via NDK (auth, profiles, optional social, encrypted backups)
- **Rewards**: An external service ("runstr-zapper", separate repo, not in this codebase) polls Supabase, validates workouts, sends payments to the user's lightning address, and writes payment records to the `reward_payments` table. The app only reads payment status (via `SupabaseRewardService`) — it never sends rewards itself. The in-repo `claim-reward` Edge Function exists but its `claim_reward` workout-reward branch is vestigial; the live operations are `pay_invoice`, `create_invoice`, `lookup_invoice`, `get_balance`, and `register_donation` (called from `NWCGatewayService`)
- **State**: Zustand + AsyncStorage (local-first, cache-first)

## Nostr Usage

Nostr is the **invisible identity layer**. Users never see "Nostr" in the UI.

| Action | Kind | Notes |
|--------|------|-------|
| Profile reads | 0 | Names, pictures, addresses |
| Social posts | 1 | Only when user taps "Share" |
| Profile updates | 0 | When user edits profile |
| Encrypted backups | 30078 | Auto-backup after workouts |
| **Workouts** | **1301** | **Local only — submitted to Supabase, NEVER published to Nostr relays** |

## Critical Rules

- **500-line file limit** — Split files that exceed this
- **NDK exclusively** — NEVER use nostr-tools. Use `GlobalNDKService.getInstance()` for all Nostr ops. NEVER create new NDK() or NostrRelayManager() instances
- **Crypto polyfill** — `react-native-get-random-values` must be imported FIRST in index.js
- **Key generation** — `NDKPrivateKeySigner.generate()` not nostr-tools `generateSecretKey()`
- **Kind 1301 format** — Plain text content (not JSON), lowercase exercise types (`running` not `run`), distance as `['distance', '5.2', 'km']`, duration as HH:MM:SS. Full spec: [docs/KIND_1301_SPEC.md](./docs/KIND_1301_SPEC.md)
- **Real data only** — No mock data, all functionality uses actual Supabase/Nostr

## Architecture Principles

- **Supabase is the data store** — Workouts, competitions, leaderboards, rewards, clubs, chat
- **Nostr is the identity layer** — Auth, profiles, optional social, backups
- **Rewards go to a lightning address** — The user's Nostr lud16 is the default; otherwise they paste one in
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

1. **Auth (anonymous-first):** Tap "Start" — no login required. Optional "Advanced" login with nsec (shown as "Password") or Amber. No difference in experience.
2. **Lightning address:** Defaults to the user's Nostr lud16 if present. Otherwise the user pastes one into Settings. Change anytime.
3. **Workout:** Track via GPS — or sync automatically from any HealthKit/Health Connect app.
4. **Rewards:** Workouts submit to Supabase → DB trigger → Edge Function sends reward to the user's lightning address via LNURL.
5. **Compete:** Daily leaderboard always active. Captain-created club events run on schedules.

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
