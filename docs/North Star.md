# RUNSTR: A Nostr-Native Running Tracker

> This document is the identity and direction reference for RUNSTR. It describes what the app is, how it works, and where it's headed. All other documentation (CLAUDE.md, ARCHITECTURE.md, USER_FLOW.md, the RUNSTR Book) should align with this document.

---

## The Pitch

RUNSTR is a Nostr-native running tracker. Tagline: **RUNSTR — Run with Nostr.**

One loop, and right now it is the whole product: log in, track a run, it becomes a kind 1301 workout note on relays. There is no email, no phone number, and no account required to start — tap "Start" and you're tracking. The technology is not hidden behind euphemism the way it once was: the app says "Nostr" to you, on purpose, because that is the point of the product now.

Your identity is a Nostr key, not a row in a private database. Log in with an existing key, generate one anonymously, or connect Amber on Android. When you finish a run, it publishes automatically as a kind 1301 note — the open workout format that Amethyst (the largest Nostr client on Android), POWR, and Chachi already render natively. That is what "interoperable" means here: the same run you tracked in RUNSTR can be read by other clients on the network, because it was never trapped in one company's database to begin with.

This is Phase 1 of a simplification, not the app's final form. RUNSTR was previously a three-pillar cardio/social/rewards app — Workouts, Social, Rewards, with clubs, events, leaderboards, a wallet, and Bitcoin micro-rewards. None of that was deleted. It was hidden, behind feature flags and unregistered navigation routes, so the product that ships today is deliberately narrow: one surface, one activity, one loop. The rest is still on disk, reversible by flipping flags in `src/config/features.ts`, waiting for a decision about what comes back and when.

> **Framing note — interoperability, not ownership.** Nostr's value here is that it *frees* workout data to be portable and reusable across clients, not that it makes the data private or "yours." Publishing a 1301 makes a workout public and reusable by anyone who reads the relay. Self-custody language ("your keys, your sats") belongs to the wallet/Bitcoin side, on the rare occasions that side is visible at all — it is not how Nostr is pitched for workouts.

---

## Key Principles

- **One loop** — Log in, track a run, it becomes a kind 1301 note on relays. That is the product.
- **Running only** — The tracker is pinned to running; the activity selector is hidden. No walk/cycle/hike tracking or display in Phase 1.
- **Nostr is visible, not a firewall** — The old rule that forbade saying "Nostr," "nsec," or "relay" to users is gone. The tagline says "Nostr." This is a deliberate inversion of the old two-voices rule, not an oversight.
- **Interoperability, not ownership** — Nostr frees workout data to be portable and reusable across clients (Amethyst, POWR, Chachi); it does not make it private or "owned." Self-custody language stays on the wallet side, where it still exists but is unsurfaced.
- **1301 by default, no share step** — A finished run auto-publishes as a kind 1301 note. The card-share sheet that used to gate this is hidden; publishing is not a choice the user makes per workout.
- **Local history, relay backfill** — Local AsyncStorage is the source of truth for what a user sees. On login, throttled to once per 6 hours, the app quietly merges the user's relay history back in. Backfill only ever adds; it never deletes or overwrites a local workout.
- **Nothing is deleted, most things are hidden** — Clubs, events, leaderboards, the wallet, social feed, and seasons all still exist in the codebase behind `false` flags in `src/config/features.ts`. This is a hiding pass, reversible by flag flips (plus a route-registration revert where a screen was unregistered from navigation), not a rewrite.
- **Collection keeps running; display doesn't** — Apple Health and Health Connect still import walks, rides, hikes, and steps in the background. Only the running tracker and running-only history are shown. This avoids data loss and avoids rewiring sync.
- **Rewards are external to the app now** — The reward pipeline (external zapper service, `reward_payments` table, wallet UI) still exists in the codebase but is not part of the visible product. Reward *selection* logic (WOT-based) has moved entirely outside the app, into a Claude Code skill operating on public 1301 notes — it is not in-app code at all anymore.

## Activities

Running only, in both the tracker and history. Apple Health and Health Connect continue to import the full cardio set (run/walk/cycle/hike) and steps in the background — see "Collection keeps running; display doesn't" above — but nothing except running is tracked live or shown in the app's UI.

## Workouts & Interoperability

| Aspect | Detail |
|---|---|
| **Local source of truth** | AsyncStorage is authoritative for what history displays. Relay backfill (`Nostr1301ImportService.backfillInBackground()`) merges in on login, throttled to once per 6 hours, and only ever adds. |
| **Outbound format** | A finished run auto-publishes as a kind 1301 note by default. The card-share sheet is hidden — there is no separate "post" step. |
| **Cross-client interop** | 1301 notes render natively in Amethyst, POWR, Chachi, and any client that speaks the standard. |
| **Privacy allowlist** | Only neutral workout facts (distance, duration, type, pace, elevation, calories) are published. Lightning address, team/charity tags, and verification metadata are stripped before publishing. |
| **Supabase, underneath** | Workouts are still submitted to Supabase, which still exists and still (in principle) drives the reward pipeline. It is not what the history screen reads from, and it is not visible to the user. |

