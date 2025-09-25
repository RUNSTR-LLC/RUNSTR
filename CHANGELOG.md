# Changelog
All notable changes to RUNSTR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2025-01-24

### Added
- Rebranded app to RUNSTR TEAMS - displays as "Teams" on device
- Team shop linking capability - teams can link their merchandise store
- Flash Bitcoin subscription support - teams can offer Bitcoin-based subscriptions
- Charity showcase and zapping - support and zap charities directly from the app
- Prize pool display for leagues and events - transparent competition rewards

### Fixed
- NIP-60 wallet permanence issue - wallets now persist correctly across sessions
- Team information editing functionality - captains can now properly edit team details

### Changed
- App name from "RUNSTR REWARDS" to "RUNSTR TEAMS"
- Updated all branding assets with new RUNSTR TEAMS logo

## [0.0.1] - 2025-01-20

### Added
- Initial alpha release of RUNSTR
- Two-tab interface (Teams and Profile)
- Nostr authentication with nsec login
- Real-time team discovery from multiple Nostr relays
- Captain detection and dashboard access
- Competition wizard for Events and Leagues
- Team member management with join request approvals
- Dynamic scoring algorithms for competitions
- Bitcoin rewards via NIP-60/Cashu protocol
- HealthKit workout import and posting
- Beautiful workout social cards with SVG generation
- In-app notifications for competition events
- Pure Nostr data architecture (no backend required)

### Features
- **Authentication**: Direct Nostr login with profile auto-import
- **Team Management**: Create, join, and manage teams
- **Competitions**: 7 activity types with custom parameters
- **Leaderboards**: Real-time scoring based on captain rules
- **Workout Posting**: Share workouts as Nostr events (NIP-1301)
- **Social Cards**: Instagram-worthy achievement graphics
- **Bitcoin Integration**: Direct P2P payments, no team wallets

### Technical
- React Native with TypeScript (Expo framework)
- Pure Nostr data layer (no Supabase)
- NDK (@nostr-dev-kit/ndk) for all Nostr operations
- Kind 30000 lists for team membership
- Kind 1301 events for workout data
- 5-minute cache for member lists
- 1-minute cache for competition queries

### Known Limitations
- Debug build only (not optimized for production)
- Android only (iOS build pending)
- Requires manual nsec entry (no NIP-07 extension support yet)
- Limited to Damus, Primal, and nos.lol relays

### Security
- Secure nsec storage in AsyncStorage
- No external tracking or analytics
- All data stored on user-controlled Nostr relays
- End-to-end encrypted team communications