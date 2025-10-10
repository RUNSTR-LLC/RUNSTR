# RUNSTR Data Architecture & Caching Strategy

**Purpose**: Comprehensive guide for implementing optimal cache strategy
**Audience**: Senior developers evaluating caching approach
**Date**: January 2025

---

## Executive Summary

**App Type**: Decentralized fitness social app powered by Nostr protocol
**Data Sources**: 100% Nostr relays (no traditional backend/database)
**Screens**: 32 screens total
**Active Relays**: 3 relays (Damus, nos.lol, Nostr.band)
**Current Cache**: Custom UnifiedNostrCache with AsyncStorage persistence

**Key Challenges**:
- All data fetched via WebSocket subscriptions from distributed relays
- No centralized server to invalidate caches or push updates
- Relay response times vary (200ms-5s depending on query complexity)
- Mobile network constraints (battery, data usage, offline scenarios)

---

## Data Architecture Map

### 1. Nostr Event Kinds We Query (Grouped by Update Frequency)

#### **STATIC Data - Updates: Rarely (hours/days)**

| Kind | Type | Description | Current Fetch Location | Update Trigger |
|------|------|-------------|------------------------|----------------|
| **0** | Profile Metadata | User name, bio, picture, banner | `NostrProfileService`, `DirectNostrProfileService` | User edits profile (manual) |
| **33404** | Team Metadata | Team name, description, captain, member count | `NdkTeamService`, `TeamCacheService` | Captain edits team settings (rare) |

**Characteristics**:
- Changes only when user explicitly edits
- Safe to cache for 12-24 hours
- Mutations are WRITES only (we control when they change)
- Pull-to-refresh ideal for manual updates

---

#### **SEMI-STATIC Data - Updates: Occasionally (30 min - 6 hours)**

| Kind | Type | Description | Current Fetch Location | Update Trigger |
|------|------|-------------|------------------------|----------------|
| **30000** | Team Member Lists | Who's on each team (single source of truth) | `TeamMemberCache`, `Season1Service` | User joins/leaves team |
| **30001** | Generic Lists | Secondary team lists | `NostrListService` | Team roster changes |
| **30100** | League Definitions | Long-running competitions | `SimpleCompetitionService` | Captain creates league (rare) |
| **30101** | Event Definitions | Time-bounded competitions | `SimpleCompetitionService` | Captain creates event (occasional) |
| **1301** | Workout Events | Distance, duration, calories, activity type | `Nuclear1301Service`, `SimpleWorkoutService`, `Competition1301QueryService` | User posts workout (daily) |

**Characteristics**:
- Changes when users perform actions (join team, post workout)
- Tolerate staleness of 1-6 hours for display
- Need cache invalidation when USER creates/joins
- Background refresh acceptable for others' updates

---

#### **DYNAMIC Data - Updates: Frequently (1-15 minutes)**

| Kind | Type | Description | Current Fetch Location | Update Trigger |
|------|------|-------------|------------------------|----------------|
| **1104** | Team Join Requests | Pending membership requests | `JoinRequestService`, `TeamJoinRequestService` | User requests to join |
| **1105** | Event Join Requests / Challenge Requests | Competition entry requests | `EventJoinRequestService`, `ChallengeRequestService` | User joins event/challenge |
| **1106** | Challenge Acceptances | 1v1 challenge accepted | `ChallengeRequestService` | User accepts challenge |
| **1107** | Challenge Declines | 1v1 challenge declined | `ChallengeRequestService` | User declines challenge |
| **1101** | Competition Announcements | New competition notifications | `NostrNotificationEventHandler` | Captain announces competition |
| **1102** | Competition Results | Leaderboard final results | `NostrNotificationEventHandler` | Competition ends |
| **1103** | Competition Starting Soon | Reminders | `NostrNotificationEventHandler` | 24h before competition |

**Characteristics**:
- Changes as users interact with app
- Captains need real-time view of join requests
- Cache for 1-5 minutes to reduce query spam
- Pull-to-refresh critical for captains

---

#### **REAL-TIME Data - Updates: Constantly (<30 seconds)**

