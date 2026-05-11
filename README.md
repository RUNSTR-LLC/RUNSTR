# RUNSTR

**Cardio. Social. Rewards.**

RUNSTR is a cardio workout companion. Track your runs, walks, cycles, and hikes — or let them flow in passively from any device or app on Apple Health or Health Connect. Share your workouts, join captain-created events, and earn rewards for every workout you complete.

[![Website](https://img.shields.io/badge/Website-runstr.club-blue)](https://www.runstr.club/)
[![iOS](https://img.shields.io/badge/iOS-App%20Store-black)](https://apps.apple.com/app/runstr)
[![Android](https://img.shields.io/badge/Android-Zap.Store-green)](https://zap.store/)

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
2. **Drop in a lightning address** — Or skip the field entirely if your Nostr profile already has one
3. **Work out** — Use RUNSTR's GPS tracker, or any app connected to Apple Health / Health Connect
4. **Earn rewards** — Every cardio workout earns a daily reward, sent to your lightning address
5. **Level up** — Streaks raise your level. Place in events for extra rewards.

Works in the background. Earn rewards without ever opening the app.

---

## Core Features

### Three Pillars: Workouts, Social, Rewards

RUNSTR is built around a single loop — you do a cardio workout, you share it, you earn a reward. Everything else is supporting scaffolding.

### Cardio Tracking

Four activities, all GPS-tracked with real-time pace, distance, elevation, and per-kilometer splits:
- **Run**
- **Walk**
- **Cycle**
- **Hike**

### Works With Everything

Any device or app connected to Apple Health or Health Connect syncs automatically — Strava, Nike Run Club, Garmin, Apple Watch, Fitbit, Google Fit. On iOS, HealthKit background delivery wakes the app when a new workout appears. On Android, Health Connect syncs every fifteen minutes.

### Rewards to Your Lightning Address

Every completed cardio workout earns a daily reward. Placing in an event — whether the always-on daily leaderboard or a captain-created club event — earns extra. Rewards are sent via LNURL to the lightning address on file.

If your Nostr profile has a lightning address attached, RUNSTR uses that by default — most users never have to fill in a field. There's no destination picker, no splits, no routing logic. The address is the address.

### Events

Daily leaderboards track the fastest 5K, 10K, Half Marathon, and Marathon times alongside daily steps — always active, updated in real time. Captains create club events from templates and all club members are automatically entered. Moving toward user-created events.

### Social Feed

A fitness-first social feed. Like, repost, comment, and zap on workout posts. Share your own workouts to the network.

### Fitness Clubs

Create a club with a dedicated page, real-time chat, and captain-hosted events. Club events use templates (5K, 10K, step challenge) and auto-enter all members. Captains earn rewards when their members work out.

### Privacy by Default

No email, no phone number, no real name required. Your identity is a cryptographic keypair on your device. Workout data stays local with encrypted backups. Private Mode lets you track without participating in any networked features.

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo + TypeScript |
| Data Store | Supabase (workouts, events, leaderboards, rewards, clubs) |
| Identity | Nostr via NDK (auth, profiles, encrypted backups) |
| Rewards | LNURL protocol, routed to the user's lightning address |
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

**RUNSTR** — Cardio. Social. Rewards.
