# RUNSTR Caching Implementation Guide

## Overview
This guide explains how to implement our new unified caching system to eliminate duplicate Nostr queries and improve app performance.

## Architecture Components

### 1. UnifiedCacheService (`src/services/cache/UnifiedCacheService.ts`)
- Central cache management with automatic deduplication
- Two-tier storage (memory + AsyncStorage)
- Configurable TTLs per data type

### 2. CacheInvalidator (`src/services/cache/CacheInvalidator.ts`)
- Smart cascade invalidation when data changes
- Pattern-based cache clearing
- Event-driven cache updates

### 3. Cache-Aware Hooks (`src/hooks/useCachedData.ts`)
- React hooks that transparently handle caching
- Automatic refresh and loading states
- Pull-to-refresh support

## Migration Strategy

### Phase 1: Identify High-Impact Components
Start with components that make frequent Nostr queries:
- ✅ LeagueRankingsSection → LeagueRankingsSectionCached
- ⏳ TeamDiscoveryScreen
- ⏳ ProfileScreen
- ⏳ WorkoutHistoryScreen
- ⏳ CaptainDashboardScreen

### Phase 2: Component Migration Pattern

#### Before (Direct Service Calls):
```typescript
// OLD: Component directly calls services
const LeagueRankingsSection = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // This hits Nostr EVERY render!
      const members = await TeamMemberCache.getTeamMembers(teamId, captainPubkey);
      const rankings = await leagueRankingService.getRankings(competitionId, members, params);
      setRankings(rankings);
      setLoading(false);
    };

    fetchData();
  }, [competitionId]);

  if (loading) return <ActivityIndicator />;
  return <View>{/* render rankings */}</View>;
};
```

#### After (Cache-Aware Hooks):
```typescript
// NEW: Component uses cache-aware hooks
const LeagueRankingsSectionCached = () => {
  // Hooks handle ALL caching logic!
  const { members } = useTeamMembers(teamId, captainPubkey);
  const { rankings, loading, refetch } = useLeagueRankings(competitionId, parameters, members);

  if (loading) return <ActivityIndicator />;

  return (
    <ScrollView
      refreshControl={
        <RefreshControl onRefresh={refetch} />
      }
    >
      {/* render rankings */}
    </ScrollView>
  );
};
```

## Implementation Steps

### Step 1: Add Cache Layer to Services
For each service that queries Nostr, wrap the query in UnifiedCacheService:

```typescript
// In any service file
async function fetchTeamData(teamId: string) {
  return UnifiedCacheService.fetch(
    `team:${teamId}`,
    async () => {
      // Original Nostr query logic here
      return NostrTeamService.getInstance().getTeam(teamId);
    },
    'teams' // TTL key from config
  );
}
```

### Step 2: Create Custom Hook
For each data type, create a hook in `useCachedData.ts`:

```typescript
export function useTeamData(teamId: string) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async (bypassCache = false) => {
    const data = bypassCache
      ? await UnifiedCacheService.forceFetch(...)
      : await UnifiedCacheService.fetch(...);
    setTeam(data);
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  return { team, loading, refetch: () => fetchTeam(true) };
}
```

### Step 3: Wire Invalidation
Add cache invalidation at data mutation points:

```typescript
// When user posts workout
async function postWorkout(workout: NostrWorkout) {
  await publishToNostr(workout);
  // Invalidate related caches
  CacheInvalidator.onWorkoutPosted(userNpub, teamId);
}

// When captain approves member
async function approveMember(memberNpub: string) {
  await addToNostrList(memberNpub);
  // Invalidate team caches
  CacheInvalidator.onMemberAdded(teamId, memberNpub);
}
```

## Cache Configuration

### TTL Settings
```typescript
// In UnifiedCacheService.ts
private static readonly TTL = {
  profiles: 120 * 60 * 1000,     // 2 hours - rarely changes
  teams: 60 * 60 * 1000,          // 1 hour - stable data
  members: 5 * 60 * 1000,         // 5 minutes - can change frequently
  workouts: 5 * 60 * 1000,        // 5 minutes - new posts often
  leaderboards: 5 * 60 * 1000,    // 5 minutes - needs freshness
  competitions: 30 * 60 * 1000,   // 30 minutes - settings stable
};
```