| Kind | Type | Description | Current Fetch Location | Update Trigger |
|------|------|-------------|------------------------|----------------|
| **37375** | Wallet Info | Lightning wallet config (NIP-60) | `WalletDetectionService`, `WalletSync` | Wallet setup/changes |
| **9321** | Nutzap Events | P2P Bitcoin payment receipts | `WalletSync` | Incoming/outgoing zaps |
| **7375** | Token Events | Ecash balance tracking | `WalletSync` | Balance changes |
| **3** | Contact Lists | Social graph | `NostrProtocolHandler` | User adds contact |
| **1** | Text Notes | Social posts | `NostrProtocolHandler` | User posts text |

**Characteristics**:
- Cannot tolerate staleness (wallet balance, payments)
- Should bypass cache or use <30s TTL
- Requires real-time subscriptions, not polling
- Users expect instant updates

---

## Screen-by-Screen Data Requirements (32 Screens)

### **High-Traffic Screens (Visit Multiple Times Per Session)**

#### 1. **ProfileScreen** (`ProfileScreen.tsx`)
**Data Fetched**:
- User profile (kind 0) - from `DirectNostrProfileService`
- User teams (kind 30000 filtered by user) - from `TeamCacheService`
- User workouts (kind 1301 filtered by user) - from `Nuclear1301Service`
- Wallet balance (kind 37375, 7375) - from `WalletSync`
- Notifications (kinds 1101, 1102, 1103) - from `NostrNotificationEventHandler`

**Staleness Tolerance**: Profile/teams can be hours old, wallet must be <1 minute
**Current Fetch Pattern**: Fetches on mount, has RefreshControl
**Cache Priority**: HIGH - users return here constantly

---

#### 2. **TeamDiscoveryScreen** (`TeamDiscoveryScreen.tsx`)
**Data Fetched**:
- All teams (kind 33404) - from `NdkTeamService`, `TeamCacheService`
- Events (kind 30101) - from `SimpleCompetitionService`
- Captain status - from `CaptainDetectionService`

**Staleness Tolerance**: Teams can be 6-12 hours old (new teams rare)
**Current Fetch Pattern**: Fetches on mount with cache check (lines 181-225), has RefreshControl
**Cache Priority**: HIGH - main discovery screen
**Special Note**: This is the EXPENSIVE query (ALL 33404 events globally, 5-10s)

---

#### 3. **SimpleTeamScreen** (Team Detail) (`SimpleTeamScreen.tsx`)
**Data Fetched**:
- Team metadata (kind 33404)
- Team members (kind 30000)
- Team leaderboard (kind 1301 aggregated from members)
- Team events (kind 30101 filtered by team)
- Team challenges (kind 1105, 1106)

**Staleness Tolerance**: Metadata/members 2-6 hours, leaderboard 15 minutes
**Current Fetch Pattern**: Has RefreshControl
**Cache Priority**: MEDIUM - users view specific teams less often than discovery

---

#### 4. **MyTeamsScreen** (`MyTeamsScreen.tsx`)
**Data Fetched**:
- User's teams (kind 30000 filtered by user membership)
- Team metadata for each joined team (kind 33404)

**Staleness Tolerance**: 2-6 hours (team membership changes slowly)
**Current Fetch Pattern**: Has RefreshControl
**Cache Priority**: MEDIUM

---

### **Captain-Only Screens (Low Traffic, High Importance When Used)**

#### 5. **CaptainDashboardScreen** (`CaptainDashboardScreen.tsx`)
**Data Fetched**:
- Team members (kind 30000) - for member management
- Join requests (kind 1104) - **NEEDS REAL-TIME** for approvals
- Team activity - from multiple kinds
- Team metadata (kind 33404)

**Staleness Tolerance**: Join requests CANNOT be stale (captains approve/deny), metadata can be hours
**Current Fetch Pattern**: Uses backgroundRefresh (line 195 in grep results)
**Cache Priority**: LOW frequency, HIGH importance for freshness
**Special Requirement**: Join requests need <1 minute TTL or real-time subscription

---

