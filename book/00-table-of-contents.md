# RUNSTR Book - Table of Contents

**Version:** 3.0.0
**Last Updated:** February 2026

---

## Introduction

| Chapter | Title | Description |
|---------|-------|-------------|
| 01 | [Introduction](./01-introduction.md) | RUNSTR as a fitness company, competitions + rewards, architecture overview |

---

## Part 1: Workouts

| Chapter | Title | Description |
|---------|-------|-------------|
| 02 | [Workouts Overview](./02-workouts-overview.md) | What workouts are, activity categories, health integrations |
| 03 | [Workout Tracking](./03-workouts-tracking.md) | GPS tracking, manual entry, real-time metrics |
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
| 11 | [Daily & Step Rewards](./11-rewards-daily-step.md) | Per-workout rewards, step rewards, streaks |
| 12 | [Lightning Address Delivery](./12-rewards-lightning-address.md) | LNURL protocol, reward delivery |
| 13 | [Reward Destinations](./13-rewards-teams-charities.md) | Charities, projects, services, self — choosing where rewards go |
| 14 | [Encrypted Backup](./14-encrypted-backup.md) | Kind 30078, NIP-44 self-encryption, gzip compression |

---

## Conclusion & Reference

| Chapter | Title | Description |
|---------|-------|-------------|
| 15 | [Conclusion](./15-conclusion.md) | RUNSTR's value, simplicity principle, future direction |
| 16 | [Appendix: Nostr Events](./16-appendix-nostr-events.md) | Kind 1301 spec, tag examples, relay config |

---

## Quick Reference

### Core Concepts
- **Fitness company** — RUNSTR hosts competitions, builds community through Fitness Clubs, and rewards people for moving
- **Competitions + Rewards** — Workouts enter virtual competitions and earn sponsor-funded rewards
- **Rewards your way** — Users choose ONE destination: a charity, a project, a service, or themselves
- **Sponsor-funded** — Rewards come from sponsors (Zapvertising), not RUNSTR
- **Background sync** — Works with any HealthKit/Health Connect app. Earn rewards without opening the app
- **Fitness Clubs** — Pro subscribers create clubs with leaderboards, chat, and captain-hosted events
- **Encrypted Backup** — Kind 30078 NIP-44 encrypted backup/restore via Nostr relays

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
- **Profile Tab** — Start Workout, View History, Join Events, Settings
- **Clubs Tab** — Browse/join Fitness Clubs, club chat, club events
- **Rewards Tab** — Reward pool, sponsor attribution, earnings, reward destination
