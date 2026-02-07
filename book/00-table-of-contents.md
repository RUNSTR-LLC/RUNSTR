# RUNSTR Book - Table of Contents

**Version:** 2.0.0
**Last Updated:** January 2026

---

## Introduction

| Chapter | Title | Description |
|---------|-------|-------------|
| 01 | [Introduction](./01-introduction.md) | RUNSTR as a fitness event company, three pillars, architecture overview |

---

## Part 1: Workouts

| Chapter | Title | Description |
|---------|-------|-------------|
| 02 | [Workouts Overview](./02-workouts-overview.md) | What workouts are, activity categories, health integrations |
| 03 | [Workout Tracking](./03-workouts-tracking.md) | GPS tracking, manual entry, real-time metrics |
| 04 | [Workout Data Model](./04-workouts-data-model.md) | Kind 1301 Nostr events, tag format, activity types |
| 05 | [Workout Storage & Publishing](./05-workouts-storage.md) | Local storage, health sync, Nostr publishing |

---

## Part 2: Events

| Chapter | Title | Description |
|---------|-------|-------------|
| 06 | [Events Overview](./06-events-overview.md) | What events are, virtual competitions, prize pools |
| 07 | [In-Person Events & Business Model](./07-in-person-events.md) | Meatspace races, sponsorship strategy, scaling to 100+ events |
| 08 | [Joining Events](./08-events-joining.md) | Supabase participant tracking, join flow |
| 09 | [Event Leaderboards](./09-events-leaderboards.md) | Leaderboard calculation, Running/Walking/Cycling tabs |

---

## Part 3: Rewards

| Chapter | Title | Description |
|---------|-------|-------------|
| 10 | [Rewards Overview](./10-rewards-overview.md) | Fitness = Bitcoin philosophy, reward types, charity integration |
| 11 | [Daily & Step Rewards](./11-rewards-daily-step.md) | 50 sats/workout, 5 sats/1k steps, streaks |
| 12 | [Lightning Address Delivery](./12-rewards-lightning-address.md) | No NWC, LNURL protocol, reward delivery |
| 13 | [Teams & Charities](./13-rewards-teams-charities.md) | Teams = Charities, reward routing, zap button |
| 14 | [Encrypted Backup](./14-encrypted-backup.md) | Kind 30078, NIP-44 self-encryption, gzip compression |

---

## Conclusion & Reference

| Chapter | Title | Description |
|---------|-------|-------------|
| 15 | [Conclusion](./15-conclusion.md) | RUNSTR's value, simplicity principle, future vision |
| 16 | [Appendix: Nostr Events](./16-appendix-nostr-events.md) | Kind 1301 spec, tag examples, relay config |

---

## Quick Reference

### Core Concepts
- **Fitness Event Company** - RUNSTR operates virtual and in-person fitness competitions
- **Three Pillars** - Workouts, Events, Rewards
- **Teams = Charities** - Users select one team/charity to support
- **Rewards** - 50 sats per daily workout, 5 sats per 1k steps
- **Lightning Address** - Users enter their address to receive rewards
- **Encrypted Backup** - Kind 30078 NIP-44 encrypted backup/restore via Nostr relays
- **In-Person Events** - 5K races with sponsorships, scaling nationwide

### Key Services
| Service | Purpose | Chapter |
|---------|---------|---------|
| `WorkoutEventStore` | Workout cache | 02-05 |
| `DailyRewardService` | 50 sats/workout | 10-11 |
| `StepRewardService` | 5 sats/1k steps | 10-11 |
| `BackupService` | Encrypted backup (kind 30078) | 14 |
| `SupabaseCompetitionService` | Event leaderboards | 09 |

### Navigation
- **Profile Tab** - Start Workout, View History, Join Events
- **Teams Tab** - Select charity to support
- **Rewards Tab** - Total rewards, earnings history, settings
