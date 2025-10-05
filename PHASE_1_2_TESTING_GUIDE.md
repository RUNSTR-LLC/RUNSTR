# Phase 1 + 2 Testing Guide
**Testing UnifiedCache + Comprehensive Prefetching**

---

## Pre-Test Setup

### 1. Clear App Data (Fresh Start)
To test from a clean slate:

**iOS Simulator:**
1. Stop the app if running
2. In Simulator: Device → Erase All Content and Settings
3. OR delete app and reinstall

**Alternative - Clear AsyncStorage programmatically:**
```bash
# We'll add a quick clear script if needed
```

### 2. Ensure Metro is Running
```bash
# Check Metro status
lsof -ti:8081

# If not running, start it:
npx expo start --ios --clear
```

---

## Test Sequence

### ✅ Test 1: Fresh Login with Prefetch (Phase 2)
**Goal:** Verify SplashInit prefetches all data with progress

**Steps:**
1. Launch app (should show login screen)
2. Enter your nsec and login
3. **Watch SplashInit progress bar**

**Expected Behavior:**
- SplashInit should show 7 steps:
  1. "Connecting to Nostr..."
  2. "Loading your profile..."
  3. "Finding your teams..."
  4. "Discovering teams..."
  5. "Loading workouts..."
  6. "Loading wallet..."
  7. "Loading competitions..."
- Progress bar animates through each step
- Total time: 3-5 seconds
- Then navigates to main app

**Metro Logs to Watch For:**
```
🚀 SplashInit: Starting comprehensive prefetch...
✅ SplashInit: Nostr connected
[Prefetch 1/6] Loading your profile...
[UnifiedCache] Cache miss: user_profile_...
[UnifiedCache] Set cache: user_profile_... (ttl: 86400000ms)
[Prefetch 2/6] Finding your teams...
[UnifiedCache] Set cache: user_teams_... (ttl: 1800000ms)
...
✅ SplashInit: All data prefetched and cached - app ready!
```

**❌ Red Flags:**
- SplashInit skips steps
- Progress doesn't advance
- Takes > 10 seconds
- Errors in Metro logs

---

### ✅ Test 2: Instant Navigation (Phase 2 Goal)
**Goal:** Verify screens load instantly after prefetch

**Steps:**
1. After SplashInit completes, you're on Profile/Teams tab
2. Tap "Teams" tab
3. Tap "Profile" tab
4. Navigate to "My Teams" screen
5. Navigate back

**Expected Behavior:**
- **ZERO loading spinners** anywhere
- Instant navigation between screens
- Data appears immediately (no blank states)

**Metro Logs to Watch For:**
```
🚀 NavigationDataProvider: Reading from cache (prefetched by SplashInit)...
📦 NavigationDataProvider: Cache status: { profile: true, teams: 2, discoveredTeams: 5, wallet: true }
[UnifiedCache] Cache hit: user_profile_... (age: 2453ms)
[UnifiedCache] Cache hit: user_teams_... (age: 2461ms)
✅ NavigationDataProvider: Instant load complete from cache!
```

**❌ Red Flags:**
- Any loading spinners appear
- Blank/empty screens
- "Loading..." text anywhere
- Delays > 100ms

---

### ✅ Test 3: Cache Deduplication (Phase 1 Feature)
**Goal:** Verify multiple components don't trigger duplicate fetches

**Steps:**
1. Watch Metro logs carefully
2. Navigate between screens rapidly
3. Pull-to-refresh on Teams screen
4. Open My Teams screen

**Expected Behavior:**
- Each data type fetched only ONCE during SplashInit
- No duplicate fetches during navigation
- Pull-to-refresh triggers ONE fetch, not multiple

**Metro Logs to Watch For:**
```
[UnifiedCache] Cache hit: user_teams_... (age: 5234ms)
[UnifiedCache] Cache hit: user_teams_... (age: 5241ms)
[UnifiedCache] Cache hit: user_teams_... (age: 5248ms)
```
(Multiple cache HITS, not multiple fetches)

**❌ Red Flags:**
- Multiple fetches for same data: `[UnifiedCache] Cache miss: user_teams_...` appears multiple times
- `[FetchDedup] Deduplicating fetch for: ...` appears (means we're preventing duplication, which is good, but shouldn't happen after prefetch)

---

### ✅ Test 4: Cache Persistence (Phase 1 Feature)
**Goal:** Verify data persists across app restarts