#### 6. **EventCaptainDashboardScreen** (`EventCaptainDashboardScreen.tsx`)
**Data Fetched**:
- Event join requests (kind 1105)
- Event participants (kind 30000 filtered by event)
- Event leaderboard (kind 1301 from participants)

**Staleness Tolerance**: Same as CaptainDashboard - requests <1 min, leaderboard 5-15 min
**Cache Priority**: LOW frequency, HIGH importance

---

### **Competition Screens (Moderate Traffic)**

#### 7. **EventDetailScreen** (`EventDetailScreen.tsx`)
**Data Fetched**:
- Event definition (kind 30101)
- Event leaderboard (kind 1301 from participants)
- Event participants (kind 30000)

**Staleness Tolerance**: 15-30 minutes for leaderboard, hours for definition
**Current Fetch Pattern**: Has RefreshControl
**Cache Priority**: MEDIUM

---

#### 8. **LeagueDetailScreen** (`LeagueDetailScreen.tsx`)
**Data Fetched**:
- League definition (kind 30100)
- League leaderboard (kind 1301 from participants)

**Staleness Tolerance**: 15-30 minutes for active leagues
**Cache Priority**: MEDIUM

---

#### 9. **CompetitionsListScreen** (`CompetitionsListScreen.tsx`)
**Data Fetched**:
- All leagues (kind 30100)
- All events (kind 30101)

**Staleness Tolerance**: 1-6 hours (competitions created rarely)
**Current Fetch Pattern**: Has RefreshControl
**Cache Priority**: LOW

---

### **Wallet Screens (Real-Time Requirements)**

#### 10. **WalletScreen** (via ProfileScreen's CompactWallet)
**Data Fetched**:
- Wallet balance (kind 37375, 7375) - **MUST BE REAL-TIME**
- Transaction history (kind 9321) - recent transactions <1 min

**Staleness Tolerance**: ZERO - users checking balance expect accuracy
**Cache Priority**: HIGH frequency, ZERO staleness tolerance
**Special Requirement**: Real-time subscription, not cache

---

### **Settings/Support Screens (Low Traffic)**

11. **SettingsScreen** (`SettingsScreen.tsx`) - Has RefreshControl
12. **HelpSupportScreen** - Static content
13. **ContactSupportScreen** - Static content
14. **PrivacyPolicyScreen** - Static content

**Cache Priority**: NONE - static or infrequent

---

### **Workout Screens (Moderate Traffic)**

#### 15. **WorkoutHistoryScreen** (`WorkoutHistoryScreen.tsx`)
**Data Fetched**:
- User workouts (kind 1301 filtered by user)
- HealthKit data (local device)

**Staleness Tolerance**: 15-60 minutes (workouts posted occasionally)
**Cache Priority**: MEDIUM
**Special Note**: Combines Nostr + HealthKit, partial cache

---

### **Other Screens** (16-32)
- **OnboardingScreen** - Static flow, no data
- **LoginScreen** - Auth only
- **ProfileEditScreen** - Writes kind 0, reads from cache
- **QRScannerModal** - Local operation
- **Various Wizards** (TeamCreation, EventCreation, etc.) - Writes only
- **Challenge Screens** (Detail, Leaderboard) - Similar to Event screens

---

## Mutation Points Requiring Cache Invalidation

### **Critical: User-Initiated Writes (MUST Invalidate Immediately)**

| Action | Event Created | Caches to Invalidate | Current Implementation |
|--------|--------------|---------------------|------------------------|
| **Post Workout** | kind 1301 | `user_workouts_{pubkey}`, all leaderboards user participates in | `workoutPublishingService.ts` - NO INVALIDATION ❌ |
| **Update Profile** | kind 0 | `user_profile_{pubkey}` | `NostrProfilePublisher.ts` - NO INVALIDATION ❌ |
| **Join Team** | kind 30000 update | `team_members_{teamId}`, `user_teams_{pubkey}` | Team join flow - NO INVALIDATION ❌ |
| **Create Competition** | kind 30100/30101 | `competitions`, `discovered_teams` | Wizard flows - NO INVALIDATION ❌ |
| **Send Zap** | kind 9321 | `wallet_balance_{pubkey}`, `transaction_history` | `LightningZapService.ts` - NO INVALIDATION ❌ |
| **Approve Join Request** | kind 30000 update | `team_members_{teamId}`, `join_requests_{teamId}` | Captain dashboard - NO INVALIDATION ❌ |

