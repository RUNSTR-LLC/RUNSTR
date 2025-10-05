# Cache Services Directory

**NEW:** Unified caching infrastructure for eliminating duplicate Nostr queries and providing instant app navigation with zero loading states after initial load.

## Architecture Overview

### Current Architecture (NEW - Phase 1 Complete)

**UnifiedNostrCache** - Single source of truth for all Nostr data
- ✅ In-memory caching with AsyncStorage persistence
- ✅ Automatic fetch deduplication
- ✅ TTL-based expiration
- ✅ Background refresh capability
- ✅ Subscriber pattern for reactive updates
- ✅ Offline support

### Legacy Architecture (Being Phased Out)

The following services will be removed in Phase 5:
- ❌ NostrCacheService.ts
- ❌ TeamCacheService.ts
- ❌ CompetitionCacheService.ts
- ❌ Multiple utils/captainCache.ts

---

## Files

### Active Files

#### **UnifiedNostrCache.ts** (NEW)
Central caching service that replaces all legacy cache implementations.

**Features:**
- Single cache for all Nostr data types
- Prevents duplicate fetches via deduplication
- Configurable TTL per data type
- Reactive subscriber pattern
- Persistent offline storage
- Background refresh support

**Usage:**
```typescript
import unifiedCache from './UnifiedNostrCache';
import { CacheTTL, CacheKeys } from '../../constants/cacheTTL';

// Fetch with caching
const teams = await unifiedCache.get(
  CacheKeys.USER_TEAMS(userPubkey),
  () => fetchTeamsFromNostr(userPubkey),
  { ttl: CacheTTL.USER_TEAMS }
);

// Read cached only (no fetch)
const cachedTeams = unifiedCache.getCached(CacheKeys.USER_TEAMS(userPubkey));

// Subscribe to updates
const unsubscribe = unifiedCache.subscribe(
  CacheKeys.USER_TEAMS(userPubkey),
  (teams) => {
    console.log('Teams updated:', teams);
    setTeams(teams); // Update React state
  }
);
```

---

### Legacy Files (To Be Removed)

#### **NostrCacheService.ts** (DEPRECATED)
Legacy caching service - use UnifiedNostrCache instead.

#### **TeamCacheService.ts** (DEPRECATED)
Team-specific cache - functionality moved to UnifiedNostrCache.

#### **CompetitionCacheService.ts** (DEPRECATED)
Competition cache - functionality moved to UnifiedNostrCache.

---

## Cache TTL Configuration

Centralized in `src/constants/cacheTTL.ts`:

### Static Data (Long TTL - Hours/Days)
| Data Type | TTL | Cache Key Pattern | Rationale |
|-----------|-----|-------------------|-----------|
| User Profiles (kind 0) | 24 hours | `user_profile_{pubkey}` | Rarely changes |
| Team Metadata (kind 33404) | 12 hours | `team_metadata_{teamId}` | Infrequent updates |
| Discovered Teams | 1 hour | `discovered_teams` | New teams appear occasionally |
| Competitions | 1 hour | `competitions` | Created once, rarely modified |

### Semi-Static Data (Medium TTL - Minutes)
| Data Type | TTL | Cache Key Pattern | Rationale |
|-----------|-----|-------------------|-----------|
| Team Members (kind 30000) | 30 min | `team_members_{teamId}` | Members join/leave occasionally |
| User Teams | 30 min | `user_teams_{pubkey}` | User team list changes occasionally |
| User Workouts (kind 1301) | 15 min | `user_workouts_{pubkey}` | New workouts added regularly |

### Dynamic Data (Short TTL - Seconds/Minutes)
| Data Type | TTL | Cache Key Pattern | Rationale |
|-----------|-----|-------------------|-----------|
| Join Requests (kind 1104) | 1 min | `join_requests_{teamId}` | High frequency updates |
| Leaderboards | 5 min | `leaderboard_{competitionId}` | Updates with new workouts |
| Wallet Info | 1 min | `wallet_info_{pubkey}` | Balance changes frequently |

### Real-Time Data (No Cache)
| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Nutzaps (kind 9321) | 0 (no cache) | Must be real-time for payments |
| Live Workouts | 0 (no cache) | Active tracking requires real-time |
| Wallet Balance | 30 sec | Near real-time for UX |

---

## Usage Patterns

### Pattern 1: Cache-First with Background Refresh (Recommended)
Use for most screens that don't need real-time data.

```typescript
const MyTeamsScreen = () => {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    // Get cached data (instant)
    const cached = unifiedCache.getCached(CacheKeys.USER_TEAMS(userPubkey));
    if (cached) {
      setTeams(cached);
    }

    // Subscribe to updates
    return unifiedCache.subscribe(CacheKeys.USER_TEAMS(userPubkey), setTeams);
  }, []);

  // Screen renders instantly with cached data
  return <TeamsList teams={teams} />;
};
```

