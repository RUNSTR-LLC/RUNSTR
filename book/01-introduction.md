# Chapter 1: Introduction

## What is RUNSTR?

RUNSTR is a cardio workout companion. You complete a workout — run, walk, cycle, or hike — and earn a reward sent directly to your lightning address. Workouts can be tracked in-app via GPS, or they can sync automatically in the background from any device or app connected to Apple Health or Health Connect.

---

## The Core Loop

Everything in RUNSTR serves one loop:

```
Cardio workout → Share it → Earn a reward
```

That's the product. Everything else is supporting scaffolding.

### Workouts In

Workouts enter the system two ways:
- **In-app** — Built-in GPS tracker for running, walking, cycling, and hiking
- **External** — Background sync from Apple Health (iOS) or Health Connect (Android)

The job of RUNSTR is not to be the best tracker on the market. It's to be the layer that turns *any* tracked workout into a social and rewarded one. If you trust Garmin to record your runs, keep using Garmin — RUNSTR picks them up automatically.

### Social Layer

A single Social tab mixes workout posts, events, and Fitness Clubs into one feed. Clubs are captain-run: chat, events, and shared rewards.

### Rewards Out

Every completed cardio workout earns a daily reward. Placing in an event — whether the always-on daily leaderboard or a captain-created club event — earns extra on top. Rewards are sent via LNURL to a lightning address. If your Nostr profile has a lud16, that's the default. Otherwise you paste one into Settings. The address is the address — no destinations, no splits, no routing.

---

## The Three Pillars

| Pillar | What It Is |
|--------|-----------|
| **Workouts** | Cardio tracking (in-app or synced). The only activity category. |
| **Social** | Feed, Fitness Clubs, captain-created events. |
| **Rewards** | Daily rewards to a lightning address. Extra for placing in events. |

These are the only three pillars. If a feature doesn't serve one of them, it doesn't belong in RUNSTR.

---

## Anonymous-First

Getting started takes seconds. Tap Start and you're in — no account, no email, no sign-up form. The experience is the same whether you log in or not.

| Concept | Definition | RUNSTR Approach |
|---------|------------|-----------------|
| **Private** | Data is hidden/protected from everyone | Private Mode available in Settings |
| **Anonymous** | Data may be public, but not tied to real identity | Default experience |

### What This Means

- **No personal information collected** — No email, phone number, or real name required
- **Identity is cryptographic** — Your identity is a key pair stored on your device
- **Workout data stays local** — Until submitted for leaderboards via Supabase
- **GPS coordinates are never published** — Only summary metrics (distance, duration, pace)

### What Gets Submitted (to Supabase for Leaderboards)

When your workout is submitted, these fields are sent:
- Activity type (running, walking, cycling, hiking)
- Distance and duration
- Elevation gain/loss
- Calories burned
- Split times (for running)

### What Never Leaves Your Device

- GPS coordinates or route data
- Your email, phone, or real name (we don't collect them)
- Detailed health metrics beyond workout summaries
- Any data while Private Mode is enabled

### Open Source & Verifiable

RUNSTR is **free open source software** licensed under the MIT License. Anyone can:
- Read the source code to verify these claims
- Audit what data is collected and submitted
- Build and run their own version

---

## How RUNSTR Works

### Workouts

Cardio-only. Four activities:

| Activity | Notes |
|----------|-------|
| Running | GPS, real-time pace, splits, elevation |
| Walking | GPS, distance, steps |
| Cycling | GPS, distance, speed, elevation |
| Hiking | GPS, distance, elevation |

**Key Features:**
- GPS tracking with real-time pace, distance, elevation, and per-km splits
- HealthKit (iOS), Health Connect (Android) background sync — workouts flow in passively
- Auto-submit to Supabase for the daily leaderboard and any active club events
- Passive earning — work out with any connected app and rewards happen automatically

### Rewards

Qualifying cardio workouts earn rewards. Rewards go to a lightning address — if your Nostr profile has a lud16, that's the default; otherwise you paste one in. Change it anytime.

**Key Features:**
- Daily reward per qualifying workout
- Extra rewards for placing in events (daily leaderboard or club event)
- Lightning address routing — defaults to Nostr lud16
- Silent failure — rewards never block workout saving

### Events

Workouts automatically count toward the always-on daily leaderboard (5K, 10K, Half, Marathon, Steps). Club captains can create events from templates and all members auto-enter. Moving toward user-created events.

### Fitness Clubs

Users can create Fitness Clubs — a dedicated page with member leaderboard, real-time chat, and captain-hosted events. Captains earn rewards when their members work out, which makes running an engaged club worthwhile.

---

## Levels

Your level is your streak. A single legible progress number instead of a dashboard of metrics. The more consistently you work out, the higher your level.

There is no separate XP system, no badges, no skill trees — just one number that goes up when you stay consistent.

---

## Business Model

Rewards are funded by RUNSTR. There are no subscriptions, no charity destination splits, and no sponsorship attribution in the user experience. The reward pool is small and intentional — sporadic outages are acceptable.

---

## Technical Architecture

### Overview

RUNSTR uses a **Supabase-first architecture**:
- **Supabase** — Primary data store for workouts, events, leaderboards, rewards, Fitness Clubs, chat
- **Nostr** — Invisible identity layer: authentication, profile sync, optional social sharing, encrypted backups
- **Lightning** — Reward delivery via LNURL protocol (invisible to users)

### Key Technical Decisions

| Decision | Implementation | Rationale |
|----------|---------------|-----------|
| Authentication | Anonymous-first (tap Start), optional Nostr login | Zero friction onboarding |
| Workout Data | Supabase | Fast queries, reliable storage |
| Kind 1301 | Created locally for structure, submitted to Supabase only | Not published to Nostr relays |
| Events | Supabase | Simple participation tracking, leaderboards |
| Rewards | LNURL to user's lightning address | Universal support |
| Fitness Clubs | Supabase + Realtime | Chat, leaderboards, events |

### Global NDK Instance

Nostr operations (profile sync, social posting, encrypted backup) use a single global NDK instance (`GlobalNDKService`):
- Reduces WebSocket connections by 90%
- Maintains persistent relay connections
- 4 relays: damus, primal, nos.lol, nostr.band

### Three-Tab Navigation

| Tab | Purpose | Key Actions |
|-----|---------|-------------|
| **Profile** | User dashboard | Start Workout, View History, Level, Settings |
| **Social** | Social feed & Fitness Clubs | Social feed, browse/join clubs, chat, club events |
| **Events** | Competitions | Daily leaderboard, club events |

---

## What This Book Covers

This book documents what RUNSTR **is and should be** — the architecture that keeps the app simple, focused, and aligned with the three pillars.

Each chapter covers:
- **Overview Section** — High-level concepts, user experience, philosophy
- **Technical Section** — File paths, function names, implementation details

By reading this book alongside the codebase, you can:
1. Understand how each feature works
2. Identify code that doesn't match the ideal architecture
3. Make informed decisions about refactoring
4. Ensure alignment between developer and AI assistant

**For product identity and direction, see [North Star.md](../docs/North%20Star.md)**

---

## Navigation

**Next:** [Chapter 2: Workouts Overview](./02-workouts-overview.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
