# Performance Optimization Guide

This document provides detailed strategies for optimizing RUNSTR's performance through aggressive caching and smart data fetching.

## Problem Statement

**Heavy Nostr Usage Causing Slowness:**
- Multiple simultaneous Nostr queries on app startup
- Loading states throughout app navigation
- Duplicate fetches for same data
- Unoptimized leaderboard calculations

**Solution: Aggressive Caching + Prefetching**

## Caching Architecture (UnifiedNostrCache)

### Intelligent TTL Configuration

The app uses different cache durations based on data volatility:

```typescript
// Static data (hours/days)
USER_PROFILE: 24 hours        // Profiles rarely change
TEAM_METADATA: 12 hours       // Team info updates infrequently
DISCOVERED_TEAMS: 1 hour      // New teams appear occasionally

// Semi-static data (minutes)
TEAM_MEMBERS: 30 minutes      // Members join/leave occasionally
USER_TEAMS: 30 minutes        // User's team list changes rarely
USER_WORKOUTS: 15 minutes     // New workouts added regularly

// Dynamic data (seconds)
JOIN_REQUESTS: 1 minute       // High frequency updates
LEADERBOARDS: 5 minutes       // Updates with new workouts
WALLET_BALANCE: 30 seconds    // Near real-time for UX
```

### Cache Key Patterns

**User-Specific Keys:**
```typescript
USER_PROFILE(pubkey)         // 'user_profile_{pubkey}'
USER_TEAMS(pubkey)           // 'user_teams_{pubkey}'
USER_WORKOUTS(pubkey)        // 'user_workouts_{pubkey}'
```

**Team-Specific Keys:**
```typescript
TEAM_METADATA(teamId)        // 'team_metadata_{teamId}'
TEAM_MEMBERS(teamId)         // 'team_members_{teamId}'
LEADERBOARD(competitionId)   // 'leaderboard_{competitionId}'
```

## Prefetching Strategy

### Splash Screen Load (2-3 seconds)

**Goal: Load everything during splash → Zero loading states after**

```typescript
// In SplashInitScreen.tsx
async initializeApp() {
  await Promise.all([
    unifiedCache.get('user_profile', () => fetchProfile()),
    unifiedCache.get('user_teams', () => fetchUserTeams()),
    unifiedCache.get('discovered_teams', () => fetchAllTeams()),
    unifiedCache.get('user_workouts', () => fetchRecentWorkouts()),
    unifiedCache.get('competitions', () => fetchActiveCompetitions()),
  ]);

  // After splash: Instant navigation, no spinners
  navigation.replace('MainTabs');
}
```

### Background Sync Pattern

**Fetch on mount, sync in background:**

```typescript
const MyScreen = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    // 1. Get cached data (instant)
    const cached = unifiedCache.getCached(cacheKey);
    if (cached) {
      setData(cached);  // Renders immediately
    }

    // 2. Fetch fresh data in background
    unifiedCache.get(cacheKey, fetchFunction).then(setData);
  }, []);

  return <DataDisplay data={data} />;
};
```

## Query Optimization

### Before (Slow Approach)

```typescript
// ❌ Query all workouts every time
const workouts = await fetchWorkouts(userPubkey);  // 2-3 seconds
setWorkouts(workouts);
```

### After (Fast Approach)

```typescript
// ✅ Use local database + periodic sync
const localWorkouts = await workoutDatabase.getStoredWorkouts(userPubkey);
setWorkouts(localWorkouts);  // Instant

const lastSync = await getLastSyncTime();
if (Date.now() - lastSync > 15 * 60 * 1000) {  // 15 minutes
  syncWorkoutsFromNostr(userPubkey);  // Background sync
}
```

### Batching Nostr Queries

**Before: Multiple round-trips**
```typescript
// ❌ N+1 query problem
for (const memberId of memberIds) {
  const workouts = await fetchWorkouts(memberId);  // Separate query each
}
```

**After: Single batch query**
```typescript
// ✅ Batch fetch with single NDK query
const filter = {
  kinds: [1301],
  authors: memberIds,  // All members in one query
  since: startTimestamp,
  until: endTimestamp
};

const workouts = await ndk.fetchEvents(filter);
```

## Screen-Level Optimizations

### Pattern: Cache-First with Background Refresh

```typescript
const MyTeamsScreen = () => {
  const [teams, setTeams] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadTeams();

    // Subscribe to cache updates
    return unifiedCache.subscribe(CacheKeys.USER_TEAMS(userPubkey), setTeams);
  }, []);

  const loadTeams = async () => {
    // Get cached data (instant)
    const cached = unifiedCache.getCached(CacheKeys.USER_TEAMS(userPubkey));
    if (cached) {
      setTeams(cached);  // Renders immediately
    }

    // Fetch fresh data
    const fresh = await unifiedCache.get(
      CacheKeys.USER_TEAMS(userPubkey),
      () => fetchUserTeams(userPubkey)
    );
    setTeams(fresh);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await unifiedCache.invalidate(CacheKeys.USER_TEAMS(userPubkey));
    await loadTeams();
    setIsRefreshing(false);
  };

  // Screen renders instantly with cached data
  return (
    <FlatList
      data={teams}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    />
  );
};
```

### Optimistic Updates

**Update UI immediately, sync in background:**

