# Cache Services Directory

Unified caching infrastructure for optimizing Nostr data retrieval and eliminating duplicate queries across the app.

## Architecture Overview

Our caching strategy uses a three-layer approach:
1. **UnifiedCacheService** - Central cache management with deduplication
2. **CacheInvalidator** - Smart invalidation patterns for data consistency
3. **Cache-aware Hooks** - React hooks that transparently use cached data

## Files

- **NostrCacheService.ts** - Legacy caching service for Nostr events, profiles, and relay data (being phased out)
- **UnifiedCacheService.ts** - Central caching layer with intelligent deduplication and two-tier storage (memory + AsyncStorage)
- **CacheInvalidator.ts** - Smart cache invalidation with cascade updates for data consistency

## Cache TTL Configuration

| Data Type | Memory Cache | Persistent Cache |
|-----------|-------------|------------------|
| Profiles | 2 hours | 2 hours |
| Teams | 1 hour | 1 hour |
| Members | 5 minutes | 5 minutes |
| Workouts | 5 minutes | 5 minutes |
| Leaderboards | 5 minutes | 5 minutes |
| Competitions | 30 minutes | 30 minutes |

## Usage Example

```typescript
// In components, use cache-aware hooks
import { useTeamMembers, useLeagueRankings } from '../../hooks/useCachedData';

// Hook automatically handles caching
const { members, loading, refetch } = useTeamMembers(teamId, captainPubkey);

// Manual cache invalidation when data changes
import { CacheInvalidator } from '../cache/CacheInvalidator';
CacheInvalidator.onWorkoutPosted(userNpub, teamId);
```