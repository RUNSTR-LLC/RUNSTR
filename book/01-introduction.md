# Chapter 1: Introduction

## What is RUNSTR?

Aggregate workouts, earn rewards. RUNSTR pulls in your workouts from any fitness app or wearable and rewards you for staying active. You choose where your rewards go — a charity, AI credits, or your own wallet. The more you work out, the more you earn. Join competitions, level up, and spin the daily wheel for bonus rewards. It works in the background — just keep working out and RUNSTR handles the rest.

RUNSTR is a fitness event company with an app that rewards healthy behavior. It monetizes through sponsorships (Zapvertising) and event ticket sales.

### Core Value Proposition
**Aggregate workouts, earn rewards.**

RUNSTR connects to Apple Health and Health Connect to automatically pull in workouts from any app or wearable you already use — or track directly with built-in GPS, rep counting, and wellness timers. Every workout earns rewards that you control.

---

## The Core Loop

Everything in RUNSTR serves one loop:

```
Aggregate workouts → Earn rewards → Compete in events → Level up → Repeat
```

### Aggregation
RUNSTR is a fitness data aggregator. Data comes in two ways:
- **Internal** — Built-in GPS trackers, rep counters, wellness timers, journal
- **External** — Background sync from Apple Health, Health Connect, and connected wearables

The app pulls workouts from across your fitness ecosystem into one place. Users can create encrypted backups of their workout history. Advanced users can give this data to their AI agent for context into their health and fitness.

### Rewards
Rewards are earned in multiple ways:
- **Per-workout rewards** — Complete a qualifying cardio workout and earn 50 sats sent to your chosen destination
- **Competition rewards** — Place on leaderboards in virtual fitness events
- **Lottery wheel** — Spin the RUNSTR wheel for bonus rewards scaled by your level. The more you work out, the higher your level, the better your odds and payouts

RUNSTR can send rewards as micro donations, AI credits (via PPQ.AI), or directly to your wallet. Users choose ONE destination for all rewards and can change it anytime.

### Levels
Your level reflects your fitness consistency. The more workouts you aggregate, the higher your level. Levels aren't just a number — they multiply your daily wheel payouts. This creates a behavioral reinforcement loop: work out consistently, level up, earn more.

---

## Three Things Users Care About

1. **It works with what I already use** — Syncs with any fitness app via Apple Health or Health Connect
2. **I get something for working out** — Rewards for every qualifying workout
3. **I choose what happens with it** — 20+ reward destinations including charities, projects, AI credits, or yourself

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
- **Workout data stays local** — Until submitted for competitions via Supabase
- **GPS coordinates are never published** — Only summary metrics (distance, duration, pace)

### What Gets Submitted (to Supabase for Competitions)

When your workout is submitted for competitions, these fields are sent:
- Activity type (running, walking, cycling, hiking)
- Distance and duration
- Elevation gain/loss
- Calories burned
- Split times (for running)
- Reward destination tag

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
Track your fitness using RUNSTR's built-in trackers or any app connected to Apple Health or Health Connect. Four activity categories:

| Category | Activities |
|----------|-----------|
| **Cardio** | Running, Walking, Cycling, Hiking (GPS tracking) |
| **Strength** | Pushups, Pull-ups, Sit-ups, Squats, Curls, Bench |
| **Wellness** | Guided meditation, Unguided, Breathwork, Body Scan, Gratitude |
| **Mindfulness** | Journal, Habits |

**Key Features:**
- GPS tracking with real-time pace, distance, elevation, and per-km splits
- Camera-verified rep counting for strength exercises (MediaPipe pose detection)
- HealthKit (iOS), Health Connect (Android) background sync
- Auto-submit to Supabase for competitions (all cardio workouts)
- Passive earning — work out with any connected app and rewards happen automatically

### Rewards
Qualifying workouts earn rewards funded by sponsors. You choose ONE destination for all your rewards — a charity, an open source project, a service like PPQ.AI for AI credits, or your own wallet. Change your destination anytime.

**Key Features:**
- Sponsor-funded rewards (Zapvertising) — attributed on Rewards page and push notifications
- 20+ reward destinations: charities, projects, services, or yourself
- Lottery wheel with level-based multiplier — your RUNSTR level reflects workout consistency
- Silent failure — rewards never block workout saving