### Pattern 2: Fetch with Cache (Initial Load)
Use in SplashInitScreen to prefetch all data.

```typescript
const prefetchAllData = async () => {
  await Promise.all([
    unifiedCache.get(
      CacheKeys.USER_PROFILE(userPubkey),
      () => fetchUserProfile(userPubkey),
      { ttl: CacheTTL.USER_PROFILE }
    ),
    unifiedCache.get(
      CacheKeys.USER_TEAMS(userPubkey),
      () => fetchUserTeams(userPubkey),
      { ttl: CacheTTL.USER_TEAMS }
    ),
    unifiedCache.get(
      CacheKeys.DISCOVERED_TEAMS,
      () => fetchAllTeams(),
      { ttl: CacheTTL.DISCOVERED_TEAMS }
    ),
  ]);
};
```

### Pattern 3: Force Refresh (Pull-to-Refresh)
Use for manual data refresh.

```typescript
const handleRefresh = async () => {
  await unifiedCache.get(
    CacheKeys.USER_TEAMS(userPubkey),
    () => fetchUserTeams(userPubkey),
    {
      ttl: CacheTTL.USER_TEAMS,
      forceRefresh: true // Bypass cache
    }
  );
};
```

### Pattern 4: Cache Invalidation (After Mutations)
Use when data changes due to user actions.

```typescript
const handleJoinTeam = async (teamId: string) => {
  await joinTeamOnNostr(teamId);

  // Invalidate affected caches
  await unifiedCache.invalidate(CacheKeys.USER_TEAMS(userPubkey));
  await unifiedCache.invalidate(CacheKeys.TEAM_MEMBERS(teamId));
};
```

---

## Migration Guide

### Phase 1: Create UnifiedNostrCache ✅ COMPLETE
- Created UnifiedNostrCache service
- Created CacheTTL constants
- Created fetchDedup utility

### Phase 2: Prefetching (In Progress)
- Update SplashInitScreen to prefetch all data
- Populate cache before app becomes interactive
- Remove blocking loads from NavigationDataContext

### Phase 3: Screen Migration (Next)
- Migrate screens to use UnifiedNostrCache
- Remove loading states
- Add cache subscriptions

### Phase 4: Event Invalidation (Next)
- Create CacheInvalidationService
- Listen to Nostr events
- Auto-invalidate affected caches

### Phase 5: Cleanup (Next)
- Remove TeamCacheService
- Remove CompetitionCacheService
- Remove captainCache
- Remove NostrCacheService

---

## Cache Statistics & Debugging

Get current cache stats:

```typescript
const stats = unifiedCache.getStats();
console.log('Cache size:', stats.size);
console.log('Cached keys:', stats.keys);
console.log('Pending fetches:', stats.pendingFetches);
console.log('Active subscribers:', stats.subscribers);
```

Check fetch deduplication:

```typescript
import { getPendingFetchStats } from '../../utils/fetchDedup';

const stats = getPendingFetchStats();
console.log('Pending fetches:', stats.count);
console.log('Keys:', stats.keys);
```

---

## Benefits of UnifiedNostrCache

### Before (Multiple Caches)
- ❌ 6 different cache implementations
- ❌ Duplicate fetches on app startup
- ❌ Loading spinners throughout app
- ❌ No coordination between caches
- ❌ Stale data issues

### After (UnifiedNostrCache)
- ✅ Single cache implementation
- ✅ Zero duplicate fetches
- ✅ Instant screen navigation
- ✅ Coordinated cache updates
- ✅ Event-driven invalidation
- ✅ Offline support

---

## Testing Cache Behavior

### Test Cache Hits
```typescript
// First call - cache miss, fetches from Nostr
const teams1 = await unifiedCache.get('user_teams', fetchTeams);

// Second call - cache hit, returns instantly
const teams2 = await unifiedCache.get('user_teams', fetchTeams);
```

### Test Fetch Deduplication
```typescript
// Multiple simultaneous calls - only ONE fetch happens
Promise.all([
  unifiedCache.get('teams', fetchTeams),
  unifiedCache.get('teams', fetchTeams),
  unifiedCache.get('teams', fetchTeams),
]);
// Network tab shows only 1 request
```

### Test TTL Expiration
```typescript
// Set short TTL for testing
await unifiedCache.set('test', data, 1000); // 1 second

// Wait for expiration
await new Promise(resolve => setTimeout(resolve, 1100));

// Next get() will fetch fresh data
const fresh = await unifiedCache.get('test', fetchFreshData);
```

---

## Future Enhancements

- [ ] LRU eviction for memory management
- [ ] Cache size limits
- [ ] Cache analytics dashboard
- [ ] Predictive prefetching
- [ ] Smart TTL adjustment based on usage patterns
