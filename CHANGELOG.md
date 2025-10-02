# Changelog
All notable changes to RUNSTR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.8] - 2025-10-01

### Added
- **Season 1 Data Prefetching**: Season 1 leaderboard data now loads during splash screen for faster app experience
- **New App Icons**: Refreshed app icon design across all platforms (Android mipmap densities + iOS assets)
- **Wallet Proof Encryption**: NIP-44 encryption for backing up wallet proofs to Nostr
- **Pubkey-Specific Wallet Storage**: Each user's wallet data is now properly isolated by pubkey

### Improved
- **Wallet Service Reliability**:
  - Increased relay connection timeout from 5s to 10s for better relay discovery
  - Pubkey-specific storage keys prevent wallet data conflicts between accounts
  - Enhanced proof encryption/decryption with NIP-44 standard
  - Wallet event ID tracking to prevent duplicate wallet creation
- **Season 1 Service Performance**: Major refactoring of Season 1 service for better reliability and performance
- **Activity Tracker Screens**: Simplified and streamlined Running, Walking, and Cycling tracker UI
- **GPS Status Indicator**: Improved GPS accuracy feedback and status display
- **Notification System**: Enhanced challenge notifications with better event handling
- **UI Polish**:
  - Team header visual improvements
  - Bottom navigation refinements
  - Workout summary modal enhancements
  - Challenges card UI updates

### Fixed
- **Android SafeAreaView**: Proper status bar spacing configuration in AndroidManifest
- **Amber Authentication**: Fixed callback handling for Amber signer integration
- **Background Location**: Improved background location task reliability
- **Battery Optimization**: Better battery status monitoring during workouts

## [0.0.7] - 2025-10-01

### Added
- **Unified Notification System**: Complete in-app notification infrastructure with badge support
  - NotificationBadge component for visual notification indicators
  - NotificationItem component for individual notification display
  - NotificationModal for full notification management
  - UnifiedNotificationStore for centralized notification state management
- **Global Challenge Wizard**: Create 1v1 challenges with intelligent user discovery
  - Direct user-to-user competition creation
  - Smart user search and discovery system
  - Challenge configuration with custom parameters
- **Profile Photo Uploads**: Users can now upload and customize profile pictures
  - Integration with expo-image-picker for seamless photo selection
  - Profile image management and display
- **Enhanced Onboarding Wizard**: Improved first-time user experience with comprehensive profile setup

### Improved
- **Performance Optimizations**:
  - Team caching consolidated to single source of truth (TeamCacheService)
  - League loading dramatically improved with cache-first strategy
  - Reduced redundant API calls across the app
- **Activity Tracking**: Major improvements to workout tracking reliability
  - Fixed critical pause/resume timer bugs across all tracking services
  - Improved duration display using local timer instead of GPS session
  - Enhanced HealthKit workout integration and data accuracy
- **Workout History**: Better UI for workout display and button styling
- **Profile Screen**: Enhanced layout and improved user interface

### Fixed
- Critical HealthKit workout bugs (distance calculation, status tracking, deduplication)
- Race condition causing 'no pubkey available' error on startup
- Pause/resume timer issues in all activity tracker screens
- HealthKit workout deduplication and social posting workflow
- Activity Tracker duration display accuracy
- Workout History button styling and cleanup

## [0.0.6] - 2025-01-29

### Added
- **Onboarding Wizard**: New user onboarding experience with step-by-step setup guide
- **Profile Editing**: Enhanced profile editing capabilities with more customizable fields
- **Activity Tracker Updates**: Improved activity tracking with better accuracy and performance
- **UI Polish**: Multiple small UI fixes and visual improvements throughout the app

### Fixed
- **Npub/Nsec Generation**: Fixed key generation issues for new user accounts
- **Profile Editing Bugs**: Resolved various issues with profile updates not saving correctly
- **Activity Tracker**: Fixed tracking inconsistencies and improved reliability
- **Small Bug Fixes**: Multiple minor bug fixes for improved stability

### Improved
- Overall app performance and responsiveness
- User onboarding flow for better first-time experience
- Profile management functionality

## [0.0.5] - 2025-01-29

### Added
- **Activity Tab**: New dedicated tab for viewing and participating in RUNSTR Season 1 competitions
- **RUNSTR Season 1 Integration**: Full support for official RUNSTR leaderboards and competitions
- **Profile Tab Enhancements**: Improved profile screen with better stats display and user information management
- **Team Discovery Enhancements**: Refined team browsing experience with better filtering and search capabilities
- **Location Tracking**: GPS tracking for outdoor activities (running, walking, cycling) with background support
- **Live Workout Recording**: Real-time workout tracking with distance, pace, and route mapping
- **Battery Monitoring**: Smart battery level tracking for long workouts
- **Amber Signer Support**: Enhanced Nostr authentication with Amber signer integration

### Changed
- Navigation structure updated to include Activity tab for Season 1
- Profile screen layout optimized for better information hierarchy
- Team discovery page improved with faster loading and better categorization

### Fixed
- Various performance optimizations for smoother scrolling
- Improved relay connection stability
- Better handling of large team lists

## [0.0.3] - 2025-01-27

### Added
- User sign-up flow - streamlined onboarding experience for new users
- Edit Nostr profile - users can now update their profile details directly in the app
- Delete account option - complete account deletion with NIP-09 deletion requests
- Team banner support - teams can now display custom banner images
- Team banner editing - captains can upload and modify team banners
- Tournament/Events structure - new 2-tab organization for competitions
- Organized workout history - workouts now grouped into time-based folders for better navigation

### Changed
- **Profile Screen Redesign**: Streamlined UI with compact wallet display, removed tabs, integrated settings
- **Teams Discovery Page**: New expandable category sections for better team organization
- **Time Period Labels**: Simplified from "This Week/Earlier This Month" to "Week/Month/Year"
- **Theme Consistency**: Full grayscale theme implementation, removed colorful elements
- **NIP-60 Wallet**: Simplified to show only Lightning options, removed unnecessary complexity
- **Captain Badge**: Updated from yellow to black/white for theme consistency
- **Header Alignment**: Teams and Profile headers now use consistent centered styling

### Fixed
- Wallet infinite loading issue - resolved with dedicated NDK instance management
- Wallet relay connection problems - improved connection stability
- Duplicate NIP-60 wallet creation prevention
- Team navigation missing currentUserNpub parameter
- Banner display issues after team updates
- Activity types now properly persist when updating team URLs
- Team information from Profile tab navigation

### Improved
- **Performance**: Enhanced caching throughout the app for faster load times
- **Wallet Stability**: More reliable wallet initialization and connection handling
- **UI Consistency**: Unified header styles across all screens
- **Code Organization**: Cleaner component structure with removed duplications
- **Workout History**: Organized into collapsible time-based sections (Week/Month/Year)
- **Minor Bug Fixes**: Various small improvements and stability enhancements

### Removed
- Duplicate team section from Settings screen (already displayed on Profile)
- Redundant Activity Heatmap from Profile screen
- Stats overview box for cleaner interface
- Unnecessary UI clutter throughout the app

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