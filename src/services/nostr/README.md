# Nostr Services

Nostr protocol services for relay management, event publishing, profile handling, and team/competition discovery.

## Files

- **GlobalNDKService.ts** - Centralized singleton NDK instance for the entire app. All Nostr operations must use this service to share a single set of relay connections (~90% WebSocket reduction). This is the most critical service in the codebase.
- **NostrInitializationService.ts** - App startup initialization for Nostr connections, team prefetching, and relay setup via GlobalNDKService.
- **NostrPrefetchService.ts** - Comprehensive data prefetching during splash screen (profiles, teams, workouts, competitions) to eliminate loading states after startup.
- **NostrProfileService.ts** - Fetches and caches user profiles from Nostr kind 0 events with automatic refresh and data parsing.
- **NostrProfilePublisher.ts** - Publishes kind 0 metadata events to Nostr for profile updates, including validation and multi-relay publishing.
- **NostrTeamService.ts** - Team discovery and management via kind 33404 events. Delegates to NdkTeamService which returns hardcoded teams (charities).
- **NostrTeamCreationService.ts** - Creates teams as kind 33404 events with associated kind 30000 member lists using NDK.
- **NostrListService.ts** - Nostr list management for team membership lists (kind 30000/30001) using GlobalNDKService.
- **NostrCompetitionService.ts** - Competition event handling for leagues (kind 30100) and events (kind 30101) published to Nostr.
- **NostrCompetitionParticipantService.ts** - Manages competition participant lists using kind 30002 events, including join requests and approval tracking.
- **NostrProtocolHandler.ts** - Core Nostr protocol message formatting (REQ, EVENT, CLOSE) and filter management per Nostr NIPs.
- **NostrRelayManager.ts** - Multi-relay WebSocket connection management with real-time event subscriptions and reconnection logic.
- **NostrSubscriptionManager.ts** - Subscription lifecycle management with event deduplication and bounded memory (max 500 events per subscription).
- **NostrWebSocketConnection.ts** - Low-level individual relay WebSocket handling with error recovery and mobile optimization.
- **workoutPublishingService.ts** - Publishes workouts to Supabase for competitions and creates kind 1301 events locally. Handles social sharing as kind 1 posts.
- **workoutCardGenerator.ts** - SVG workout achievement card generation for social media sharing with RUNSTR branding.
- **leaderboardCardGenerator.ts** - SVG leaderboard card generation for sharing daily 5K/10K/Half/Marathon results.
- **runstrLogoBase64.ts** - Base64-encoded RUNSTR ostrich logo used in generated workout and leaderboard cards.
- **SimpleNostrService.ts** - *(Legacy/unused)* React Native team discovery using nostr-tools SimplePool. Superseded by NdkTeamService and GlobalNDKService.
- **HttpNostrQueryService.ts** - *(Legacy/unused)* HTTP-first Nostr query strategy with WebSocket fallback. Uses nostr-tools types. Superseded by GlobalNDKService.
- **HybridNostrQueryService.ts** - *(Legacy/unused)* Multi-strategy query coordinator (HTTP, WebSocket, Proxy). Uses nostr-tools. Superseded by GlobalNDKService.
- **OptimizedWebSocketManager.ts** - *(Legacy/unused)* Mobile-optimized WebSocket pool with connection limiting. Uses nostr-tools. Superseded by GlobalNDKService.
