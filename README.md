# RUNSTR

**Aggregate workouts, earn rewards.**

RUNSTR pulls in your workouts from any fitness app or wearable and rewards you for staying active. You choose where your rewards go — a charity, AI credits, or your own wallet. Join competitions, level up, and spin the daily wheel for bonus rewards.

[![Website](https://img.shields.io/badge/Website-runstr.club-blue)](https://www.runstr.club/)
[![iOS](https://img.shields.io/badge/iOS-App%20Store-black)](https://apps.apple.com/app/runstr)
[![Android](https://img.shields.io/badge/Android-Zap.Store-green)](https://zapstore.dev/)

---

## Download

| Platform | Link |
|----------|------|
| Website | [runstr.club](https://www.runstr.club/) |
| iOS | [App Store](https://apps.apple.com/app/runstr) |
| Android | [Zap.Store](https://zap.store/) |

---

## How It Works

1. **Tap Start** — No account, no email, no sign-up form
2. **Pick a destination** — Choose where rewards go (your wallet, a charity, a project, or AI credits)
3. **Work out** — Use RUNSTR's GPS tracker, rep counter, or any app connected to Apple Health / Health Connect
4. **Earn rewards** — Qualifying workouts trigger sponsor-funded rewards sent to your chosen destination
5. **Level up** — More workouts = higher level = better daily wheel payouts

Works in the background. Earn rewards without ever opening the app.

---

## Core Features

### Works With Everything
Any device or app connected to Apple Health or Health Connect syncs automatically — Strava, Nike Run Club, Garmin, Apple Watch, Fitbit, Google Fit. On iOS, HealthKit background delivery wakes the app when a new workout appears. On Android, Health Connect syncs every fifteen minutes.

### Track More Than Running
Four activity categories across a swipeable grid:
- **Cardio** — Run, walk, cycle, hike with real-time GPS (pace, distance, elevation, splits)
- **Strength** — Pushups, pull-ups, sit-ups, squats, curls, bench with rep/set counting
- **Wellness** — Guided meditation, unguided, breathwork, body scan, gratitude
- **Mindfulness** — Journal, habits

### Rewards Your Way
Choose one destination for all your rewards. 20+ options across four categories:
- **Charities** — ALS Network, Human Rights Foundation, Bitcoin Veterans, and more
- **Projects** — Bitcoin Beach, Bitcoin Ekasi, Bitcoin Isla, Bitcoin Bay
- **Services** — PPQ.AI (rewards become AI credits)
- **Yourself** — Sent directly to your wallet

Change your destination anytime. No splits, no pressure.

### Competitions
Daily leaderboards track the fastest 5K, 10K, half marathon, and full marathon times alongside daily steps — always active, updated in real time. Featured events run on schedules with distance challenges, streak competitions, and team-based races. Club captains create events from templates and all club members are automatically entered.

### Daily Wheel
Spin the lottery wheel after qualifying workouts. Your RUNSTR level determines the reward multiplier — the more you work out, the higher your level, the better the payouts.

### Social Feed
A fitness-first social feed. Like, repost, and comment on workout posts. Share your own workouts to the network.

### Fitness Clubs
Create a club with a dedicated page, real-time chat, and captain-hosted events. Club events use templates (5K, 10K, step challenge) and auto-enter all members.

### Sponsor-Funded (Zapvertising)
Rewards are funded by sponsors, not RUNSTR. The Rewards page and push notifications show sponsor attribution — "You received a reward from [Sponsor] for your workout." Sustainable without selling user data.

### Privacy by Default
No email, no phone number, no real name required. Your identity is a cryptographic keypair on your device. Workout data stays local with encrypted backups. Private Mode lets you track without participating in any networked features.

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo + TypeScript |
| Data Store | Supabase (workouts, competitions, leaderboards, rewards, clubs) |
| Identity | Nostr via NDK (auth, profiles, encrypted backups) |
| Rewards | LNURL protocol, sponsor-funded, routed to chosen destination |
| Health Sync | Apple HealthKit (background delivery), Google Health Connect (periodic) |
| State | Zustand + AsyncStorage (local-first, cache-first) |

---

## Development

```bash
git clone https://github.com/RUNSTR-LLC/RUNSTR.git
cd RUNSTR
npm install --legacy-peer-deps
npx expo start         # Start Metro bundler
npm run typecheck      # TypeScript validation
npm run lint           # Code linting
```

iOS builds require Xcode — open `ios/RUNSTR.xcworkspace` and build from there. Do not use `npx expo start --ios`.

### Project Structure
```
src/
├── components/     # UI components (<500 lines each)
├── screens/        # App screens
├── services/       # Business logic & integrations
├── store/          # Zustand state management
├── types/          # TypeScript definitions
└── utils/          # Helper functions
```

### Documentation
- [North Star.md](./docs/North%20Star.md) — Product identity and direction
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System architecture
- [book/](./book/) — The RUNSTR Book

---

## Business Model

| Revenue Stream | How |
|---|---|
| Sponsorships | Zapvertising — branded reward attribution on Rewards page and push notifications |
| Ticket sales | In-person and virtual event entry fees |

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- Maximum 500 lines per file
- TypeScript compilation required before PR merge
- All features use live data, no mocks

---

## Community

- **Website**: [runstr.club](https://www.runstr.club/)
- **GitHub Issues**: Bug reports and feature requests welcome

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**RUNSTR** — Aggregate workouts, earn rewards.
