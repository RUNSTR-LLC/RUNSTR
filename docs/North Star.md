# RUNSTR: A Cardio Workout Companion

> This document is the identity and direction reference for RUNSTR. It describes what the app is, how it works, and where it's headed. All other documentation (CLAUDE.md, ARCHITECTURE.md, USER_FLOW.md, the RUNSTR Book) should align with this document.

---

RUNSTR is a cardio workout companion built around three pillars: Workouts, Social, and Rewards. The product has been deliberately narrowed from a broader fitness platform into a focused loop — you do a cardio workout, you share it, you earn a reward. Everything that doesn't serve that loop is either being trimmed away or pushed into the background. The app is opinionated about cardio specifically (running, walking, cycling, hiking), and it treats every other surface in the app as support scaffolding for that core activity.

The Workouts pillar is intentionally permissive about *how* a workout enters the system. Users can track in-app with the GPS-based tracker, or they can never open the tracker at all and let their workouts flow in passively from Apple Health or Health Connect — whatever device or app they already trust to record their runs. The job of RUNSTR is not to be the best tracker on the market; it's to be the layer that turns *any* tracked workout into a social and rewarded one. Workouts also get quietly backed up to Nostr so a user's history is portable and never trapped inside the app.

The Social pillar is where workouts become visible to other people. The Social tab is a single feed that mixes workout posts, events, and Fitness Clubs into one place — there isn't a separate "discover" or "explore" surface. Clubs are the social gravity well: captains run chatrooms and create events for their members, and members get extra rewards on top of their normal daily rewards just for participating. The feed supports zaps, so appreciation flows peer-to-peer alongside the structured rewards from the app itself.

The Rewards pillar is what makes RUNSTR distinct from a generic fitness tracker. Every completed workout earns a daily reward, and placing in an event — whether the always-on daily leaderboard or a captain-created club event — earns extra on top. Payouts go to a lightning address the user provides; if their Nostr profile already has a lightning address attached, RUNSTR uses that by default, so most users never have to fill in a field at all. There's no destination picker, no splits, no routing logic — the address is the address. Captains earn a slice when their members work out, which gives them a real incentive to run an engaged club rather than a dormant one.

Everything else in the app is supporting infrastructure for those three pillars. Streaks are surfaced as the user's level, giving a single legible progress number instead of a dashboard of metrics. Identity is handled through Nostr login, but it's invisible — users see "password" instead of "nsec," and they never have to know the protocol exists to use the app. Push notifications announce rewards as they land. An NWC wallet can be connected for users who want full custody. The through-line for the next phase is restraint: the app should do workouts, social, and rewards extremely well, and resist the urge to grow back into the everything-fitness-app it used to be.

---

## Key Principles

- **Three pillars only** — Workouts, Social, Rewards. Anything that doesn't serve the loop is trimmed.
- **Cardio-only** — Running, walking, cycling, hiking. No strength training, meditation, journaling, or habit tracking.
- **Lightning address, not destinations** — Rewards go to the user's lightning address. If their Nostr profile has a lud16, that's the default; most users never fill in a field.
- **Works in the background** — Any HealthKit or Health Connect compatible app/device syncs automatically. Users earn without opening the app.
- **Events are central** — Daily leaderboard always on. Captains create club events. Moving toward user-created events.
- **Level is the streak** — A single legible progress number, not a dashboard of metrics.
- **Your data, your device** — Workouts stored locally with encrypted Nostr backups.
- **Identity is invisible** — Nostr is the auth layer. Users see "password" not "nsec". They never have to know the protocol exists.
- **Terminology** — Use "rewards" in all user-facing and documentation contexts. Avoid "Bitcoin", "sats", "Lightning", "Nostr" except where technically necessary in code.

## Activities

| Category | Activities |
|----------|-----------|
| **Cardio** | Running, Walking, Cycling, Hiking |

GPS tracking provides real-time pace, distance, elevation, and per-kilometer splits for in-app tracked workouts. Workouts synced from Apple Health or Health Connect carry whatever data the source provided.

## Rewards

| Mechanic | How |
|---|---|
| **Daily reward** | Every completed cardio workout earns a daily reward |
| **Event reward** | Placing in an event (daily leaderboard or club event) earns extra |
| **Captain reward** | Captains earn a slice when their members work out |
| **Destination** | Lightning address provided by the user, defaulting to their Nostr lud16 |

Rewards are sent via LNURL to the user's lightning address. There is no destination picker, no charity routing, no splits — the address is the address. Users who don't have a lud16 on their Nostr profile can paste one into Settings.

## Events

| Type | Notes |
|---|---|
| **Daily leaderboard** | Built-in, always active — fastest 5K, 10K, Half, Marathon, and daily Steps |
| **Club events** | Captains create events for their club; members auto-enter |

"Events" and "competitions" refer to the same concept — use "events" in all user-facing copy.

## Fitness Clubs

Every club has a dedicated page with a member leaderboard, real-time chat, and events. Captains create events from templates, and all club members are automatically entered. Captains earn rewards for each member workout, which makes running an engaged club worthwhile.

## Background Sync

| Platform | Mechanism |
|---|---|
| **iOS** | HealthKit background delivery wakes RUNSTR when a new workout appears |
| **Android** | Health Connect periodic sync every 15 minutes via WorkManager |

Either way, workouts auto-submit to Supabase, auto-trigger reward eligibility, and auto-enter any active club events.

## Direction

- **User-created events** — Moving toward captains and individual users creating their own events
- **Daily leaderboard** stays built-in
- **More event formats** coming
- **Captain economy** — captains already earn rewards per member workout; this is the foundation for club-level dynamics
