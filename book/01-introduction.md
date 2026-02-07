# Chapter 1: Introduction

## What is RUNSTR?

RUNSTR is a fitness event company that operates both virtual and in-person competitions, rewarding participants with Bitcoin for their fitness activities. The app serves as the digital backbone—tracking workouts, managing event participation, and delivering rewards—while in-person races like the District 5K bring the community together in meatspace.

### Core Value Proposition
**Fitness earns Bitcoin. Events build community.**

Complete your daily workout and earn satoshis (sats). Hit step milestones throughout the day for bonus rewards. Compete in virtual and in-person events for Bitcoin prize pools. Choose to support a charity through your fitness activities.

---

## Anonymous, Not Private

RUNSTR is an **anonymous** fitness tracker, not a private one. This distinction matters:

| Concept | Definition | RUNSTR Approach |
|---------|------------|-----------------|
| **Private** | Data is hidden/protected from everyone | ❌ Not RUNSTR |
| **Anonymous** | Data may be public, but not tied to real identity | ✅ This is RUNSTR |

### What This Means

- **No personal information collected** - No email, phone number, or real name required
- **Workout summaries are public** - When you compete, basic workout data (distance, duration, activity type) is published openly to leaderboards
- **GPS routes stay local** - Only the last 100 GPS points are held in memory for route display; old points are deleted. GPS coordinates are **never published**
- **Identity is cryptographic** - Your identity is a key pair (nsec/npub), not tied to your real-world identity

### What Gets Published (Kind 1301 Events)

When you save a workout to compete on leaderboards, these fields become public:
- Activity type (running, walking, cycling)
- Distance and duration
- Elevation gain/loss
- Calories burned
- Split times (for running)
- Team/charity selection

### What Never Gets Published

- GPS coordinates or route data
- Your email, phone, or real name (we don't have them)
- Detailed health metrics beyond workout summaries

### Open Source & Verifiable

RUNSTR is **free open source software** licensed under the MIT License. Anyone can:
- Read the source code to verify these claims
- Audit what data is collected and published
- Build and run their own version

The code is the proof. Don't trust—verify.

---

## The Three Pillars

RUNSTR is built on three interconnected pillars:

### 1. Workouts
Track your fitness activities using GPS or health sync. Workouts are saved to Supabase for competition tracking and leaderboards. Kind 1301 events are created locally for structure but are not published to Nostr relays.

**Key Features:**
- GPS tracking for Running, Walking, Cycling
- HealthKit (iOS) and Health Connect (Android) sync
- Real-time metrics: pace, distance, elevation, splits
- Auto-submit to Supabase for competitions (all cardio workouts)

### 2. Events
Compete in virtual and in-person fitness competitions with Bitcoin prizes. Virtual events like "RUNSTR Season II" run through the app, while in-person events like the District 5K bring runners together at real-world venues. Events are core to RUNSTR's identity as a fitness event company.

**Key Features:**
- Virtual competitions with leaderboards (Season II, January Walking Contest)
- In-person 5K races with sponsorships and prize pools
- Dual participation: run in-person or virtually from anywhere
- Supabase-based participant tracking

### 3. Rewards
Earn Bitcoin for staying active. The app sends real satoshis to your Lightning address for completing workouts and hitting step milestones. Teams and charities are part of the rewards ecosystem—select a team to support and your fitness activities help fund their mission.

**Key Features:**
- 50 sats per daily workout
- 5 sats per 1,000 steps
- Delivered via Lightning address (LNURL protocol)
- Teams/charities integrated into reward routing
- Silent failure - rewards never block workout saving

---

## Target Market

RUNSTR targets two audiences:

### Bitcoin & Nostr Community (~50,000+ users)
- Already understand private keys (nsec) and public keys (npub)
- Familiar with Lightning Network payments
- Value decentralized protocols and data ownership
- Solve the "cold start problem" with knowledgeable early adopters

### Fitness Enthusiasts (in-person events)
- Runners, walkers, and cyclists looking for race events
- Discover RUNSTR through 5K races and local running communities
- Experience Bitcoin rewards organically without evangelism
- Target mix: 80% regular runners, 20% Bitcoiners

---

## Technical Architecture

### Overview

RUNSTR uses a **Supabase-first architecture**:
- **Supabase** - Primary storage for workouts, event participation, and leaderboards
- **Nostr** - For user authentication (nsec login) and profile sync (kind 0)
- **Lightning** - For reward payments via LNURL

### Key Technical Decisions

| Decision | Implementation | Rationale |
|----------|---------------|-----------|
| Authentication | Nostr (nsec-only) | Decentralized identity |
| Workout Data | Supabase | Fast queries, reliable storage |
| Kind 1301 | Local only | Created for validation, not published |
| Event Joining | Supabase | Simple participation tracking |
| Rewards | Lightning address | Universal wallet support |
| Charity Selection | Teams tab | Simple UX for choosing charity |

### Global NDK Instance

Nostr operations (profile sync, social posting) use a single global NDK instance (`GlobalNDKService`):
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

The app uses a simple three-tab navigation:

| Tab | Purpose | Key Actions |
|-----|---------|-------------|
| **Profile** | User dashboard | Start Workout, View History, Join Events |
| **Teams** | Charity selection | Select team, view all charities, zap |
| **Rewards** | Earnings display | View rewards, earnings history, settings |

---

## Key Files

### Entry Points
- `src/App.tsx` - Main app component
- `src/navigation/AppNavigator.tsx` - Navigation setup
- `src/navigation/BottomTabNavigator.tsx` - Tab bar

### Core Services
- `src/services/nostr/GlobalNDKService.ts` - Nostr connection
- `src/services/fitness/LocalWorkoutStorageService.ts` - Local workout storage
- `src/services/rewards/DailyRewardService.ts` - Daily rewards
### Authentication
- `src/contexts/AuthContext.tsx` - Auth state
- `src/services/auth/authService.ts` - nsec login flow

---

## What This Book Covers

This book documents what RUNSTR **should be** - the idealized architecture that keeps the app simple, focused, and aligned with its core mission as a fitness event company.

Each chapter covers:
- **Overview Section** - High-level concepts, user experience, philosophy
- **Technical Section** - File paths, function names, implementation details

By reading this book alongside the codebase, you can:
1. Understand how each feature works
2. Identify code that doesn't match the ideal architecture
3. Make informed decisions about refactoring
4. Ensure alignment between developer and AI assistant

---

## Navigation

**Next:** [Chapter 2: Workouts Overview](./02-workouts-overview.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
