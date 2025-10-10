# Changelog
All notable changes to RUNSTR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2025-10-09

### Improved
- **Activity Tracking Architecture**: Simplified location tracking system
  - Replaced complex tracking system with SimpleLocationTrackingService
  - More maintainable and reliable GPS tracking
  - Better performance during workouts

### Fixed
- **Theme Consistency**: Updated Bitcoin message box and notifications to match black and orange theme
  - Consistent visual design across all UI components
  - Better integration with app's color scheme

## [0.2.0] - 2025-10-09

### Performance
- **Global NDK Service Migration**: Eliminated duplicate WebSocket connections across the app
  - Migrated remaining services from NostrRelayManager to GlobalNDKService
  - Reduced redundant relay connections for better performance
  - Improved connection stability and reliability
  - More efficient Nostr operations throughout the app

### Improved
- **Workout Posting Reliability**: Enhanced workout posting with UnifiedSigningService
  - More reliable kind 1 workout posting to Nostr
  - Better signing coordination across the app
  - Improved error handling for workout events
- **Lightning Zap Experience**: Refined nutzap and Lightning payment flows
  - Improved zap button interactions and feedback
  - Better error handling for Lightning payments
  - Enhanced user experience for sending satoshis

### Fixed
- **Prefetch Service**: Resolved errors in NostrPrefetchService
  - Removed unused league fetching causing errors
  - Cleaner initialization flow
  - Faster app startup without unnecessary queries

## [0.1.10] - 2025-10-09

### Fixed
- **Critical Run Tracker Fix**: Resolved distance tracking freeze after 2 minutes
  - Eliminated stale closure bug in ActivityTrackerScreen
  - Distance updates now continue reliably throughout entire workout
  - Ensures accurate tracking for long-duration runs, walks, and cycles
- **Profile Screen Layout**: Restored proper layout after adding ScrollView
  - Fixed UI layout issues introduced with scrolling functionality
  - Consistent profile display across different screen sizes
- **Lightning Balance Sync**: Synchronized wallet balance with spendable proofs before zapping
  - Balance now accurately reflects available funds before sending
  - Prevents failed zaps due to stale balance data
  - Real-time balance updates after successful Lightning payments
- **Team Events Refresh**: Added pull-to-refresh to reload team events
  - Users can now manually refresh event lists
  - Ensures latest competition data is always available
  - Better UX for checking new events

### Added
- **Pull-to-Refresh on Profile**: Enabled pull-to-refresh to update wallet balance
  - Quick gesture to refresh balance without navigating away
  - Improved wallet balance visibility
  - Better user control over data freshness

## [0.1.9] - 2025-10-09

### Changed
- **Simplified Focus**: Removed team leagues and team member lists to focus exclusively on Teams and Events
  - Streamlined UI for better user experience
  - Reduced complexity in team management
  - Clearer navigation between Teams and Events

### Added
- **Nutzap Entry Fees**: Event entry fee system using nutzap-based Bitcoin payments
  - Captains can set entry fees for events
  - Automatic payment processing via Lightning
  - Enhanced competition monetization options
- **Amber Wallet Diagnostics**: Comprehensive diagnostic scripts for Amber wallet restoration
  - Tools to debug wallet connection issues
  - Restoration flow testing utilities
  - Better troubleshooting capabilities

### Fixed
- **Event Loading Race Condition**: Resolved critical timing issues using useFocusEffect
  - Events now load reliably on screen focus
  - Eliminated inconsistent event display
  - Smoother navigation experience
- **Wallet Duplication Prevention**: NIP-60 wallet restoration instead of creating duplicates
  - Check for existing wallets before creation
  - Restore wallet state from Nostr events
  - Prevents multiple wallets for same user

### Improved
- **Deterministic Wallet Detection**: User-initiated wallet creation with backwards compatibility
  - Smarter wallet detection logic
  - Maintains compatibility with existing wallets
  - User control over wallet initialization
