# RUNSTR: A Nostr-Native Running Tracker

> This document is the identity and direction reference for RUNSTR. It describes what the app is, how it works, and where it's headed. All other documentation (CLAUDE.md, ARCHITECTURE.md, USER_FLOW.md, the RUNSTR Book) should align with this document.

---

## The Pitch

RUNSTR is a Nostr-native running tracker. Tagline: **RUNSTR — Run with Nostr.**

Four things, and nothing else:

1. **Sign in with Nostr.** Tap "Start" for a fresh key, paste an nsec, or connect Amber on Android.
2. **Track your run.** GPS, splits, pace, voice announcements.
3. **Keep your history.** Runs are saved on the phone and published to Nostr as kind 1301 workout notes, with an encrypted backup alongside.
4. **Share your runs with your AI agent.** Give the agent your npub; it reads your published runs from Nostr with the `runstr-fitness` skill.

There is no email, no phone number, no account server, and no backend other than Nostr relays.

> **Framing note — interoperability, not ownership.** Nostr's value here is that it *frees* a run to be portable and readable by other clients (Amethyst, POWR, Chachi) and by an AI agent, not that it makes the data private or "yours." Publishing a 1301 makes a run public. Self-custody language belongs to wallet contexts, and RUNSTR has no wallet.

---

## Key Principles

- **Basics only.** If a feature is not one of the four things above, it does not belong in the app. Polishing RUNSTR means removing, not adding.
- **Running only.** The tracker and history show running. Apple Health and Health Connect may import other activity types on foreground sync; they are not displayed.
- **Nostr is visible.** The UI says "Nostr", "npub", and "nsec" plainly.
- **1301 by default.** A finished run auto-publishes as a kind 1301 note. The user can turn auto-publish off in Settings and publish individual runs from History.
- **Local history is the source of truth.** AsyncStorage is authoritative for what the user sees. Relay backfill and backup restore only ever add.
- **The agent needs only the npub.** Published runs are public, so sharing with an AI agent never involves the nsec. Runs that were not published are not visible to the agent.
- **Deleted means deleted.** Removed features live in git history, not behind flags. `src/config/features.ts` holds only flags that live code still reads.

## What the user sees

| Surface | What it does |
|---|---|
| Login | "Start" (new key), nsec, or Amber |
| Home | Profile card and the running tracker |
| History | Runs, each marked "On Nostr" or offering "Publish to Nostr" |
| Settings | Tracking (health import, voice, units), Nostr (auto-publish), Data & Backup, Nostr Keys (back up nsec, copy npub, share with AI agent), language, support, sign out / delete |
| Profile Edit | Name, picture, banner (kind 0) |

## Workouts & Interoperability

| Aspect | Detail |
|---|---|
| **Local source of truth** | AsyncStorage. `Nostr1301ImportService.backfillInBackground()` merges relay history on login, throttled to once per 6 hours, additive only. |
| **Outbound format** | Kind 1301, allowlisted workout-data tags only (`publishWorkout1301()`). |
| **Cross-client interop** | 1301 notes render natively in Amethyst, POWR, and Chachi. |
| **Encrypted backup** | Kind 30078, NIP-44 self-encrypted, chunked. Restored once per install on login for nsec users. |
| **AI agent** | The `runstr-fitness` skill (`.claude/skills/runstr-fitness/SKILL.md`) reads public 1301 notes by npub. Settings copies a ready-made prompt. |

## Removed (git history only)

Supabase, in-app rewards, the wallet and zaps, social feed, clubs, events, seasons, leaderboards, kind 1 posts and share cards, music, saved routes, WoT score, anti-cheat requests, Apple sign-in, and walking/cycling/hiking trackers. Rewards, where they exist, are paid by the external zapper from public 1301 notes and are not part of the app.

## Deferred, not abandoned

- **NIP-46 bunker login.** No code exists yet. It is the one real gap in "sign in with Nostr" on iOS, where the only option today is pasting an nsec. When it ships, the login screen leads with a signer.
- **Split voice announcement fix.** A known bug, tracked separately.

## Known limitations

- **Archival relay coverage is unresolved.** Backfill runs against `relay.damus.io`, `nos.lol`, and `relay.primal.net` only; recovery of long-past 1301s is best-effort. `relay.nostr.band` is excluded because it stalls the iOS Simulator.
- **A foreign 1301 note can import one duplicate**, once, if it lacks a `workout_start_time` tag.
- **The agent sees only published runs.** Runs saved on the device but never published are invisible to it by design.

## Direction

- Keep cutting: code that is loaded but serves nothing the user can reach (see CLAUDE.md "Known leftovers").
- NIP-46 bunker login.
- Resolve relay coverage.
