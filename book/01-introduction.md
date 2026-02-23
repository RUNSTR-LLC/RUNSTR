# Chapter 1: Introduction

## What is RUNSTR?

RUNSTR is a fitness app that enters your workouts into virtual competitions and rewards you for working out. It doesn't matter if you're a marathon runner or someone who takes a walk after dinner — every workout counts. You choose where your rewards go: to your wallet, to a charity, to an open source project, or converted into AI credits. RUNSTR gives you rewards the way you want them.

### Core Value Proposition
**Fitness rewards, your way.**

Your workouts automatically enter daily leaderboards and virtual competitions. Qualifying workouts earn sponsor-funded rewards sent to whatever destination you choose. Works in the background with any fitness app you already use.

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

RUNSTR is built around competitions and rewards:

### Competitions
Your workouts automatically enter virtual competitions. A built-in daily leaderboard tracks the fastest 5K, 10K, half marathon, and marathon times alongside a daily steps ranking. Featured events run on Supabase with their own leaderboards. Fitness Club captains host events for their members.

**Key Features:**
- Daily leaderboard (5K, 10K, Half Marathon, Marathon, Steps) — always active, no join required
- Featured events with leaderboards (Season II, Einundzwanzig, Running Bitcoin)
- Fitness Club competitions created by captains from templates
- Works with background-synced workouts — no need to open the app

### Rewards
Qualifying workouts earn rewards funded by sponsors. You choose ONE destination for all your rewards — a charity, an open source project, a service like PPQ.AI for AI credits, or your own wallet. Change your destination anytime.

**Key Features:**
- Sponsor-funded rewards (Zapvertising) — attributed on Rewards page and push notifications
- 20+ reward destinations: charities, projects, services, or yourself
- Subscriber boost: Supporter and Pro tiers earn significantly more per workout
- Silent failure — rewards never block workout saving

### Workouts
Track your fitness using RUNSTR's built-in trackers or any app connected to Apple Health or Health Connect. Four activity categories across a swipeable grid:

| Category | Activities |
|----------|-----------|
| **Cardio** | Running, Walking, Cycling, Hiking (GPS tracking) |
| **Strength** | Pushups, Pull-ups, Sit-ups, Squats, Curls, Bench |
| **Wellness** | Guided meditation, Unguided, Breathwork, Body Scan, Gratitude |
| **Mindfulness** | Journal, Habits |

**Key Features:**
- GPS tracking with real-time pace, distance, elevation, and per-km splits
- HealthKit (iOS), Health Connect (Android), Garmin background sync
- Auto-submit to Supabase for competitions (all cardio workouts)
- Passive earning — work out with any connected app and rewards happen automatically

### Fitness Clubs
Pro subscribers create Fitness Clubs — a dedicated page with member leaderboard, real-time chat, and captain-hosted events. Captains earn rewards for each club member workout.

**Key Features:**
- Club page with leaderboard, chat, and events
- Captains create competitions from templates (5K, 10K, Half Marathon, Step Challenge)
- 7-day cooldown on leaving/switching clubs
- Direction: NWC wallets for captain-managed reward pools and prize pools

---

## Target Market

### Everyone
RUNSTR is designed for anyone who moves — from marathon runners to evening walkers. The app doesn't advertise underlying technology. It uses "rewards", "micro donations", and "AI credits" — never jargon.

### How Users Find RUNSTR
- Fitness communities and word of mouth
- In-person events (5K races, community runs)
- App Store / Zap.Store discovery
- Social sharing of workout achievements

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

### Global NDK Instance

Nostr operations (profile sync, social posting, encrypted backup) use a single global NDK instance (`GlobalNDKService`):
- Reduces WebSocket connections by 90%
- Maintains persistent relay connections
- 4 relays: damus, primal, nos.lol, nostr.band

```typescript
// Usage pattern throughout the app
import { GlobalNDKService } from '../services/nostr/GlobalNDKService';

const ndk = await GlobalNDKService.getInstance();
const events = await ndk.fetchEvents(filter);
```

### Three-Tab Navigation

| Tab | Purpose | Key Actions |
|-----|---------|-------------|
| **Profile** | User dashboard | Start Workout, View History, Join Events, Settings |
| **Clubs** | Fitness Clubs | Browse/join clubs, chat, club events |
| **Rewards** | Reward management | View earnings, sponsor info, change destination |

---

## Key Files

### Entry Points
- `src/App.tsx` — Main app component
- `src/navigation/AppNavigator.tsx` — Navigation setup
- `src/navigation/BottomTabNavigator.tsx` — Tab bar

### Core Services
- `src/services/nostr/GlobalNDKService.ts` — Nostr connection (single instance)
- `src/services/fitness/LocalWorkoutStorageService.ts` — Local workout storage
- `src/services/rewards/DailyRewardService.ts` — Per-workout reward eligibility
- `src/services/rewards/SupabaseRewardService.ts` — Verified payment tracking

### Authentication
- `src/contexts/AuthContext.tsx` — Auth state
- `src/services/auth/authService.ts` — Login flow (anonymous-first + optional nsec)

---

## What This Book Covers

This book documents what RUNSTR **is and should be** — the architecture that keeps the app simple, focused, and aligned with its identity as a fitness company that hosts competitions and rewards people for moving.

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