### Competitions
Your workouts automatically enter virtual competitions. A built-in daily leaderboard tracks the fastest 5K, 10K, half marathon, and marathon times alongside a daily steps ranking. Featured events run on Supabase with their own leaderboards. Fitness Club captains host events for their members.

**Key Features:**
- Daily leaderboard (5K, 10K, Half Marathon, Marathon, Steps) — always active
- Featured events with leaderboards and prize pools
- Fitness Club competitions created by captains
- Captain-created events with optional prize pools and charity payouts
- Works with background-synced workouts — no need to open the app

### Fitness Clubs
Users can create Fitness Clubs — a dedicated page with member leaderboard, real-time chat, and captain-hosted events.

**Key Features:**
- Club page with leaderboard, chat, and events
- Captains create competitions from templates (5K, 10K, Half Marathon, Step Challenge) with optional prize pools and charity payouts
- Direction: NWC wallets for captain-managed reward pools and prize pools (non-custodial)

---

## Three Audiences, One Product

RUNSTR serves three audiences that converge on the same experience:

| Audience | What They See | Underlying Technology |
|----------|--------------|----------------------|
| **Fitness enthusiasts** | Workout aggregator with rewards and competitions | Invisible |
| **Bitcoin/Nostr community** | Circular fitness economy, anonymous tracking, decentralized data | Lightning, Nostr relays |
| **AI-forward users** | Earn AI credits for working out, give agent fitness context | PPQ.AI integration |

The technology stack is deliberately invisible. Users never see "Nostr", "Lightning", or "Bitcoin" — they see "rewards", "micro donations", and "AI credits."

---

## Business Model

RUNSTR is a fitness event company with an app that rewards healthy behavior.

| Revenue Stream | Description |
|---------------|-------------|
| **Sponsorships** | Zapvertising — branded push notifications and rewards page attribution |
| **Event tickets** | In-person and virtual fitness events |

### Monetization Paths for Users
- **Captains** — Create events with prize pools and charity payouts
- **Consistency** — Level system multiplies lottery wheel payouts

---

## Technical Architecture

### Overview

RUNSTR uses a **Supabase-first architecture**:
- **Supabase** — Primary data store for workouts, competitions, leaderboards, rewards, Fitness Clubs, chat
- **Nostr** — Invisible identity layer: authentication, profile sync, optional social sharing, encrypted backups
- **Lightning** — Reward delivery via LNURL protocol (invisible to users)

### Key Technical Decisions

| Decision | Implementation | Rationale |
|----------|---------------|-----------|
| Authentication | Anonymous-first (tap Start), optional Nostr login | Zero friction onboarding |
| Workout Data | Supabase | Fast queries, reliable storage |
| Kind 1301 | Created locally for structure, submitted to Supabase only | Not published to Nostr relays |
| Competitions | Supabase | Simple participation tracking, leaderboards |
| Rewards | LNURL to chosen destination | Universal support, sponsor-funded |
| Fitness Clubs | Supabase + Realtime | Chat, leaderboards, events |
| Pose Detection | MediaPipe (react-native-mediapipe) | Camera-verified strength workouts |

### Global NDK Instance

Nostr operations (profile sync, social posting, encrypted backup) use a single global NDK instance (`GlobalNDKService`):
- Reduces WebSocket connections by 90%
- Maintains persistent relay connections
- 4 relays: damus, primal, nos.lol, nostr.band

### Three-Tab Navigation

| Tab | Purpose | Key Actions |
|-----|---------|-------------|
| **Profile** | User dashboard | Start Workout, View History, Level & Wheel, Settings |
| **Social** | Social feed & Fitness Clubs | Social feed, browse/join clubs, chat, club events |
| **Events** | Competitions | Leaderboards, featured events, competitions |

---

## What This Book Covers

This book documents what RUNSTR **is and should be** — the architecture that keeps the app simple, focused, and aligned with its identity as a fitness event company that rewards people for healthy behavior.

Each chapter covers:
- **Overview Section** — High-level concepts, user experience, philosophy
- **Technical Section** — File paths, function names, implementation details

By reading this book alongside the codebase, you can:
1. Understand how each feature works
2. Identify code that doesn't match the ideal architecture
3. Make informed decisions about refactoring
4. Ensure alignment between developer and AI assistant

**For product identity and direction, see [North Star.md](../North%20Star.md)**

---

## Navigation

**Next:** [Chapter 2: Workouts Overview](./02-workouts-overview.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