- **Wallet Auto-Initialization**: Automatic wallet setup with backwards compatibility
  - Seamless onboarding for new users
  - Preserves existing wallet configurations
  - Enhanced reliability across app updates
- **Event Loading Logging**: Comprehensive debugging for event loading issues
  - Detailed logs for troubleshooting
  - Better visibility into loading states
  - Faster issue resolution

## [0.1.16] - 2025-10-08

### Performance
- **50x Faster Caching Architecture**: Implemented advanced caching patterns from runstr-github reference
  - Massive performance gains across all data-heavy screens
  - Significantly reduced network requests and processing overhead
  - Improved app responsiveness and user experience
- **ProfileScreen Optimization**: Eliminated 10-second freeze with lazy loading architecture
  - Cache-first strategy shows app immediately with cached data
  - Deferred wallet initialization by 2 seconds (non-blocking)
  - Deferred notification initialization by 3 seconds (non-blocking)
  - Added 3-second timeout to prevent indefinite blocking
  - Progressive enhancement instead of blocking gates
- **UI Freeze Fixes**: Applied React patterns from runstr-github to eliminate UI blocking
  - Smoother interactions throughout the app
  - Better handling of heavy operations
  - Improved overall app responsiveness

### Fixed
- **Critical Session Stability**: Fixed crashes and issues in 2+ hour running sessions
  - Enhanced memory management for long-duration activities
  - Improved GPS tracking reliability over extended periods
  - Better background processing for marathon-length workouts
- **Amber Signing System**: Complete overhaul of Amber signer integration
  - Fixed join request signing failures
  - Resolved crypto library conflicts causing signing errors
  - Implemented proper 60-second timeout handling
  - Enhanced error messages for better user guidance
  - Fixed NIP-55 parameter compliance (current_user, id fields)
  - Proper pubkey handling with padding and npub decoding
- **GlobalNDK Signer Setup**: Amber/nsec signer now properly attached to GlobalNDK
  - All Nostr operations now use correct signer
  - Consistent signing behavior across the app
  - Better integration between authentication and Nostr operations

### Testing
- **Distance Freeze Detection**: Comprehensive test suite for GPS tracking issues
  - Validates distance tracking accuracy
  - Tests GPS recovery scenarios
  - Ensures workout data integrity
- **Amber Signing Tests**: Complete test coverage for Amber integration (31/34 passing)
  - Unit tests for NIP-55 compliance
  - Integration tests for signing coordination
  - Timeout and error handling validation
  - Response parsing and pubkey caching tests

### Documentation
- **AMBER_INTEGRATION.md**: Comprehensive update with current architecture
  - Detailed explanation of Amber signer flow
  - NIP-55 specification compliance guide
  - Troubleshooting common issues
  - Integration patterns and best practices

## [0.1.15] - 2025-10-08

### Fixed
- **App Initialization Architecture**: Complete overhaul to eliminate 30-second button freeze
  - Wait for all data to load before showing app UI
  - Profile-first loading strategy for faster perceived performance
  - Eliminated race conditions causing unresponsive buttons
  - Simplified to single loading screen for cleaner UX
- **Profile Display**: Fixed avatar and bio not showing on initial render
  - Proper data loading sequence ensures profile appears correctly
  - Eliminated blank profile screen on app launch
- **GlobalNDK Reconnection**: Fixed cached instance reconnection on app reload
  - Prevents "NDK not ready" errors when returning to app
  - More reliable Nostr connection stability
  - Better handling of app backgrounding/foregrounding
- **Team Screen Crashes**: Multiple crash prevention fixes
  - Added null checks for undefined team data
  - Removed undefined team.captain reference
  - Protected against malformed team objects
- **Charity Zap Button**: Fixed crash from Lightning address handling
  - Proper validation of charity Lightning addresses
  - Prevents undefined reference errors

### Improved
- **Progressive Relay Connection**: Optimized relay connection strategy for faster startup
  - Relays connect progressively instead of all at once
  - Reduces initial connection overhead
  - Faster time to first data load