**Current State**: ⚠️ **NO CACHE INVALIDATION EXISTS** - This is a critical gap!

**Example of Missing Logic**:
```typescript
// When user posts workout (workoutPublishingService.ts):
const event = await publishWorkout(data);
// ❌ MISSING:
// unifiedCache.invalidate(`user_workouts_${pubkey}`);
// unifiedCache.invalidate(`leaderboard_*`); // All leaderboards user is in
```

---

### **Lower Priority: External Writes (Can Tolerate Delay)**

| Action | Caches Affected | Strategy |
|--------|-----------------|----------|
| Another user posts workout | Leaderboards | Background refresh acceptable, 5-15 min TTL |
| Another user joins team | Team member count | Background refresh acceptable, 30 min TTL |
| Captain edits team info | Team metadata | Background refresh acceptable, 6 hour TTL |
| New team created (not by you) | Discovered teams list | Background refresh acceptable, 12 hour TTL |

**Strategy**: Don't need immediate invalidation - rely on TTL expiration + pull-to-refresh

---

## Real-Time vs Stale-Tolerant Breakdown

### **ZERO Staleness Tolerance (Real-Time Required)**
1. **Wallet Balance** - Users checking money
2. **Incoming Zaps** - Payment notifications
3. **Join Requests (Captain View)** - Approval workflow
4. **Live Competition Updates** - During active event

**Strategy**: Real-time subscriptions, bypass cache entirely or <30s TTL

---

### **Low Staleness Tolerance (1-5 minutes)**
1. **Leaderboards** - During active competitions
2. **Recent Workouts** - User's own activity feed
3. **Notifications** - Competition announcements

**Strategy**: Short TTL (1-5 min) + pull-to-refresh

---

### **Medium Staleness Tolerance (15-60 minutes)**
1. **Team Member Lists** - Roster changes slow
2. **User Workouts History** - Historical data stable
3. **Event Definitions** - Fixed once created
4. **Team Activity Feed** - Social updates

**Strategy**: Medium TTL (15-60 min) + background refresh

---

### **High Staleness Tolerance (2-24 hours)**
1. **User Profiles** - Rarely updated
2. **Team Metadata** - Captain edits infrequent
3. **Discovered Teams** - New teams rare
4. **Competition Definitions** - Created once, never change
5. **League Definitions** - Long-running, stable

**Strategy**: Long TTL (6-24 hours) + pull-to-refresh only

---

## Current Fetch Patterns & Bottlenecks

### **Problem Areas Identified**

#### 1. **Team Discovery Bottleneck**
**File**: `NdkTeamService.ts`, `TeamDiscoveryScreen.tsx`
**Issue**: Fetches ALL kind 33404 events globally (unbounded query)
**Time**: 5-10 seconds on good network, 15-20s on slow network
**Impact**: Blocks main Teams tab navigation

**Current Mitigation (Just Implemented)**:
- Removed from SplashInit prefetch
- Now lazy-loads when user opens Teams tab
- Has cache via TeamCacheService (1 hour TTL)

**Ideal Strategy**:
- Cache for 12-24 hours (teams created rarely)
- Background refresh on app focus
- Pull-to-refresh for manual update

---

#### 2. **Leaderboard Query Performance**
**File**: `Competition1301QueryService.ts`, `SimpleLeaderboardService.ts`
**Issue**: Queries kind 1301 from all team members (50-100 users × 500 workouts each)
**Time**: 3-8 seconds for active team
**Impact**: Leaderboard screens feel slow

**Current State**: 5-minute TTL, blocks on mount

**Ideal Strategy**:
- Cache for 15 minutes (acceptable staleness)
- Background refresh + stale data indicator
- Pull-to-refresh for manual update

---

#### 3. **Wallet Balance Fetching**
**File**: `WalletSync.ts`, `useNutzap.tsx`
**Issue**: Auto-fetches every 30 seconds via interval
**Impact**: Background network activity, battery drain

