# RUNSTR

**Fitness rewards, your way.**

RUNSTR is a fitness app that enters your workouts into virtual competitions and rewards you for working out. Choose where your rewards go — to your wallet, a charity, an open source project, or converted into AI credits.

[![Website](https://img.shields.io/badge/Website-runstr.club-blue)](https://www.runstr.club/)
[![iOS](https://img.shields.io/badge/iOS-App%20Store-black)](https://apps.apple.com/app/runstr)
[![Android](https://img.shields.io/badge/Android-Zap.Store-green)](https://zapstore.dev/)

---

## Download RUNSTR

| Platform | Link |
|----------|------|
| Website | [runstr.club](https://www.runstr.club/) |
| iOS | [App Store](https://apps.apple.com/app/runstr) |
| Android | [Zap.Store](https://zap.store/) |

---

## How It Works

1. **Tap Start** — No account, no email, no sign-up form
2. **Pick your destination** — Choose where rewards go (your wallet, a charity, a project, or AI credits)
3. **Work out** — Use RUNSTR's GPS tracker or any app connected to Apple Health / Health Connect
4. **Earn rewards** — Qualifying workouts automatically trigger sponsor-funded rewards
5. **Compete** — Your workouts enter daily leaderboards and virtual competitions

Works in the background. Earn rewards without ever opening the app.

---

## Core Features

### Competitions
Daily leaderboards (5K, 10K, Half Marathon, Marathon, Steps), featured events, and captain-created Fitness Club competitions. Your workouts automatically qualify — no opt-in required.

### Rewards Your Way
Choose one destination for all your rewards: a charity (ALS Network, HRF, and 15+ more), an open source project (Bitcoin Beach, Bitcoin Ekasi), a service (PPQ.AI for AI credits), or your own wallet. Change anytime.

### Works With Everything
Any device or app connected to Apple Health or Health Connect syncs automatically. Strava, Nike Run Club, Garmin, Apple Watch, Fitbit, Google Fit — whatever you already use.

### Track More Than Running
Four activity categories: Cardio (run, walk, cycle, hike with GPS), Strength (pushups, pull-ups, sit-ups, squats, curls, bench), Wellness (meditation, breathwork, body scan, gratitude), and Mindfulness (journal, habits).

### Fitness Clubs
Pro subscribers create clubs with member leaderboards, real-time chat, and captain-hosted events. Captains earn rewards for each club member workout.

### Sponsor-Funded Rewards
Rewards are funded by sponsors, not RUNSTR. The Rewards page and push notifications show sponsor attribution — "You received a reward from [Sponsor] for your workout."

### Privacy by Default
No email, no phone number, no real name required. Your identity is a cryptographic keypair on your device. Workout data stays local until submitted for competitions. GPS coordinates are never published.

---

## Technical Stack

- **Framework**: React Native + Expo + TypeScript
- **Data Store**: Supabase (workouts, competitions, leaderboards, rewards, clubs)
- **Identity**: Nostr via NDK (authentication, profiles, encrypted backups)
- **Rewards**: LNURL protocol, sponsor-funded, routed to chosen destination
- **Health Sync**: Apple HealthKit (background delivery), Google Health Connect (periodic sync), Garmin
- **State**: Zustand + AsyncStorage (local-first, cache-first)

---

## Development

### Prerequisites
- Node.js 18+
- iOS Simulator or device
- Expo CLI

### Quick Start
```bash
git clone https://github.com/RUNSTR-LLC/RUNSTR.git
cd RUNSTR
npm install
npx expo start
```

### Commands
```bash
npx expo start         # Start Metro bundler (port 8081)
npm run typecheck      # TypeScript validation
npm run lint           # Code linting
```

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
- [North Star.md](./North%20Star.md) — Product identity and direction
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture
- [USER_FLOW.md](./USER_FLOW.md) — User interaction maps
- [CLAUDE.md](./CLAUDE.md) — Development context
- [book/](./book/) — The RUNSTR Book (30 chapters)

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Key principles:**
- Maximum 500 lines per file
- TypeScript compilation required before PR merge
- All features use live data, no mocks

---

## Privacy & Security

- **Your keys, your data**: Private key stored securely on device, never transmitted
- **Local-first**: Workouts live on your device until submitted for competitions
- **Encrypted backups**: Export your data encrypted to Nostr relays (only you can decrypt)
- **No tracking**: No email, no phone, no ad identifiers

---

## Community

- **Website**: [runstr.club](https://www.runstr.club/)
- **GitHub Issues**: Bug reports and feature requests welcome

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**RUNSTR** — Fitness rewards, your way.