- **Amber Signer Support**: Enhanced challenge system with Amber signer integration
  - Users can sign challenges with external Amber app
  - Better NIP-55 compliance
  - More secure key management options

## [0.1.14] - 2025-10-07

### Changed
- Version bump for Android APK build
- Updated all platform version numbers (iOS, Android, Expo)

## [0.1.13] - 2025-10-06

### Added
- **Two-Tab Workout Feed**: Separate Public and Private workout tabs
  - Public tab shows workouts posted to Nostr (kind 1 social posts)
  - Private tab shows local HealthKit workouts (not yet posted)
  - Cleaner separation between social workout sharing and personal tracking
  - Removed HealthKit complexity from workout display logic

### Fixed
- **LocalWorkoutStorageService**: Fixed singleton instance usage across all components
  - Corrected imports to use singleton instance directly
  - Removed redundant instantiation causing storage inconsistencies
  - Improved workout posting status tracking reliability
- **iOS Build Errors**: Removed conflicting expo packages
  - Cleaned up package dependencies for stable iOS builds
  - Eliminated build failures from package conflicts
- **Workout Tab UI**: Removed cache/instant load indicators
  - Cleaner workout feed interface
  - Removed redundant loading state indicators
  - Improved visual clarity and reduced UI clutter

### Improved
- **Workout Feed Architecture**: Simplified workout display with dedicated public/private tabs
  - Better user mental model for workout management
  - Clear distinction between social posts and private tracking
  - More intuitive workout posting workflow

## [0.1.12] - 2025-10-06

### Fixed
- **CRITICAL: Workout Fetching Bug**: Fixed parameter mismatch in prefetch service
  - Corrected `fetchUserWorkouts` method signature (pubkey parameter)
  - Eliminated "workouts.filter is not a function" errors
  - Restored proper workout data fetching from Nostr relays
- **HealthKit Date Format**: Fixed date parsing for HealthKit workout import
  - Corrected ISO date string handling for workout timestamps
  - Eliminated timezone-related workout import failures
- **Pubkey Corruption in App.tsx**: Fixed pubkey retrieval from AsyncStorage
  - Use stored hex pubkey instead of potentially corrupted user.id
  - Prevents authentication errors on app startup
  - More reliable user identification throughout app

### Improved
- **NostrRelayManager Migration**: Migrated 6 critical services to GlobalNDK
  - Reduced redundant relay connections across the app
  - Better connection stability and reliability
  - Improved performance for Nostr operations

## [0.1.11] - 2025-10-06

### Fixed
- **Onboarding Loop**: Prevented returning users from seeing onboarding wizard
  - Added proper "onboarding complete" flag in AsyncStorage
  - Returning users now bypass wizard and go straight to app
  - Improved login flow reliability

## [0.1.10] - 2025-10-06

### Fixed
- **Loading Screen Hang**: Multi-layer timeout protection for app initialization
  - Added fallback timeouts to prevent indefinite loading states
  - Better error handling for network and authentication failures
  - Improved splash screen reliability

### Improved
- **LoginScreen Theme**: Updated to match orange theme design
  - Consistent visual branding throughout authentication flow
  - Better color scheme alignment with app design system

## [0.1.9] - 2025-10-06

### Changed
- **BREAKING: Complete Supabase Removal**: App now runs entirely on Nostr protocol
  - Removed all Supabase dependencies and services from codebase
  - Pure Nostr architecture for all team, competition, and user data
  - Simplified data layer with single source of truth (Nostr events)
  - No backend database dependencies - fully decentralized
  - Improved app reliability and reduced external dependencies

### Added
- **Activity-Specific Challenge Types**: Enhanced challenge system with activity-type-specific options
  - Different challenge parameters for each activity type (running, cycling, swimming, etc.)
  - More relevant competition formats tailored to each sport
  - Better UX for creating targeted 1v1 challenges

