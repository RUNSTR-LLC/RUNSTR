# ⚡ RUNSTR Rewards

**Bitcoin-powered fitness competitions on Nostr protocol**

The first fitness competition platform that combines the decentralized power of Nostr with real Bitcoin rewards through the Lightning Network. Built entirely on the Nostr protocol, every workout, team membership, and competition exists as permanent, user-owned data that no company can delete or monetize without your permission.

![RUNSTR Rewards](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React Native](https://img.shields.io/badge/React%20Native-0.79.5-blue)
![Nostr Protocol](https://img.shields.io/badge/Nostr-Protocol-purple)
![Lightning Network](https://img.shields.io/badge/Lightning-Network-orange)

## 🌟 Bitcoin & Nostr: The Future of Fitness Competition

**Paragraph 1: Bitcoin & Nostr Core Value Proposition**
RUNSTR Rewards is the first fitness competition platform that combines the decentralized power of Nostr with real Bitcoin rewards through the Lightning Network. Built entirely on the Nostr protocol, every workout, team membership, and competition exists as permanent, user-owned data that no company can delete or monetize without your permission. Team captains create fitness competitions with Bitcoin entry fees that build real prize pools, automatically distributed to winners via Lightning payments. This creates the world's first truly decentralized fitness economy where your dedication to health directly translates into Bitcoin earnings, all while maintaining complete sovereignty over your fitness data.

**Paragraph 2: Nostr-Native Competition System**
The platform leverages Nostr's event-driven architecture to create transparent, verifiable fitness competitions that operate without any central authority. Teams exist as Nostr lists (Kind 30000), competitions as parameterized events (Kind 31013), and workout submissions as structured fitness data (Kind 1301). This means every leaderboard position, every workout entry, and every Bitcoin payout is cryptographically signed and permanently recorded on the Nostr network. Users can authenticate directly with their Nostr keys (nsec) for full protocol access, or use Apple Sign-In which automatically generates a Nostr keypair behind the scenes, making Web3 fitness accessible to everyone regardless of technical expertise.

**Paragraph 3: Bitcoin-Incentivized Fitness Ecosystem**
RUNSTR Rewards transforms fitness from a personal journey into a profitable competitive sport through Bitcoin micropayments on the Lightning Network. Captains set competition entry fees in sats, creating prize pools that motivate genuine participation. Whether it's a weekend 5K challenge, a month-long consistency league, or a team-vs-team cycling event, every competition has real monetary stakes that drive accountability. Winners receive instant Lightning payments directly to their wallets - no intermediaries, no withdrawal fees, no waiting periods. This direct peer-to-peer reward system ensures that fitness achievements translate immediately into Bitcoin earnings.

**Paragraph 4: Unified Fitness Data with Nostr Publishing**
While RUNSTR Rewards aggregates workouts from any Apple HealthKit-compatible app into local storage, the real power comes from selective Nostr publishing. Users maintain complete control over their fitness data, choosing when to convert private workouts into competitive entries. Post workouts as Kind 1 events to share achievements with your Nostr social network, complete with beautiful achievement cards, or publish as Kind 1301 structured fitness events to enter competitions and climb leaderboards. This hybrid approach respects privacy while enabling participation in the Bitcoin-earning competition ecosystem when users are ready to compete.

**Paragraph 5: Future of Decentralized Fitness**
The roadmap ahead doubles down on Bitcoin and Nostr integration to create new earning opportunities and enhanced competition features. Coming soon: team monetization tools allowing captains to create sponsored competitions with larger Bitcoin prize pools, achievement bounties where users earn sats for hitting fitness milestones, and cross-team league systems with season-long Bitcoin championships. Technical enhancements include Garmin integration for broader device support, Amber wallet authentication for streamlined Nostr login, push notifications for competition updates, and performance optimizations to handle thousands of concurrent competitions. RUNSTR Rewards is building the foundation for a global, decentralized fitness economy where anyone can earn Bitcoin for staying healthy, powered entirely by Nostr's unstoppable protocol.

## ⚡ Core Features

### 🏃‍♂️ **Nostr-Powered Competition System**
- **Decentralized Competitions**: All competitions exist as Nostr events (Kind 31013) with cryptographic verification
- **Bitcoin Prize Pools**: Entry fees in sats create real monetary incentives for participation
- **Transparent Leaderboards**: Every workout submission (Kind 1301) is publicly verifiable on Nostr
- **Team Management**: Teams stored as Nostr lists (Kind 30000) with captain-controlled membership

### 💰 **Bitcoin Integration**
- **Lightning Network Payments**: Instant, peer-to-peer Bitcoin transactions with no intermediaries
- **Entry Fees & Prize Pools**: Captains set Bitcoin entry fees in sats that create real monetary incentives
- **Automatic Payouts**: Winners receive instant Lightning payments directly to their wallets
- **Zero Exit Fees**: No withdrawal fees, no waiting periods - immediate Bitcoin earnings

### 📱 **Multi-App Fitness Aggregation**
- **HealthKit Integration**: Aggregate workouts from any Apple HealthKit-compatible fitness app
- **Unified Storage**: All workouts stored locally with option to publish to Nostr
- **Dual Publishing**: Post as Kind 1 social events or Kind 1301 competition entries
- **Beautiful Social Cards**: Transform workouts into shareable achievement graphics with RUNSTR branding

### 🔐 **Nostr-Native Authentication**
- **Dual Authentication**: Direct Nostr nsec login OR Apple Sign-In (auto-generates Nostr keypair)
- **Automatic Profile Import**: Import existing profile data and workout history from Nostr events
- **Data Portability**: Your fitness data remains permanently accessible across any Nostr client
- **No Registration**: Skip traditional signup flows - use your existing Nostr identity or Apple account

## 🛠 Technical Architecture

### **Decentralized Foundation**
```
Nostr Relays (Damus, Primal, nos.lol)
├── Profile Data (Kind 0 events)
├── Workout Data (Kind 1301 events) 
├── Team Management (Kind 30000/30001 lists)
├── Competition Events (Kind 31013 events)
└── Social Posts (Kind 1 events with beautiful cards)
```

### **Bitcoin Payment Layer**
```
Lightning Network (CoinOS API)
├── Instant Bitcoin transactions
├── Team wallet management
├── Automatic reward distribution
└── Real-time balance tracking
```

### **Mobile Application Stack**
- **Framework**: React Native with Expo for cross-platform deployment
- **Navigation**: React Navigation with bottom tab + modal flows
- **State Management**: Zustand for predictable state updates
- **Fitness Integration**: Apple HealthKit for iOS workout data
- **Real-time Updates**: WebSocket connections to multiple Nostr relays

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- iOS Simulator or physical iOS device
- Expo CLI (`npm install -g @expo/cli`)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/RUNSTR-LLC/RUNSTR-REWARDS.git
cd RUNSTR-REWARDS
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
# iOS (recommended - HealthKit integration available)
npm run ios

# Android 
npm run android

# Development server
npm run start
```

### First Run Setup

1. **Launch the app** - You'll see the RUNSTR Rewards splash screen with Nostr connection status
2. **Authenticate with Nostr** - Enter your nsec private key to import your profile and workout data
3. **Choose your role** - Select "Member" to join teams or "Captain" to create and manage teams
4. **Explore teams** - Browse available fitness teams and join competitions
5. **Start competing** - Log workouts to earn leaderboard points and Bitcoin rewards

## 👨‍💻 Development

### Quality Assurance Commands
```bash
# Type checking
npm run typecheck

# Code linting  
npm run lint

# Run tests
npm test

# Format code
npx prettier --write "src/**/*.{ts,tsx}"
```

### Project Structure
```
src/
├── components/        # UI components (<500 lines each)
│   ├── ui/           # Basic components (Button, Card, Avatar)
│   ├── team/         # Team management components
│   ├── fitness/      # Workout and HealthKit components
│   └── wizards/      # Competition creation flows
├── screens/          # Main application screens
├── services/         # External integrations & business logic
│   ├── auth/         # Nostr authentication
│   ├── nostr/        # Nostr protocol handlers
│   ├── fitness/      # HealthKit & workout processing
│   └── competitions/ # Competition scoring & management
├── navigation/       # App navigation configuration
├── store/           # Zustand state management
├── types/           # TypeScript definitions
└── utils/           # Helper functions
```

### Key Services

**Nostr Integration**
- `NostrRelayManager.ts` - Multi-relay WebSocket connections
- `NostrWorkoutService.ts` - Kind 1301 workout event processing
- `NostrAuthProvider.ts` - Private key authentication and profile import

**Fitness Data**
- `HealthKitService.ts` - Apple Health integration
- `WorkoutMergeService.ts` - Unified HealthKit + Nostr workout display
- `WorkoutCardGenerator.ts` - Social media card creation

**Competition System**  
- `CompetitionWizard.tsx` - Step-by-step competition creation
- `LeaderboardService.ts` - Real-time scoring and ranking
- `RewardDistributionService.ts` - Bitcoin payout automation

**Bitcoin Integration**
- `CoinOSService.ts` - Lightning Network wallet management
- `TeamWalletPermissions.ts` - Captain fund management

## 🎯 User Journeys

### **Member Experience**
1. **Nostr Login** → Auto-import profile and workout history
2. **Team Discovery** → Browse teams across Nostr relays
3. **Join Team** → Instant local membership + captain approval request
4. **Compete** → Log workouts that automatically score in active competitions
5. **Earn Bitcoin** → Receive Lightning Network payouts for winning performances

### **Captain Experience**  
1. **Team Creation** → Set up team profile and Bitcoin wallet
2. **Competition Wizard** → Create events/leagues with custom scoring rules
3. **Member Management** → Approve join requests and manage team membership
4. **Fund Management** → Set entry fees and manage prize pool distribution
5. **Community Building** → Foster team engagement and competition participation

## ⚙️ Configuration

### Environment Variables
Create `.env` file with:
```bash
# CoinOS Lightning Network Integration
EXPO_PUBLIC_COINOS_API_BASE=https://coinos.io/api
EXPO_PUBLIC_RUNSTR_LIGHTNING_ADDRESS=RUNSTR@coinos.io

# Nostr Relay Configuration  
EXPO_PUBLIC_DEFAULT_RELAYS=wss://relay.damus.io,wss://relay.primal.net,wss://nos.lol
```

### Nostr Event Types Used
- **Kind 0**: User profiles and metadata
- **Kind 1**: Social workout posts with achievement cards
- **Kind 1301**: Structured workout data for competition scoring
- **Kind 30000/30001**: Team membership lists
- **Kind 31013**: Competition definitions with wizard parameters
- **Kind 33404**: Team creation and metadata
- **Kind 33406**: Team join requests

## 🔒 Privacy & Security

**Private Key Security**: Your Nostr private key is stored securely using React Native's secure storage and never transmitted to our servers.

**Decentralized Data**: All workout data, team memberships, and competition results are stored as Nostr events across multiple relays - no central database.

**Bitcoin Custody**: Lightning wallet management through CoinOS API with team-based permission controls.

**Data Portability**: Your complete fitness history and social connections are accessible from any Nostr client forever.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code style and standards (500 line limit per file)
- Pull request process
- Issue reporting
- Feature request guidelines

### Development Principles
- **File Size Limit**: Maximum 500 lines per file for maintainability
- **Real Data Only**: No mock implementations - all features use live Nostr data
- **Nostr-First**: Decentralized architecture with user-owned data
- **Quality Assurance**: TypeScript compilation required before any PR merge

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🌐 Community

- **Nostr**: Find us on Nostr relays - npub[your-npub-here]
- **GitHub Issues**: Report bugs and request features
- **Lightning Tips**: Support development via RUNSTR@coinos.io

## 🚧 Development Status

**Current Status**: Production Ready (95% Complete)
- ✅ Nostr authentication and profile import
- ✅ Real-time workout sync from Kind 1301 events  
- ✅ Team discovery and management
- ✅ Competition creation wizards
- ✅ Bitcoin Lightning Network integration
- ✅ Apple HealthKit workout posting
- ✅ Beautiful social workout cards
- ✅ Real-time leaderboards and automatic payouts

**Next Phase**: Platform expansion to Android with Google Fit integration and enhanced social features.

---

**RUNSTR Rewards** - Where fitness meets Bitcoin on the decentralized web ⚡🏃‍♂️₿