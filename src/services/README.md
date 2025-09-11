# Services Directory

Core application services handling business logic and external integrations for RUNSTR.

## Files

- **challengeService.ts** - Challenge creation, management, and leaderboard processing
- **coinosService.ts** - Bitcoin/Lightning Network payments via CoinOS API
- **notificationDemoService.ts** - Development service for testing push notification functionality  
- **notificationService.ts** - Main push notification service and device token management
- **supabase.ts** - Supabase client configuration and database connection
- **teamService.ts** - Team data operations, membership, and Nostr team management
- **userService.ts** - Basic user operations and profile management

## Subdirectories

- **auth/** - Authentication providers and security services
- **cache/** - Caching services for Nostr data and performance optimization
- **competition/** - Competition logic and leaderboard services
- **competitions/** - Competition processing, rewards, and winner calculation
- **fitness/** - Workout data processing, HealthKit integration, and fitness services
- **integrations/** - External service integrations and data bridging
- **nostr/** - Nostr protocol handlers, relay management, and event processing
- **notifications/** - Team-branded push notification system and context services
- **preload/** - Data preloading services for app initialization
- **team/** - Team management services including discovery and membership
- **user/** - User profile services and account management