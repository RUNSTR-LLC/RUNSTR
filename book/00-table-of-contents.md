# RUNSTR Book - Table of Contents

**Version:** 5.0.0
**Last Updated:** May 2026

**Cardio. Social. Rewards.**

---

## Introduction

| Chapter | Title | Description |
|---------|-------|-------------|
| 00 | [About RUNSTR](./00-about-runstr.md) | External-facing narrative: the three pillars |
| 01 | [Introduction](./01-introduction.md) | Cardio-only focus, the core loop, anonymous-first |

---

## Part 1: Workouts

| Chapter | Title | Description |
|---------|-------|-------------|
| 02 | [Workouts Overview](./02-workouts-overview.md) | What a workout is, the four cardio activities, health integrations |
| 03 | [Workout Tracking](./03-workouts-tracking.md) | GPS tracking, real-time metrics |
| 04 | [Workout Data Model](./04-workouts-data-model.md) | Kind 1301 Nostr events, tag format |
| 05 | [Workout Storage & Publishing](./05-workouts-storage.md) | Local storage, health sync, Supabase submission |

---

## Part 2: Events

| Chapter | Title | Description |
|---------|-------|-------------|
| 06 | [Events Overview](./06-events-overview.md) | Daily leaderboard, club events, direction |
| 08 | [Joining Events](./08-events-joining.md) | Supabase participant tracking, join flow |
| 09 | [Event Leaderboards](./09-events-leaderboards.md) | Daily leaderboards, club event leaderboards |

---

## Part 3: Rewards

| Chapter | Title | Description |
|---------|-------|-------------|
| 10 | [Rewards Overview](./10-rewards-overview.md) | How rewards work, eligibility, lightning address routing |
| 11 | [Daily Rewards & Levels](./11-rewards-daily-step.md) | Per-workout rewards, streaks expressed as level |
| 12 | [Lightning Address Delivery](./12-rewards-lightning-address.md) | LNURL protocol, lud16 default, manual entry |
| 14 | [Encrypted Backup](./14-encrypted-backup.md) | Kind 30078, NIP-44 self-encryption, gzip compression |

---

## Conclusion & Reference

| Chapter | Title | Description |
|---------|-------|-------------|
| 15 | [Conclusion](./15-conclusion.md) | Core loop, simplicity principle, direction |
| 16 | [Appendix: Nostr Events](./16-appendix-nostr-events.md) | Kind 1301 spec, kind 0 profiles, kind 30078 backups |

> Note: Chapter numbers 07 and 13 are intentionally skipped. Chapter 07 (In-Person Events & Business Model) and Chapter 13 (Reward Destinations) were removed in the May 2026 simplification.

---

## Quick Reference

### The Three Pillars
- **Workouts** — Cardio only. Track in-app or sync from Apple Health / Health Connect
- **Social** — Feed, Fitness Clubs, captain-created events
- **Rewards** — Lightning address (defaults to Nostr lud16), no destination picker

### Core Concepts
- **Cardio focus** — Run, Walk, Cycle, Hike. Nothing else.
- **Lightning address** — Pasted in or pulled from Nostr profile. One field, no routing.
- **Level = streak** — A single legible progress number, not a dashboard of metrics.
- **Background sync** — Works with any HealthKit/Health Connect app. Earn without opening the app.
- **Social feed** — Workout posts, zaps, Fitness Clubs.
- **Fitness Clubs** — Captain-run chatrooms and events. Captains earn per member workout.
- **Invisible technology** — Users see rewards, not protocols.

### Key Services
| Service | Purpose | Chapter |
|---------|---------|---------|
| `LocalWorkoutStorageService` | Local workout storage | 02-05 |
| `SupabaseCompetitionService` | Workout submission, leaderboards | 08-09 |
| `DailyRewardService` | Per-workout reward eligibility | 10-11 |
| `SupabaseRewardService` | Verified payment tracking | 10-11 |
| `RewardPollingService` | In-app reward notifications | 10-11 |
| `BackupService` | Encrypted backup (kind 30078) | 14 |

### Navigation
- **Profile Tab** — Start Workout, View History, Level, Settings
- **Social Tab** — Social feed, Fitness Clubs, club chat, club events
- **Events Tab** — Daily leaderboard, club events