**Current State**: Interval-based polling (30s)

**Ideal Strategy**:
- Real-time subscription to kind 9321 (nutzaps)
- Update balance ONLY when payment event received
- Manual refresh button for paranoid users

---

#### 4. **Workout History Pagination**
**File**: `Nuclear1301Service.ts`, `WorkoutHistoryScreen.tsx`
**Issue**: Fetches all 500 workouts at once (5s delay)
**Impact**: Initial load slow, wastes bandwidth for old workouts

**Current State**: Fetches 500 workouts, 15-minute TTL

**Ideal Strategy**:
- Paginated loading (50 at a time)
- Cache first page for 4 hours (recent workouts)
- Infinite scroll loads more on demand

---

## Network Characteristics

**Relay Response Times** (based on production testing):
- **Profile queries (kind 0)**: 200-800ms
- **Team discovery (kind 33404)**: 5-10s (hundreds of events)
- **Workout queries (kind 1301)**: 2-5s (depends on user, 50-500 events)
- **Member lists (kind 30000)**: 500ms-2s
- **Join requests (kind 1104/1105)**: 300ms-1s

**Connection Characteristics**:
- WebSocket-based subscriptions
- 3 concurrent relay connections (Damus, nos.lol, Nostr.band)
- Network failures handled with 3s-10s timeouts
- No server-side push (client polls or subscribes)

---

## Recommended Cache Strategy (Tier System)

Based on the above analysis, here's the recommended tiered approach:

### **Tier 1: Static Data (12-24 hour TTL)**
```typescript
{
  USER_PROFILE: 24 * HOUR,
  TEAM_METADATA: 12 * HOUR,
  DISCOVERED_TEAMS: 12 * HOUR,
  COMPETITION_DEFINITIONS: 24 * HOUR,
}
```
**Invalidation**: On user WRITE only (profile edit, team edit)
**Refresh**: Pull-to-refresh

---

### **Tier 2: Social Data (2-6 hour TTL)**
```typescript
{
  USER_WORKOUTS: 4 * HOUR,
  TEAM_MEMBERS: 6 * HOUR,
  USER_TEAMS: 6 * HOUR,
}
```
**Invalidation**: On user JOIN/POST actions
**Refresh**: Background refresh + pull-to-refresh

---

### **Tier 3: Competitive Data (15 min - 1 hour TTL)**
```typescript
{
  LEADERBOARDS: 15 * MINUTE,
  EVENT_PARTICIPANTS: 30 * MINUTE,
  TEAM_ACTIVITY: 1 * HOUR,
}
```
**Invalidation**: On user participation changes
**Refresh**: Background refresh with stale indicator

---

### **Tier 4: Interactive Data (1-5 minute TTL)**
```typescript
{
  JOIN_REQUESTS: 2 * MINUTE, // Captains need freshness
  NOTIFICATIONS: 1 * MINUTE,
  RECENT_WORKOUTS: 5 * MINUTE,
}
```
**Invalidation**: On user actions
**Refresh**: Pull-to-refresh primary, background secondary

---

### **Tier 5: Real-Time Data (Bypass Cache)**
```typescript
{
  WALLET_BALANCE: 0, // Real-time subscription
  NUTZAPS: 0, // Real-time subscription
  LIVE_WORKOUTS: 0, // Active tracking
}
```
**Strategy**: WebSocket subscriptions, no cache

---

## Critical Missing Pieces

### 1. **Cache Invalidation System** ❌
**Status**: NOT IMPLEMENTED
**Impact**: Users see stale data after their own writes
**Priority**: CRITICAL

**Needed Implementation**:
```typescript
// After any user write:
class CacheInvalidator {
  static async onWorkoutPosted(pubkey: string, workout: Workout) {
    await unifiedCache.invalidate(`user_workouts_${pubkey}`);

    // Invalidate all leaderboards user participates in
    const userTeams = await getUserTeams(pubkey);
    for (const team of userTeams) {
      await unifiedCache.invalidatePattern(`leaderboard_${team.id}*`);
    }
  }

  static async onProfileUpdated(pubkey: string) {
    await unifiedCache.invalidate(`user_profile_${pubkey}`);
  }

  static async onTeamJoined(pubkey: string, teamId: string) {
    await unifiedCache.invalidate(`user_teams_${pubkey}`);
    await unifiedCache.invalidate(`team_members_${teamId}`);
  }
}
```

