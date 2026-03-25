# RUNSTR Book - Table of Contents

**Version:** 4.0.0
**Last Updated:** March 2026

**Aggregate workouts, earn rewards.**

---

## Introduction

| Chapter | Title | Description |
|---------|-------|-------------|
| 01 | [Introduction](./01-introduction.md) | Core loop, aggregation + rewards model, three audiences, business model |

---

## Part 1: Workouts

| Chapter | Title | Description |
|---------|-------|-------------|
| 02 | [Workouts Overview](./02-workouts-overview.md) | What workouts are, activity categories, health integrations |
| 03 | [Workout Tracking](./03-workouts-tracking.md) | GPS tracking, manual entry, real-time metrics, camera verification |
| 04 | [Workout Data Model](./04-workouts-data-model.md) | Kind 1301 Nostr events, tag format, activity types |
| 05 | [Workout Storage & Publishing](./05-workouts-storage.md) | Local storage, health sync, Supabase submission |

---

## Part 2: Competitions

| Chapter | Title | Description |
|---------|-------|-------------|
| 06 | [Events Overview](./06-events-overview.md) | What competitions are, virtual events, prize pools |
| 07 | [In-Person Events & Business Model](./07-in-person-events.md) | Meatspace races, sponsorship strategy, Zapvertising |
| 08 | [Joining Events](./08-events-joining.md) | Supabase participant tracking, join flow |
| 09 | [Event Leaderboards](./09-events-leaderboards.md) | Daily leaderboards, featured events, Fitness Club events |

---

## Part 3: Rewards

| Chapter | Title | Description |
|---------|-------|-------------|
| 10 | [Rewards Overview](./10-rewards-overview.md) | Sponsor-funded rewards, reward destinations, how rewards work |
| 11 | [Daily & Step Rewards](./11-rewards-daily-step.md) | Per-workout rewards, step rewards, daily wheel, levels |
| 12 | [Lightning Address Delivery](./12-rewards-lightning-address.md) | LNURL protocol, reward delivery |
| 13 | [Reward Destinations](./13-rewards-teams-charities.md) | Charities, projects, services, self — choosing where rewards go |
| 14 | [Encrypted Backup](./14-encrypted-backup.md) | Kind 30078, NIP-44 self-encryption, gzip compression |

---

## Conclusion & Reference

| Chapter | Title | Description |
|---------|-------|-------------|
| 15 | [Conclusion](./15-conclusion.md) | Core loop, simplicity principle, future direction, final form |
| 16 | [Appendix: Nostr Events](./16-appendix-nostr-events.md) | Kind 1301 spec, tag examples, relay config |

---

## Quick Reference

### The Core Loop
```
Aggregate workouts → Earn rewards → Compete in events → Level up → Repeat
```

### Core Concepts
- **Fitness data aggregator** — Pull workouts from any source into one place
- **Rewards your way** — Users choose ONE destination: a charity, a project, AI credits, or themselves
- **Levels that matter** — Consistency multiplies daily wheel payouts
- **Sponsor-funded** — Rewards come from sponsors (Zapvertising), not RUNSTR
- **Background sync** — Works with any HealthKit/Health Connect app. Earn rewards without opening the app
- **Fitness Clubs** — Pro subscribers create clubs with leaderboards, chat, and captain-hosted events
- **Captain economies** — Captains earn from member workouts and event participation
- **Invisible technology** — Users see rewards, not protocols

### Three Audiences
| Audience | What They See |
|----------|--------------|
| Fitness enthusiasts | Workout aggregator with rewards and competitions |
| Bitcoin/Nostr community | Circular economy, anonymous tracking, decentralized data |
| AI-forward users | Earn AI credits, give agent fitness context |

### Key Services
| Service | Purpose | Chapter |
|---------|---------|---------|
| `LocalWorkoutStorageService` | Local workout storage | 02-05 |
| `SupabaseCompetitionService` | Workout submission, leaderboards | 08-09 |
| `DailyRewardService` | Per-workout reward eligibility | 10-11 |
| `SupabaseRewardService` | Verified payment tracking | 10-11 |
| `RewardPollingService` | In-app reward notifications | 10-11 |
| `BackupService` | Encrypted backup (kind 30078) | 14 |
| `PoseDetectionService` | Camera-verified strength reps | 03 |

### Navigation
- **Profile Tab** — Start Workout, View History, Level & Wheel, Settings
- **Clubs Tab** — Browse/join Fitness Clubs, club chat, club events
- **Rewards Tab** — Reward pool, sponsor attribution, earnings, reward destination