### Improved
- **Teams Discovery UX**: Create Team button moved to bottom of discovery page
  - More intuitive placement for new team creation
  - Cleaner top section focused on browsing existing teams
  - Better visual hierarchy and user flow
- **Captain Dashboard**: Multiple UX improvements and bug fixes
  - More intuitive member management interface
  - Improved join request approval workflow
  - Better visual feedback for captain actions
  - Enhanced stability and reliability
- **Challenge Button Styling**: Refined challenge UI with better visual consistency
  - Improved button appearance and interactions
  - Clearer challenge action buttons
  - Better integration with overall app theme

### Fixed
- **TypeScript Compilation**: Resolved all TypeScript compilation errors
  - Clean build with zero errors
  - Improved type safety throughout codebase
  - Better developer experience
- **Android Data Loading**: Fixed teams and workouts loading issues on Android
  - Resolved race conditions in data fetching
  - Added comprehensive debug logging
  - Improved error handling for network issues
  - Better cache management
- **Android Compatibility**: Multiple Android-specific fixes
  - Fixed UI layout issues on various Android devices
  - Improved alert dialog theming for dark mode
  - Enhanced authentication flow reliability
  - Better keyboard handling and text input

## [0.1.8] - 2025-10-05

### Added
- **League/Event Separation**: Enhanced competition organization with clear distinction between leagues and events
  - Improved navigation and discovery for different competition types
  - Better categorization and filtering in competition lists
  - Clearer visual hierarchy for ongoing vs time-bounded competitions
- **Event Join Notifications**: Real-time notifications when users join events
  - Instant feedback for event participation
  - Better visibility of new team members joining competitions
  - Improved engagement and social dynamics

### Performance
- **60% Faster App Startup**: Parallelized NostrPrefetchService for dramatic performance improvements
  - Team discovery, profile data, and Season 1 leaderboards now load simultaneously
  - Reduced sequential bottlenecks in data fetching
  - Faster time-to-interactive for users
- **Optimized Relay Connections**: Centralized NDK instance management with GlobalNDKService
  - Single NDK instance shared across entire app (90% reduction in WebSocket connections)
  - Eliminated redundant relay connections (4 relays instead of 36)
  - Improved connection stability and reliability
  - Better performance across all Nostr-dependent services
- **Stale-While-Revalidate Caching**: Instant data display with background updates
  - Data appears immediately from cache
  - Fresh data fetched in background and updates UI seamlessly
  - Dramatically improved perceived performance
- **Streamlined Loading Flow**: Removed redundant AppSplashScreen
  - Cleaner initialization process
  - Faster transition to main app
  - Reduced complexity in loading architecture

### Improved
- **Icon System**: Complete migration from emojis to Ionicons for professional appearance
  - Challenge icon now uses shield (ionicons: shield)
  - Zap icon now uses flash-outline (ionicons: flash-outline)
  - Season 1 leaderboard uses consistent Ionicon set
  - Better visual consistency across all screens
  - More accessible and platform-agnostic UI
- **Caching Architecture**: Migrated NavigationDataContext to UnifiedNostrCache
  - Single source of truth for all cached Nostr data
  - Better cache invalidation and refresh strategies
  - Improved data consistency across components
- **Profile Screen**: Enhanced performance with optimized data loading
  - Faster rendering of team memberships
  - More responsive workout history
  - Smoother scrolling and interactions
- **Activity Tracker UI**: Removed live kilometer splits display from running tracker
  - Cleaner, less cluttered interface during workouts
  - Focus on essential metrics (distance, pace, duration)
  - Improved readability while running
- **TTS Announcements**: Enhanced TTS service with better preference management
  - More reliable voice feedback during workouts
  - Improved settings synchronization
  - Better handling of user preferences

### Fixed
- **Team Stats Crashes**: Added defensive null checks for team.stats throughout codebase
  - Prevents crashes when team statistics are unavailable
  - Graceful degradation when stats data is missing
  - Improved app stability in TeamStatsGrid and TeamJoinModal components