```typescript
const handleJoinTeam = async (teamId: string) => {
  // 1. Update local state immediately
  setLocalTeams(prev => [...prev, team]);

  // 2. Update cache
  unifiedCache.set(CacheKeys.USER_TEAMS(userPubkey), [...teams, team]);

  // 3. Publish to Nostr in background
  try {
    await publishJoinRequest(teamId);
  } catch (error) {
    // Rollback on failure
    setLocalTeams(prev => prev.filter(t => t.id !== teamId));
    showError('Failed to join team');
  }
};
```

## Leaderboard Optimization

### Problem: Slow Real-Time Calculation

```typescript
// ❌ Recalculate every render
const rankings = useMemo(() => {
  return calculateRankings(members, workouts, competitionParams);
}, [members, workouts, competitionParams]);  // Expensive!
```

### Solution: Cached with Incremental Updates

```typescript
// ✅ Cache leaderboard, update only when new workouts
const [rankings, setRankings] = useState([]);

useEffect(() => {
  const cacheKey = CacheKeys.LEADERBOARD(competitionId);

  // Get cached leaderboard (instant)
  const cached = unifiedCache.getCached(cacheKey);
  if (cached) {
    setRankings(cached);
  }

  // Recalculate every 5 minutes or on manual refresh
  const calculate = async () => {
    const fresh = await unifiedCache.get(
      cacheKey,
      () => calculateRankings(members, workouts, competitionParams),
      { ttl: 5 * 60 * 1000 }  // 5-minute cache
    );
    setRankings(fresh);
  };

  calculate();
}, [competitionId]);
```

## Expected Performance Improvements

### Before Optimization
- App startup: 5-6 seconds before interactive
- Screen navigation: 1-2 second loading states
- Team discovery: 3-4 seconds to show results
- Leaderboard: 2-3 seconds to calculate rankings

### After Optimization
- App startup: 2-3 seconds (splash screen only)
- Screen navigation: Instant (0 loading states)
- Team discovery: Instant from cache
- Leaderboard: Instant from 5-minute cache

## Implementation Priority

### Phase 1: Prefetching (Highest Impact)
**Expected: 70% faster perceived performance**

1. Update `SplashInitScreen` to prefetch all critical data
2. Eliminate loading states from main screens (Teams, Profile)
3. Implement cache-first rendering pattern

### Phase 2: Local Database (Medium Impact)
**Expected: Instant workout display**

1. Store workouts locally in SQLite/AsyncStorage
2. Sync to Nostr only on user action (publish)
3. Background sync every 15 minutes

### Phase 3: Smart Invalidation (Low Impact)
**Expected: Always fresh data without manual refresh**

1. Event-driven cache invalidation
2. Auto-refresh on Nostr event reception
3. WebSocket subscriptions for real-time updates

## Cache Invalidation Strategies

### Manual Invalidation
```typescript
// Clear specific cache key
await unifiedCache.invalidate(CacheKeys.USER_TEAMS(pubkey));

// Clear all caches for a user
await unifiedCache.invalidatePattern(`user_*_${pubkey}`);
```

### Event-Driven Invalidation
```typescript
// Listen for Nostr events that affect cached data
ndk.subscribe({ kinds: [1104] }, {
  onEvent: (event) => {
    // Join request received - invalidate team members cache
    unifiedCache.invalidate(CacheKeys.TEAM_MEMBERS(event.teamId));
  }
});
```

### Time-Based Invalidation
```typescript
// Automatic cleanup of expired cache entries
setInterval(() => {
  unifiedCache.cleanup();  // Removes expired entries
}, 60 * 1000);  // Every minute
```

## Memory Management

### Cache Size Limits
```typescript
const CACHE_SIZE_LIMIT = 50 * 1024 * 1024;  // 50MB

// Implement LRU (Least Recently Used) eviction
class UnifiedCache {
  evictOldest() {
    const entries = this.getAllEntries().sort((a, b) => a.lastAccessed - b.lastAccessed);
    while (this.getCurrentSize() > CACHE_SIZE_LIMIT && entries.length > 0) {
      this.remove(entries.shift().key);
    }
  }
}
```

### Image Caching
```typescript
// Use react-native-fast-image for profile pictures
import FastImage from 'react-native-fast-image';

<FastImage
  source={{
    uri: profilePicture,
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable  // Cache forever
  }}
/>
```

## Monitoring & Debugging

### Cache Hit Rate Tracking
```typescript
class UnifiedCache {
  private hits = 0;
  private misses = 0;

  getHitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }

  logStats() {
    console.log(`Cache hit rate: ${this.getHitRate().toFixed(2)}%`);
  }
}
```

### Performance Profiling
```typescript
import { performance } from 'react-native-performance';

const start = performance.now();
await fetchDataWithCache(key);
const duration = performance.now() - start;

console.log(`Cache fetch took ${duration}ms`);
```

## Best Practices

1. **Always cache-first**: Show cached data immediately, fetch fresh in background
2. **Set appropriate TTLs**: Balance freshness vs performance
3. **Batch Nostr queries**: Combine multiple filters into single query
4. **Use optimistic updates**: Update UI before network confirmation
5. **Monitor cache hit rates**: Aim for >80% cache hit rate
6. **Implement graceful degradation**: App should work even if cache fails
7. **Clear cache on logout**: Prevent data leaks between users

## Related Documentation

- 📖 **For caching implementation**: See `src/utils/cache/UnifiedNostrCache.ts`
- 📖 **For data architecture**: [DATA_ARCHITECTURE_AND_CACHING_STRATEGY.md](./DATA_ARCHITECTURE_AND_CACHING_STRATEGY.md)
- 📖 **For Nostr optimization**: [nostr-native-fitness-competitions.md](./events-and-leagues.md)
