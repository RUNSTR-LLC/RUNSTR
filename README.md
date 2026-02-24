# RUNSTR

**Anonymous fitness tracking meets Bitcoin-powered competitions**

No email. No phone number. No credit card. No account creation. Just tap start, generate a key, and own your data.

[![Website](https://img.shields.io/badge/Website-runstr.club-blue)](https://www.runstr.club/)
[![iOS](https://img.shields.io/badge/iOS-App%20Store-black)](https://apps.apple.com/app/runstr)
[![Android](https://img.shields.io/badge/Android-Zap.Store-green)](https://zap.store/)
[![Nostr](https://img.shields.io/badge/Nostr-Follow%20Us-purple)](https://njump.me/npub1vygzr642y6f8gxcjx6auaf2vd25lyzarpjkwx9kr4y752zy6058s8jvy4e)

---

## Download RUNSTR

| Platform | Link |
|----------|------|
| Website | [runstr.club](https://www.runstr.club/) |
| iOS | [App Store](https://apps.apple.com/app/runstr) |
| Android | [Zap.Store](https://zap.store/) |
| Nostr | `npub1vygzr642y6f8gxcjx6auaf2vd25lyzarpjkwx9kr4y752zy6058s8jvy4e` |

---

## Why RUNSTR?

Traditional fitness apps turn you into a product. They collect your email, phone number, location history, heart rate patterns, sleep schedule, and body weight—then sell it to advertisers.

**RUNSTR knows nothing about you.**

- Your identity is a cryptographic keypair generated on your device
- Your workout data stays on your phone until you choose to share it
- Your Apple Watch, Garmin, and Fitbit data belongs to you, not to cloud servers
- Earn real Bitcoin in competitions, not worthless points

---

## Core Features

### Zero-Identity Onboarding
Tap "Start" and you're in. Your identity is a Nostr keypair you control—no email verification, no phone confirmation, no password managers. For Bitcoiners without Nostr accounts, we auto-generate keys with backup instructions.

### Wearable Integration Without Surveillance
RUNSTR pulls workout data from HealthKit and other fitness apps, then lets you decide what happens next. Push workouts into competitions. Keep them stored locally. Post them to Nostr for decentralized backup. Your fitness data finally belongs to you.

### Bitcoin-Powered Competitions
Your daily workout becomes a lottery ticket for satoshis. Join competitions where completing workouts makes you eligible for Bitcoin rewards. Appear on leaderboards and get zapped by community members impressed by your performance. Real money, real athletes, Lightning-fast payments.

### Season II: The Distance Challenge
**Live now**: A 2-month distance competition with a **1,000,000 satoshi prize pool**. Log your runs, walks, hikes, and cycling sessions to climb the leaderboard. Top performers split the pot. Anonymous athletes from around the world competing for Bitcoin using nothing but movement and commitment.

### Support Charities Through Fitness
Select a team (charity) to support—Bitcoin Bay, Bitcoin Ekasi, ALS Network, and more. Split a percentage of your workout rewards with your chosen charity, or zap them directly from any Lightning wallet.

### Local-First, Publish-Second
Every workout lives on your device first. RUNSTR never forces you to upload anything. View your complete training history offline. Then, when you're ready, selectively publish to Nostr for backup, post to competitions for Bitcoin rewards, or share to social media.

---

## How It Works

### For Athletes
1. **Download** → Generate your Nostr identity (or import existing)
2. **Connect** → Link your Apple Watch, Garmin, or other fitness tracker
3. **Train** → Your workouts sync automatically and stay on your device
4. **Compete** → Join competitions to earn Bitcoin rewards
5. **Publish** → Share achievements to Nostr when you want

---

## Technical Architecture

### Decentralized Foundation
All data lives on the Nostr protocol—no central database, no company that can delete your fitness history, no algorithm hiding your achievements.

```
Nostr Relays
├── Profile Data (Kind 0)
├── Workout Records (Kind 1301)
└── Social Posts (Kind 1)
```

### Bitcoin Rewards
Earn satoshis for staying active:
- **50 sats** per daily workout
- **5 sats** per 1,000 steps
- Rewards delivered to your Lightning address via LNURL

### Mobile Stack
- **Framework**: React Native + Expo
- **Fitness**: Apple HealthKit integration
- **State**: Zustand
- **Real-time**: WebSocket connections to multiple Nostr relays

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
npm run ios
```

### Commands
```bash
npm run start          # Development server
npm run ios            # Run on iOS
npm run android        # Run on Android
npm run typecheck      # TypeScript validation
npm run lint           # Code linting
npm test               # Run tests
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

scripts/
├── testing/        # Test scripts
├── diagnostics/    # Debugging tools
└── maintenance/    # Build & audit scripts
```

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Key principles:**
- Maximum 500 lines per file
- No mock data—all features use live Nostr data
- TypeScript compilation required before PR merge

---

## Privacy & Security

- **Your keys, your data**: Nostr private key stored securely on device, never transmitted
- **Decentralized storage**: Workouts exist as Nostr events across relays you choose
- **Lightning rewards**: Receive Bitcoin directly to your Lightning address
- **Full portability**: Export your complete fitness history anytime

---

## Community

- **Website**: [runstr.club](https://www.runstr.club/)
- **Nostr**: [npub1vygzr6...](https://njump.me/npub1vygzr642y6f8gxcjx6auaf2vd25lyzarpjkwx9kr4y752zy6058s8jvy4e)
- **GitHub Issues**: Bug reports and feature requests welcome
- **Lightning Tips**: Support development via Lightning

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**RUNSTR** — Your workout should pay you, not the app developer.