- **NDK Initialization**: Resolved 'NDK not ready' error on discover page
  - Optimized ready state checks
  - Better handling of NDK initialization timing
  - More reliable team discovery on app launch
- **Amber Signer**: Fixed URI encoding for sign_event per NIP-55 spec
  - Proper event encoding in deep link URIs
  - Improved compatibility with Amber app
  - More reliable event signing flow
- **Join Request Publishing**: Automatic retry logic for failed join requests
  - Network failures no longer silently fail
  - Requests retry automatically until successful
  - Better user feedback on request status
- **Leaderboard Display**: Show all team members, including those with 0 workouts
  - Complete team roster visible on leaderboards
  - Members with no workouts shown at bottom
  - More accurate representation of team participation
- **League Loading**: Improved loading state handling with empty participant fallback
  - No more blank screens when league has no participants
  - Better loading indicators
  - Graceful handling of edge cases

## [0.1.7] - 2025-10-05

### Fixed
- **Distance Tracking Freeze**: Eliminated distance getting "stuck" during active workouts
  - Fixed distance freezing at specific values (e.g., stuck at 0.63 km) while GPS shows strong signal
  - Reduced GPS recovery buffer from 2 points to 1 point for faster recovery
  - Added 5-second timeout to GPS recovery mode (was 10 seconds)
  - Removed Android hysteresis filter that required 2 consecutive valid points
  - Reduced minimum movement threshold from 1.0m to 0.75m to prevent slow movement rejection
  - Added distance freeze detection logging to diagnose stuck distance issues
  - Distance now updates more responsively during brief GPS fluctuations
- **Background Distance Tracking**: Fixed distance not updating while app is backgrounded
  - Implemented periodic background location sync (every 5 seconds)
  - Background locations now processed through validation pipeline in real-time
  - No more "recalculation" when returning to app - distance updates continuously
  - Eliminates distance jumps when switching between apps
- **Distance Tracking Oscillation**: Eliminated GPS distance "bounce" during workouts
  - Fixed distance oscillating between values (e.g., 1.14 → 1.13 → 1.14 km)
  - Implemented monotonicity guarantee - distance never decreases during active tracking
  - Improved Kalman filter to use incremental filtering instead of cumulative overwrite
  - Reduced interpolation window from 5 seconds to 1 second to prevent prediction errors
  - Disabled distance prediction in background mode to prevent oscillations from throttled GPS
  - Prevents micro-oscillations from GPS coordinate jitter accumulating over time
- **Distance Calculation Method**: Switched from 3D to 2D horizontal distance
  - Changed to industry-standard 2D Haversine distance calculation
  - Matches Nike Run Club, Strava, Garmin, and official race distance measurement
  - Previously used 3D distance (including altitude changes) which inflated distances in hilly terrain
  - Elevation gain still tracked separately in `totalElevationGain` metric
  - Typical impact: 1-3% less distance on hilly routes compared to previous version

### Improved
- **Amber Signer Integration**: Enhanced reliability and user experience
  - Improved NDK signer authentication flow
  - Better error handling and user feedback
  - More robust callback handling for Amber responses
- **Settings Screen UI**: Polished toggle button layout and styling
  - Cleaner toggle button appearance and interactions
  - Improved visual consistency across settings options
  - Better spacing and alignment for all settings controls
- **Kilometer Splits Display**: Enhanced workout tracking UI
  - Improved splits visibility during active workouts
  - Better formatting and layout for split times
  - Clearer presentation of pace per kilometer
- **Workout History**: Local workouts now visible in timeline
  - HealthKit workouts appear in unified workout history
  - Seamless integration of local and Nostr-posted workouts
  - Complete workout history at a glance
- **Android Adaptive Icon**: Reduced icon size to 78% for better padding and visual balance
  - Shrunk ostrich logo from 1024x1024 to 799x799 on canvas
  - Added 113px padding around icon for proper spacing
  - Prevents logo clipping on various Android launcher styles
  - Better visual presentation across all Android devices and themes

## [0.1.5] - 2025-10-04

