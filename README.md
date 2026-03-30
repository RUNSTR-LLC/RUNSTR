# RUNSTR

**Fitness rewards, your way.**

RUNSTR is a fitness app that turns everyday workouts into a rewarding social experience. Work out, earn rewards, compete on leaderboards, and connect with a fitness community — all built on the Nostr protocol with privacy at its core. Choose where your rewards go: your wallet, a charity, an open source project, or AI credits.

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

1. **Tap Start** — No account, no email, no sign-up form. A Nostr identity is created for you automatically.
2. **Pick your destination** — Choose where rewards go (your wallet, a charity, a project, or AI credits)
3. **Work out** — Use RUNSTR's GPS tracker or any app connected to Apple Health / Health Connect
4. **Earn rewards** — Qualifying workouts automatically trigger sponsor-funded rewards
5. **Compete** — Your workouts enter daily leaderboards and virtual competitions
6. **Share** — Post achievements to the social feed and zap fellow athletes

Works in the background. Earn rewards without ever opening the app.

---

## Core Features

### Competitions
Daily leaderboards (5K, 10K, Half Marathon, Marathon, Steps), featured events, and captain-created Fitness Club competitions. Your workouts automatically qualify — no opt-in required.

### Rewards Your Way
Choose one destination for all your rewards: a charity (ALS Network, HRF, and 15+ more), an open source project (Bitcoin Beach, Bitcoin Ekasi), a service (PPQ.AI for AI credits), or your own wallet. Change anytime. Spin the daily lottery wheel for bonus rewards with a multiplier that grows with your level.

### Social Feed & Zaps
Share your workout achievements as Nostr events with generated achievement cards. Browse a chronological feed of fitness notes from the community. Zap other athletes directly from the feed to show support.

### Fitness Clubs
Create or join clubs with member leaderboards, real-time chat, and captain-hosted events. Club chat supports pinned messages and automatic workout sharing. Captains earn rewards for each club member workout.

### Works With Everything
Any device or app connected to Apple Health or Health Connect syncs automatically. Strava, Nike Run Club, Garmin, Apple Watch, Fitbit, Google Fit — whatever you already use.

### Track More Than Running
Four activity categories: Cardio (run, walk, cycle, hike with GPS), Strength (pushups, pull-ups, sit-ups, squats, curls, bench), Wellness (meditation, breathwork, body scan, gratitude), and Mindfulness (journal, habits).

### Sponsor-Funded Rewards
Rewards are funded by sponsors, not RUNSTR. The Rewards page and push notifications show sponsor attribution — "You received a reward from [Sponsor] for your workout."

---

## Privacy & Security

Privacy is a core principle, not an afterthought.

- **No personal information required** — No email, no phone number, no real name needed to join or earn rewards
- **Your keys, your data** — Your identity is a Nostr keypair stored securely on your device, never transmitted
- **Encrypted backups** — Workout history is encrypted and backed up to Nostr relays using NIP-44. Only you can decrypt it.
- **GPS stays on your phone** — GPS coordinates are never stored in any database
- **Private mode** — Work out completely privately with all data saved only on your device, never sent to any backend
- **Open source** — The entire codebase is public and auditable

---

## Built on Nostr

RUNSTR uses Nostr as its identity and social backbone. Create a new Nostr identity on sign-up or log in with an existing one. Your profile, social posts, and encrypted workout backups all flow through Nostr. If you already use Damus, Amethyst, or any other Nostr client, your profile works in RUNSTR too.

---

## Development

RUNSTR is open source and welcomes contributions.

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

### Documentation
- [North Star.md](./North%20Star.md) — Product identity and direction
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture
- [CLAUDE.md](./CLAUDE.md) — Development context
- [book/](./book/) — The RUNSTR Book

---

## Community

- **Website**: [runstr.club](https://www.runstr.club/)
- **GitHub Issues**: Bug reports and feature requests welcome

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**RUNSTR** — Fitness rewards, your way.