---

### 2. **Request Cancellation** ❌
**Status**: NOT IMPLEMENTED
**Impact**: Race conditions when user pulls-to-refresh during background fetch
**Priority**: HIGH

**Needed Implementation**:
```typescript
// In each screen:
const abortControllerRef = useRef<AbortController>();

const fetchData = async (forceRefresh = false) => {
  // Cancel previous request
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();

  // Fetch with cancellation support
  await fetchFromNostr({ signal: abortControllerRef.current.signal });
};
```

---

### 3. **Cache Size Management** ⚠️
**Status**: PARTIAL (AsyncStorage has limits, no active eviction)
**Impact**: App might crash with "QuotaExceededError" after months of use
**Priority**: MEDIUM

**Needed Implementation**:
- LRU eviction when cache exceeds 50MB
- Periodic cleanup of expired entries
- User-facing "Clear Cache" option in Settings

---

### 4. **Offline Detection** ⚠️
**Status**: NOT IMPLEMENTED
**Impact**: App shows loading spinners when offline instead of cached data
**Priority**: MEDIUM

**Needed Implementation**:
```typescript
import NetInfo from '@react-native-community/netinfo';

const isOnline = await NetInfo.fetch().then(state => state.isConnected);

if (!isOnline) {
  // Return cached data immediately
  return unifiedCache.getCached(key) || fallbackData;
}
```

---

## Recommended Immediate Actions

### **Phase 1: Critical Fixes (Week 1)** 🔴
1. Implement cache invalidation for user writes
2. Add request cancellation to prevent race conditions
3. Fix TTL strategy (tiered approach, not 24h everything)
4. Add offline detection (show cache when no network)

### **Phase 2: UX Improvements (Week 2)** 🟡
5. Add stale data indicators ("Updated 2h ago")
6. Implement background refresh with visual feedback
7. Add cache hit/miss analytics
8. Optimize expensive queries (team discovery pagination)

### **Phase 3: Infrastructure (Week 3)** 🟢
9. Evaluate React Query migration vs enhance custom cache
10. Add cache size management and eviction
11. Network-aware caching (WiFi vs cellular TTLs)
12. Performance monitoring (Time-To-Interactive metrics)

---

## Key Metrics to Track

Once cache strategy is implemented, track:

1. **Cache Hit Rate**: Target >80% for returning users
2. **Time-To-Interactive**: Target <500ms for cached screens
3. **Network Requests**: Target 50% reduction vs current
4. **User Complaints**: "Why don't I see my workout?" = invalidation bug

---

## Questions for Senior Dev Review

1. **React Query vs Custom Cache**: Given our Nostr-specific patterns (WebSocket subscriptions, no REST APIs), would React Query still be beneficial?

2. **Real-Time Subscriptions**: Should wallet balance and join requests use persistent WebSocket subscriptions instead of polling?

3. **Pagination Strategy**: Should we paginate team discovery (kind 33404) or continue fetching all teams with longer cache?

4. **Cache Invalidation Patterns**: What's the best pattern for invalidating leaderboards when user posts workout (affects multiple competitions)?

5. **Offline-First**: Should we support full offline mode (write workouts offline, sync when back online) or just read-only cache?

---

## Conclusion

**Current State**: Good cache infrastructure (UnifiedNostrCache), but missing critical pieces (invalidation, tiered TTLs, request cancellation)

**Biggest Risks**:
- Users see stale data after their own writes (no invalidation)
- Race conditions between background refresh and pull-to-refresh
- Memory issues from unlimited cache growth

**Biggest Opportunities**:
- 80% of screens can load instantly from cache
- 60% reduction in network requests possible
- Battery life improvement from smarter refresh strategy

**Recommended Path**: Enhance current custom cache with missing pieces before considering React Query migration. The cache infrastructure is solid, just needs proper invalidation and tiered TTL strategy.
