# Nostr Services Directory

Nostr protocol handlers, relay management, and event processing services for RUNSTR.

## Files

- **NostrCompetitionService.ts** - Nostr competition event handling and kind processing
- **NostrErrorRecoveryService.ts** - Error recovery and resilience for Nostr connections
- **NostrListService.ts** - Nostr list management for teams and member lists (kind 30000/30001)
- **NostrMobileConnectionManager.ts** - Mobile-optimized Nostr connection management
- **NostrProfileService.ts** - Nostr profile management and kind 0 event handling
- **NostrProtocolHandler.ts** - Core Nostr protocol implementation and event processing
- **NostrRelayManager.ts** - Multi-relay management and connection pooling
- **NostrSubscriptionManager.ts** - Nostr event subscription management and filtering
- **NostrTeamService.ts** - Team-related Nostr event handling and team discovery
- **NostrWebSocketConnection.ts** - Low-level WebSocket connection handling for Nostr relays
- **workoutCardGenerator.ts** - SVG workout card generation for social media posting
- **workoutPublishingService.ts** - Workout publishing to Nostr (kind 1301 and kind 1 events)