### Cache Key Patterns
Use consistent, descriptive cache keys:
```typescript
// Good cache keys
`profile:${npub}`
`team:${teamId}`
`members:${teamId}:${captainPubkey}`
`rankings:${competitionId}:${JSON.stringify(params)}`
`workouts:${npub}:${startDate}:${endDate}`

// Pattern-based invalidation
`rankings:*${teamId}*`  // Invalidates all rankings for a team
`workouts:*${npub}*`    // Invalidates all workouts for a user
```

## Performance Benefits

### Before Implementation
- **Problem**: LeagueRankingsSection queries Nostr 3-5 times per render
- **Impact**: 100+ Nostr queries per minute during active use
- **UX**: 2-3 second delays on every navigation

### After Implementation
- **Solution**: Cache deduplicates queries, serves instant cached data
- **Impact**: 90% reduction in Nostr queries
- **UX**: Instant navigation, background refresh

## Testing the Cache

### 1. Monitor Cache Hits
```typescript
// Enable cache logging
UnifiedCacheService.getStats(); // Shows cache statistics
```

### 2. Test Invalidation
```typescript
// Post workout → Check leaderboard updates
// Add member → Check member list updates
// Update profile → Check profile refreshes
```

### 3. Test Offline Mode
```typescript
// Load data → Go offline → Navigate
// Should show cached data instantly
```

## Common Pitfalls to Avoid

### ❌ Don't Cache Sensitive Data
```typescript
// BAD: Caching private keys or sensitive auth
UnifiedCacheService.fetch('private:key', ...);

// GOOD: Only cache public Nostr data
UnifiedCacheService.fetch('profile:npub...', ...);
```

### ❌ Don't Over-Cache
```typescript
// BAD: Caching computed UI state
UnifiedCacheService.fetch('ui:scroll:position', ...);

// GOOD: Cache source data, compute UI state
UnifiedCacheService.fetch('workouts:list', ...);
```

### ❌ Don't Forget Invalidation
```typescript
// BAD: Update data without invalidating cache
await updateProfile(newData);

// GOOD: Invalidate after updates
await updateProfile(newData);
CacheInvalidator.onProfileUpdated(npub);
```

## Rollout Plan

### Week 1: Core Infrastructure
- ✅ Deploy UnifiedCacheService
- ✅ Deploy CacheInvalidator
- ✅ Deploy useCachedData hooks

### Week 2: High-Impact Screens
- Convert TeamDiscoveryScreen
- Convert ProfileScreen
- Convert WorkoutHistoryScreen

### Week 3: Competition Features
- Convert all League components
- Convert Event components
- Convert Challenge components

### Week 4: Captain Features
- Convert CaptainDashboardScreen
- Convert member management
- Convert competition creation wizards

## Monitoring & Metrics

Track these metrics to measure success:
1. **Cache Hit Rate**: Target >80% for profiles, >60% for dynamic data
2. **Nostr Query Reduction**: Target 90% reduction in queries
3. **Load Time Improvement**: Target <100ms for cached screens
4. **User Experience**: Pull-to-refresh adoption rate

## Support & Troubleshooting

### Debug Cache Issues
```typescript
// Check what's in cache
const stats = UnifiedCacheService.getStats();
console.log('Cache entries:', stats);

// Force clear specific cache
await UnifiedCacheService.invalidate('profile:*');

// Nuclear option - clear everything
await CacheInvalidator.clearAll();
```

### Common Issues

**Issue**: Data not updating after change
**Solution**: Check invalidation is triggered at mutation point

**Issue**: Cache growing too large
**Solution**: Reduce TTLs or implement cache pruning

**Issue**: Stale data showing
**Solution**: Verify TTL settings and refresh logic

## Conclusion

This caching system will dramatically improve RUNSTR's performance by:
- Eliminating 90% of duplicate Nostr queries
- Providing instant navigation between screens
- Improving offline functionality
- Reducing battery and data usage

Start with high-impact components and gradually migrate the entire app to use cache-aware hooks for optimal performance.