### Fixed
- **Amber Signing**: Calculate event ID before Amber signing to resolve permission errors
  - Fixed "Permission denied" errors when Amber users try to sign workout events
  - Event IDs are now properly generated before passing to Amber signer
  - Resolves compatibility issues with latest Amber versions
- **Location Tracking Reliability**: Android foreground service prevents Doze Mode from stopping GPS
  - Background location tracking now continues reliably during long workouts
  - Foreground service notification keeps location service active
  - Prevents Android battery optimization from killing workout tracking
- **Location Permission Flow**: Request permissions at login instead of run start
  - Smoother onboarding experience with upfront permission requests
  - Eliminates permission interruptions when starting first workout
  - Better UX for new users

### Improved
- **Kilometer Splits Display**: Removed redundant 'Recording' status indicator
  - Cleaner UI during workout tracking
  - Focus on actual workout metrics instead of status text
  - Improved kilometer splits visibility
- **Android App Icon**: Scaled down adaptive icon by 12% to prevent clipping
  - Fixed ostrich head being cut off on some Android launchers
  - Better visual presentation across all Android devices
  - Maintains proper padding for round icon masks

## [0.1.4] - 2025-10-04

### Fixed
- **Amber Authentication**: Complete support for all signing operations
  - Event signing now works properly with Amber signer
  - Improved callback handling and error messages
  - Better compatibility with latest Amber versions
- **Pace Display**: Workout summary now shows pace in MM:SS format instead of raw seconds
- **Onboarding Flow**: Welcome screens only show for new signups, not returning users
- **Auto-Login**: Restored automatic login with backward compatibility for team memberships

### Improved
- **UI Polish**: Refined visual elements throughout the app
  - Login button updated to orange background for brand consistency
  - Challenge wizard now uses minimalist Ionicons instead of emojis
  - Removed OR divider between Login and Start buttons for cleaner design
- **Performance**: Extended Season 1 cache duration from 5 minutes to 24 hours for faster loading

## [0.1.3] - 2025-10-04

