# ⚡ Zap Arena

**Bitcoin-powered fitness competitions on the decentralized web**

Transform your workouts into competitive, Bitcoin-earning experiences through Nostr-native team competitions. Join fitness teams, participate in captain-created challenges, and earn real Bitcoin rewards while building lasting fitness habits.

![Zap Arena Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React Native](https://img.shields.io/badge/React%20Native-0.79.5-blue)
![Nostr Protocol](https://img.shields.io/badge/Nostr-Protocol-purple)
![Lightning Network](https://img.shields.io/badge/Lightning-Network-orange)

## 🌟 What Makes Zap Arena Different

**Truly Decentralized**: Built on Nostr protocol - your data, workouts, and social connections belong to you forever. No central servers, no vendor lock-in.

**Real Bitcoin Rewards**: Earn actual Lightning Network Bitcoin for fitness achievements. Entry fees create real prize pools distributed automatically to winners.

**Invisible Complexity**: Advanced Web3 technology hidden behind a polished mobile interface. Users focus on fitness, not crypto complexity.

**Network Effects**: Leverage existing Nostr communities - import your profile, workout history, and social connections instantly.

## ⚡ Core Features

### 🏃‍♂️ **Fitness Competition System**
- **Team-Based Competitions**: Join fitness teams led by captains who create engaging challenges
- **7 Activity Types**: Running, walking, cycling, strength training, meditation, yoga, diet tracking
- **Dynamic Leaderboards**: Real-time scoring based on distance, duration, consistency, or custom metrics
- **Competition Varieties**: Single events, ongoing leagues, head-to-head challenges

### 💰 **Bitcoin Integration** 
- **Lightning Network Payments**: Instant, low-fee Bitcoin transactions via CoinOS integration
- **Entry Fees & Prize Pools**: Captains set Bitcoin entry fees that create real monetary incentives
- **Automatic Payouts**: Winners receive Bitcoin rewards distributed automatically to their wallets
- **Team Wallet Management**: Captains manage team funds and reward distribution

### 📱 **Apple HealthKit Integration**
- **Workout Import**: Seamlessly import Apple Health workout data
- **Beautiful Social Cards**: Transform workouts into Instagram-worthy achievement graphics
- **Dual Publishing**: Save workouts to Nostr for competitions or share socially with RUNSTR branding
- **Unified Timeline**: View both HealthKit and Nostr workouts in a single, elegant interface

### 🔐 **Nostr-Native Authentication**
- **Private Key Login**: Authenticate with your Nostr nsec key
- **Automatic Profile Import**: Import existing profile data and workout history from Nostr events
- **Data Portability**: Your fitness data remains permanently accessible across any Nostr client
- **No Registration**: Skip traditional signup flows - use your existing Nostr identity

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
git clone https://github.com/yourusername/zap-arena.git
cd zap-arena
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

1. **Launch the app** - You'll see the Zap Arena splash screen with Nostr connection status
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

**Zap Arena** - Where fitness meets Bitcoin on the decentralized web ⚡🏃‍♂️₿