**Steps:**
1. With app running and data loaded, force quit the app
2. Reopen the app (don't log out first)
3. Watch SplashInit

**Expected Behavior:**
- SplashInit still runs
- BUT data loads from AsyncStorage (faster)
- App ready in < 2 seconds
- All data appears immediately

**Metro Logs to Watch For:**
```
[UnifiedCache] Initializing cache from AsyncStorage...
[UnifiedCache] Loaded 6 valid cache entries
[UnifiedCache] Cache hit: user_profile_... (age: 120000ms)
```

**❌ Red Flags:**
- "Cache miss" for all data (means persistence failed)
- Same 3-5 second load time (should be faster from cache)
- Data missing after restart

---

### ✅ Test 5: Cache Subscriptions (Phase 2 Feature)
**Goal:** Verify reactive updates work

**Steps:**
1. Navigate to My Teams screen
2. Keep Metro logs visible
3. Pull-to-refresh to force a data update

**Expected Behavior:**
- Pull-to-refresh fetches fresh data
- UnifiedCache notifies subscribers
- Screen updates automatically (no manual refresh)

**Metro Logs to Watch For:**
```
[UnifiedCache] Set cache: user_teams_... (ttl: 1800000ms)
[UnifiedCache] Notifying 1 subscribers for: user_teams_...
🔄 Teams updated from cache
```

**❌ Red Flags:**
- No subscriber notifications
- Screen doesn't update after pull-to-refresh
- Need to navigate away and back to see changes

---

### ✅ Test 6: Cache Statistics (Phase 1 Debug Feature)
**Goal:** Verify cache is working as expected

**Steps:**
1. Add a temporary log in NavigationDataContext or create a debug button
2. Call `unifiedCache.getStats()`
3. Check cache size and keys

**Expected Stats:**
```javascript
{
  size: 6, // Should have ~6 entries after prefetch
  keys: [
    'user_profile_abc123...',
    'user_teams_abc123...',
    'discovered_teams',
    'user_workouts_abc123...',
    'wallet_info_abc123...',
    'competitions'
  ],
  pendingFetches: 0, // Should be 0 after prefetch completes
  subscribers: 3 // NavigationDataContext + AuthContext subscriptions
}
```

---

## Success Criteria

### Phase 1 (UnifiedCache) ✅
- [x] Cache initializes from AsyncStorage on app restart
- [x] Data persists across app restarts
- [x] No duplicate fetches (deduplication working)
- [x] Cache hits appear in logs (not misses)
- [x] Stats show correct cache size

### Phase 2 (Prefetching) ✅
- [x] SplashInit shows 7-step progress
- [x] All data prefetched before app ready
- [x] Zero loading states after SplashInit
- [x] Instant navigation between screens
- [x] Cache subscriptions trigger UI updates
- [x] NavigationDataContext reads from cache only (no fetches)
- [x] AuthContext reads from cache only

---

## Common Issues & Fixes

### Issue: SplashInit Never Completes
**Symptom:** Stuck on "Loading..." forever
**Check:**
- Metro logs for errors
- Network connectivity
- Nostr relay connections

**Fix:**
- Check `NostrPrefetchService.ts` error handling
- Verify relays are accessible

---

### Issue: Cache Always Misses
**Symptom:** Logs show `Cache miss` every time
**Check:**
- AsyncStorage permissions
- Cache keys match between set/get
- TTL not expired

**Fix:**
- Verify `CacheKeys.USER_PROFILE(hexPubkey)` uses same hexPubkey everywhere
- Check TTL values in `cacheTTL.ts`

---

### Issue: Loading Spinners Still Appear
**Symptom:** Screens show loading states after SplashInit
**Check:**
- Which screen is showing spinner?
- Is screen using UnifiedCache or old cache?
- Is screen checking `isLoading` from NavigationDataContext?

**Fix:**
- Update screen to use UnifiedCache
- Remove loading state logic from screen
- Subscribe to cache updates instead

---

### Issue: Data Not Updating
**Symptom:** Pull-to-refresh doesn't update UI
**Check:**
- Cache subscriptions set up?
- Cache notifications firing?
- Screen using subscription callback?

**Fix:**
- Add subscription in useEffect
- Check Metro logs for "Notifying X subscribers"
- Verify callback updates state

---

## Next Steps After Testing

If all tests pass:
✅ **Phase 1 + 2 are working!**
→ Proceed to Phase 3: Migrate individual screens

If tests fail:
❌ Debug and fix issues before continuing
→ Check Metro logs for specific errors
→ Review cache implementation
→ Verify prefetch service