## Login

Anonymous-first, unchanged from before Phase 1: tap "Start," no login required. Optional "Advanced" login with nsec or Amber (Android). NIP-46 bunker login does not exist in the codebase yet — see Deferred, below. The login screen has not been inverted to lead with a signer; that inversion is planned for when bunker login ships, not before.

## Deferred, not abandoned

These are named gaps, held out of Phase 1 on purpose:

- **NIP-46 bunker login** — a net-new subsystem; no code exists in `src/` today. Amber remains the only real external-signer path, Android-only.
- **Login screen inversion** — Amber/bunker becomes the headline and `Start` moves under Advanced, once bunker ships.
- **MCP tab** — parked, undecided as a product surface. Settings-side scaffolding (`AgentSkillSection.tsx`, `AgentSkillSetupModal.tsx`) already exists but is rendered nowhere.
- **Apple Watch app** — a later phase, not started.
- **WOT reward selection** — moved out of the app entirely, into a Claude Code skill that operates against public 1301 notes. It is not app work anymore.
- **Split voice announcement fix** — a known bug, tracked separately. Not a simplification concern.

## Known limitations

- **Archival relay coverage is an open question.** The plan was to add `wss://relay.nostr.band` for broad archival coverage during backfill. It was reverted during implementation: this codebase already excludes that relay because it causes SSL failures that stall the iOS Simulator for 40+ seconds (see `src/services/cache/UnifiedWorkoutCache.ts`). Backfill runs against the three existing relays (`relay.damus.io`, `nos.lol`, `relay.primal.net`) only, so recovery of long-past 1301s is best-effort, not guaranteed. Unresolved, not a settled tradeoff.
- **A foreign 1301 note can produce one duplicate.** A note published by another client without a `workout_start_time` tag falls back to publish time for dedup matching, which can miss the dedup window and import one extra copy. It does not recur — once imported, the event id is stored and later backfills match on it.

## What's still here, hidden

Everything below exists in the codebase, sits behind a `false` flag in `src/config/features.ts` or an unregistered route in `src/App.tsx`'s `AuthenticatedStack`, and is reversible without a rebuild:

| Surface | State |
|---|---|
| Social feed, likes, reposts, zaps | Hidden (`FEATURES.social: false`) |
| Fitness Clubs (chat, captain tools, club affiliations) | Hidden (`FEATURES.teams: false`) |
| Daily leaderboard, club/custom events | Hidden (`FEATURES.leaderboard`, `customEvents: false`) |
| Seasons (Season 2, Season 3, Einundzwanzig) | Hidden (`FEATURES.seasons: false`) |
| Level badge / level ring | Hidden (`FEATURES.level: false`) |
| Earnings badge, Rewards screen, wallet settings | Hidden (`FEATURES.earnings`, `walletSettings: false`) |
| Activity selector (walk/cycle/hike tracking) | Hidden (`FEATURES.activitySelector: false`) |
| Steps display (counters still run) | Hidden (`FEATURES.stepTracking: false`) |
| Card-share sheet on a finished workout | Hidden (`FEATURES.shareSheet: false`); 1301 auto-publish is the default instead |
| Private-mode toggle | Hidden (`FEATURES.privateMode: false`); private is now implicit |
| Journal/habit entries in history | Hidden (`FEATURES.journalHabits: false`) |

None of this is deleted. Reversal is a flag flip, plus re-registering the route where one was pruned from `AuthenticatedStack`.

## Background Sync

| Platform | Mechanism |
|---|---|
| **iOS** | HealthKit background delivery wakes RUNSTR when a new workout appears |
| **Android** | Health Connect periodic sync every 15 minutes via WorkManager |

Unchanged by Phase 1. Sync keeps collecting every activity type; only running is shown.

## Direction

- **Decide what comes back.** Phase 1 is a hiding pass, not a final shape. The next real decision is which hidden surfaces (social, clubs, rewards) get re-enabled, and in what order.
- **NIP-46 bunker login.** Build it, then invert the login screen to lead with a signer instead of anonymous `Start`.
- **MCP tab.** Resolve whether this is a real surface; the settings-side scaffolding is already sitting there unused.
- **Relay coverage.** Resolve the archival-relay question — either find a stable archival relay that doesn't stall the iOS Simulator, or accept best-effort backfill coverage as permanent.