### Changed
- **Theme Refresh**: Updated color scheme from black/white to orange/black
  - Primary action buttons now use RUNSTR orange (#FF6B35) for better brand identity
  - Improved visual hierarchy with orange accents throughout the app
  - Team cards, navigation elements, and CTAs feature new orange theme
  - Maintains dark mode foundation with strategic orange highlights

### Improved
- **Activity Tracker Enhancements**: Major improvements to workout tracking experience
  - **Smooth Distance Updates**: Distance now updates smoothly every second using Kalman filter velocity prediction
  - GPS accuracy remains unchanged - interpolation only affects UI display between GPS updates
  - Shows incremental progress (0.01 → 0.02 → 0.03 km) instead of jumpy updates (0 → 0.02 → 0.06)
  - Applied to all activity types: running, walking, and cycling
  - More responsive GPS tracking with better accuracy indicators
  - Enhanced pause/resume functionality with clearer visual states
  - Improved workout summary display with better stat formatting
  - Better handling of edge cases (GPS loss, app backgrounding)
- **Amber Login Flow**: Streamlined Nostr signer authentication
  - More reliable callback handling for Amber responses
  - Better error messages when Amber is not installed
  - Improved user guidance during sign-in process
  - Enhanced compatibility with latest Amber signer versions

### Fixed
- **Pace Display Bug**: Corrected workout summary pace from incorrect "483:60/km" to proper "MM:SS/km" format
  - WorkoutSummaryModal now uses ActivityMetricsService.formatPace() for correct seconds-to-minutes conversion
  - Fixes main pace stat, split paces, and average pace footer displays
  - Example: 0.13 km in 1:05 now correctly shows "8:20/km" instead of malformed values
- Activity tracker UI consistency across different workout types
- Orange theme application across all screens and components
- Amber authentication edge cases and timeout handling

## [0.1.2] - 2025-10-04

### Fixed
- **Build Compatibility**: Removed deprecated `expo-barcode-scanner` package
  - Package was removed from Expo SDK 52+ (app uses SDK 53)
  - Fixes "ExpoModulesCore/EXBarcodeScannerInterface.h not found" build error
  - All QR scanning functionality already uses `expo-camera` (no feature loss)
  - Reduces app size by removing unused module

### Changed
- **Version Updates**: Bumped app version to 0.1.2 across all platforms
  - Updated app.json, Android build.gradle, and iOS Info.plist
  - Incremented Android versionCode to 2 (required for app store updates)
  - Updated kind 1301 workout event client tags to report version 0.1.2
  - Updated test files and documentation to reflect new version

## [0.1.1] - 2025-10-03

### Added
- **QR-Based Event Joining**: Scan QR codes to instantly join competitions
  - Event QR code generation and display for captains
  - QR scanner with camera permissions for participants
  - Complete participant management system with join tracking
- **Dual-Path Challenge System**: Complete 1v1 competition infrastructure
  - Challenge creation wizard with activity type selection
  - Challenge acceptance/decline workflow
  - Dedicated leaderboard for head-to-head competitions
  - Navigation flow for browsing and managing challenges
- **Local Workout Persistence**: Activity tracker saves workouts locally before syncing
  - Prevents data loss during network issues
  - Background sync when connection restored
- **NIP-60 Wallet Enhancements**:
  - Encrypted proof backup to Nostr using NIP-44 encryption
  - Offline-first wallet initialization for instant load
  - Bulletproof duplicate wallet prevention

### Improved
- **Performance Optimizations**:
  - Extended league cache to 24 hours with pull-to-refresh
  - Instant app resume with persistent caching
  - Android performance improvements for team and wallet loading
- **GPS Tracking Reliability**:
  - GPS recovery timeout prevents distance tracking freeze
  - Better handling of GPS signal loss during workouts
- **Authentication Fixes**:
  - Proper NIP-55 Activity Result pattern for Amber signer
  - Flexible callback handler for various response formats
  - WorkoutSummaryModal uses correct nsec storage key

### Fixed
- Migrated Slider component to @react-native-community/slider for React Native 0.74+ compatibility
- Amber signer callback handling - Access result.extra instead of result.data
- Android SafeAreaView for proper status bar spacing
- Enable receive button with offline-first wallet initialization

## [0.1.0] - 2025-10-02

### Added
- **Enhanced Splash Screen**: New circular logo design with RUNSTR branding
  - Clean white border around app icon for better visual presentation
  - Improved logo sizing and positioning
  - Better image loading with proper resize modes

### Improved
- **App Icons**: Significantly optimized Android app icon file sizes (reduced by 60-80%)
  - All mipmap densities now use smaller, optimized PNG files
  - Better compression without quality loss
  - Faster app installation and reduced storage footprint
- **Splash Screen Assets**: Updated splash screen logos with optimized file sizes
- **Visual Consistency**: Unified branding across splash screen and app icons

## [0.0.9] - 2025-10-02

### Added
- **Quick Resume Mode**: Wallet now uses cached data for instant load when returning to app within 2 minutes
- **Background Network Initialization**: Network connections initialize in background when using cached wallet data
- **Current User Tracking**: Added pubkey verification to prevent wallet data conflicts between accounts

### Improved
- **Wallet Load Performance**:
  - Cache-first strategy for instant wallet initialization on app resume
  - Background Nostr sync after loading cached data (non-blocking)
  - 2-minute fresh threshold for cache validity
  - Automatic fallback to full sync when cache is stale
- **Splash Screen Assets**: Updated splash screen logos across all Android drawable densities for better visual quality
- **Wallet Reliability**: Enhanced initialization flow with better error handling and retry logic

### Fixed
- **Wallet Cache Freshness**: Fixed issue where stale cached wallet data could be used incorrectly
- **User Account Isolation**: Ensured each user's wallet cache is properly isolated by pubkey
- **Background Sync Errors**: Improved error handling for background wallet sync operations

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