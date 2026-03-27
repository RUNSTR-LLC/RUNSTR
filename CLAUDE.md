# RUNSTR — Claude Context

## What is RUNSTR

RUNSTR is a fitness app that enters your workouts into virtual competitions and rewards you for working out. Users choose where their rewards go — to their wallet, a charity, an open source project, or a service like PPQ.AI for AI credits. The app works with any device or fitness app connected to Apple Health or Health Connect, syncing workouts automatically in the background. RUNSTR is a fitness company that monetizes through subscriptions, sponsorships (Zapvertising), and event ticket sales.

**Read [North Star.md](./North%20Star.md) for the full product identity and direction.**

## Terminology Rules

**Use "rewards" everywhere. Avoid "Bitcoin", "sats", "Lightning", "Nostr" in documentation, code comments, and user-facing text except where technically necessary in implementation code.**

| Use This | Not This |
|----------|----------|
| rewards | sats, Bitcoin |
| micro donations | Bitcoin donations |
| AI credits | sats for AI |
| wallet | Lightning wallet |
| password | nsec (user-facing) |
| Fitness Club | Run Club |

Never use "cryptocurrency", "blockchain", or "decentralized" in user-facing contexts.

## Product Structure

**Three-Tab Navigation:** Profile (workouts, history, settings) · Social (feed, Fitness Clubs) · Events (competitions, leaderboards)

**Activities** (swipeable grid): Cardio (Run, Walk, Cycle, Hike with GPS) · Strength (Pushups, Pull-ups, Sit-ups, Squats, Curls, Bench) · Wellness (Guided, Unguided, Breathwork, Body Scan, Gratitude) · Mindfulness (Journal, Habits)

**Rewards:** Sponsor-funded, one destination (no splits) — charities, projects, services (PPQ.AI), or self. Subscriber tiers boost per-workout rewards. Zapvertising: branded push notifications and Rewards page attribution.

**Subscriptions:** Free (base rewards) · Supporter (boosted rewards, premium competitions) · Pro (+ create Fitness Clubs and events)

**Fitness Clubs (Pro):** Club page with leaderboard, real-time chat, captain-created events. Captains earn rewards per member workout. Future: NWC wallets for non-custodial reward/prize pools.

**Competitions:** Daily leaderboard (5K, 10K, Half, Marathon, Steps — always active). Featured events on Supabase. Club events from templates. Moving toward user-created competitions.

**Background Sync:** HealthKit background delivery (iOS), WorkManager every 15min (Android). Auto-submit to Supabase, auto-trigger rewards. Users earn without opening the app.

## Key Technologies

- **Frontend**: React Native + TypeScript (Expo)
- **Data Store**: Supabase (workouts, competitions, leaderboards, rewards, clubs, chat)
- **Identity**: Nostr via NDK (auth, profiles, optional social, encrypted backups)
- **Rewards**: External Edge Functions send rewards via LNURL to chosen destination
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
- **Rewards are destination-routed** — Users pick one destination, rewards go there entirely
- **Background-first** — App works passively via HealthKit/Health Connect sync
- **Performance-first** — Aggressive caching eliminates loading states. See [docs/PERFORMANCE_GUIDE.md](./docs/PERFORMANCE_GUIDE.md)
- **Local-first** — Store locally, sync in background

## Project Structure

```
src/
├── components/        # UI components (<500 lines each)
│   ├── ui/           # Card, Button, Avatar, StatusBar
│   ├── activity/     # Workout tracking (GPS, strength, wellness)
│   ├── club/         # Fitness Club (chat, events, leaderboard)
│   ├── rewards/      # Destination, earnings, sponsor banner
│   ├── profile/      # Profile components
│   └── compete/      # Competition and event components
├── screens/          # App screens
├── services/         # Business logic
│   ├── nostr/        # NDK services (identity layer)
│   ├── backend/      # Supabase services (data store)
│   ├── rewards/      # Reward destination and delivery
│   ├── fitness/      # HealthKit, Health Connect, background sync
│   ├── activity/     # GPS tracking, step counting
│   └── competition/  # Leaderboards and events
├── store/           # Zustand state management
├── types/           # TypeScript definitions
└── utils/           # Helper functions
```

## App Flow

1. **Auth (anonymous-first):** Tap "Start" — no login required. Optional "Advanced" login with nsec (shown as "Password") or Amber. No difference in experience.
2. **Destination:** Choose where rewards go — charity, project, service, or self. Change anytime.
3. **Workout:** Track via GPS, reps, timer, or text — or sync automatically from any HealthKit/Health Connect app.
4. **Rewards:** Workouts submit to Supabase → DB trigger → Edge Function sends reward to chosen destination via LNURL.
5. **Compete:** Daily leaderboard always active. Featured events and club events run on schedules.

## Git Workflow

**All changes go through version branches and PRs. NEVER push directly to main.** Full details: [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md)

1. Work on version branch (e.g., `v1.7.0`) — check for it at session start
2. Commit early and often — run `npm run typecheck` first, stage specific files, use prefixes (`Fix:`, `Feature:`, `Refactor:`, `Docs:`, `Chore:`)
3. Push regularly to back up work
4. Release via PR to main → merge → tag → build

## Development Commands

```bash
npm install                # Install dependencies
npx expo start             # Start Metro on port 8081 (NEVER use --ios flag)
npm run typecheck          # TypeScript validation (run before every commit)
npm run lint               # Code linting
open ios/RUNSTR.xcworkspace # Open Xcode, Cmd+R to build
```

Full testing protocol and troubleshooting: [docs/DEV_WORKFLOW.md](./docs/DEV_WORKFLOW.md)

## Verification Protocol

After implementing any fix or feature, verify before reporting done:
1. Run `npm run typecheck`
2. Write a short verification script in `scripts/verify/` (10-50 lines, runs with `npx tsx`)
3. Run it and report results

For debugging, write a diagnostic script in `scripts/diagnostics/` first — confirm the bug, make the fix, re-run to confirm.

## Documentation Map

| Document | Purpose |
|----------|---------|
| [North Star.md](./North%20Star.md) | Product identity and direction (source of truth) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data flow, NDK details |
| [USER_FLOW.md](./USER_FLOW.md) | User interaction maps and screen flows |
| [book/](./book/) | The RUNSTR Book (16 chapters) |
| [docs/DEV_WORKFLOW.md](./docs/DEV_WORKFLOW.md) | Metro, Xcode, testing protocol, troubleshooting |
| [docs/VIDEO_GUIDE.md](./docs/VIDEO_GUIDE.md) | Remotion video creation + PPQ.ai AI enhancement |
| [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md) | Version branch model, commit rules, release process |
| [docs/KIND_1301_SPEC.md](./docs/KIND_1301_SPEC.md) | Workout event specification |
| [docs/PERFORMANCE_GUIDE.md](./docs/PERFORMANCE_GUIDE.md) | Caching architecture and optimization |
| [docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) | Environment variables |
| [docs/LESSONS_LEARNED.md](./docs/LESSONS_LEARNED.md) | Troubleshooting history |
