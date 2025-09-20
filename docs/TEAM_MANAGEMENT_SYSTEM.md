# RUNSTR Team Management System Documentation

## Overview
The RUNSTR team management system uses Nostr protocol's kind 30000 lists to maintain team membership in a decentralized way. This document outlines the implementation, data flow, and key components of the team management features.

### Latest Updates (January 2025)
✅ **Successfully Fixed**: Captain Dashboard now properly detects and displays kind 30000 member lists
✅ **Profile Display**: All member lists now show actual Nostr usernames and profile pictures
✅ **League Integration**: 30-Day Streak Challenge properly shows team members
✅ **Captain Detection**: Single source of truth with caching for captain status

## Core Concepts

### 1. Team Structure (Kind 33404 Events)
Teams are stored as Nostr kind 33404 events with the following structure:
- **Team ID**: UUID stored in the 'd' tag
- **Captain ID**: Hex pubkey stored in 'captain' tag
- **Team Name**: Stored in 'name' tag
- **Members**: Initially stored as 'member' tags (deprecated in favor of kind 30000)

### 2. Member Lists (Kind 30000 Events)
Team members are now managed through Nostr kind 30000 lists (Categorized People Lists):
- **List ID**: `{teamId}-members` stored in 'd' tag
- **Author**: Team captain's hex pubkey
- **Members**: Stored as 'p' tags containing member pubkeys
- **Replaceable**: Updates replace previous versions

## Architecture

### Key Services

#### NostrListService (`/src/services/nostr/NostrListService.ts`)
- Manages kind 30000 list operations
- Provides methods for creating, fetching, and updating member lists
- Handles npub to hex conversion for relay queries
- Caches lists locally for performance

#### TeamMemberCache (`/src/services/team/TeamMemberCache.ts`)
- 5-minute caching layer for team member lists
- Reduces relay queries for better performance
- Automatic invalidation on updates
- Falls back to NostrListService on cache miss

#### TeamListDetector (`/src/utils/teamListDetector.ts`)
- Utility for detecting existing kind 30000 lists
- Provides helper methods for list creation
- Handles d-tag generation for teams

### Data Flow

```
1. Captain creates team (kind 33404 event)
   ↓
2. System creates member list (kind 30000 event)
   - d-tag: {teamId}-members
   - Initial member: captain
   ↓
3. Members request to join (kind 1104 events)
   ↓
4. Captain approves in dashboard
   ↓
5. Member added to kind 30000 list
   ↓
6. Competitions query kind 30000 list for participants
```

## Captain Dashboard Implementation

### Key Components

#### CaptainDashboardScreen (`/src/screens/CaptainDashboardScreen.tsx`)
Main dashboard interface with:
- Member list display
- Join request management
- Competition creation buttons
- Activity feed

Key features:
- **Authentication handling**: Retrieves and validates captain credentials
- **List detection**: Checks for existing kind 30000 lists
- **Member management**: Add/remove members from list
- **Caching**: Invalidates cache on mount for fresh data

### Critical Implementation Details

#### 1. Captain ID Format Handling
```typescript
// Captain IDs can be in npub or hex format
// Always convert to hex for Nostr queries
let captainIdToUse = captainId;
if (captainId?.startsWith('npub')) {
  const converted = npubToHex(captainId);
  captainIdToUse = converted || authData?.hexPubkey || captainId;
}
```

#### 2. List Detection Logic
```typescript
// Check for kind 30000 list
const detector = getTeamListDetector();
const haslist = await detector.hasKind30000List(teamId, captainIdToUse);

// Fallback to cache if not found
if (!haslist) {
  const memberCache = TeamMemberCache.getInstance();
  const cachedMembers = await memberCache.getTeamMembers(teamId, captainIdToUse);
}
```

#### 3. Member List Creation
```typescript
// Prepare kind 30000 event template
const listData = {
  name: `${teamName} Members`,
  description: `Official member list for ${teamName}`,
  members: [captainHexPubkey], // Captain is always first member
  dTag: `${teamId}-members`,
  listType: 'people' as const
};

// Event is signed and published through NostrProtocolHandler
```

## Authentication Storage

### Storage Keys
```
@runstr:user_nsec - User's private key (nsec format)
@runstr:npub - User's public key (npub format)
@runstr:hex_pubkey - User's public key (hex format)
```

### Key Retrieval
```typescript
import { getAuthenticationData } from '../utils/nostrAuth';

const authData = await getAuthenticationData();
// Returns: { nsec, npub, hexPubkey }
```

## Competition Integration

### How Competitions Use Member Lists

1. **League/Event Creation**: Captain creates competition through wizard
2. **Participant Query**: System queries kind 30000 list for team members
3. **Workout Collection**: Queries kind 1301 events from member list
4. **Scoring**: Applies competition rules to collected workouts
5. **Leaderboard**: Displays results based on scoring algorithm

### Query Pattern
```typescript
// Get team members from kind 30000 list
const members = await memberCache.getTeamMembers(teamId, captainId);

// Query workouts from members
const filters = {
  kinds: [1301],
  authors: members, // Hex pubkeys from kind 30000 list
  since: competitionStart,
  until: competitionEnd
};
```

## Profile Display System

### User Profile Resolution
All member displays throughout the app now use the `ZappableUserRow` component which:
1. Accepts both hex and npub format pubkeys
2. Automatically fetches Nostr kind 0 profile events
3. Displays real usernames and profile pictures
4. Falls back gracefully when profiles aren't available

### Implementation Details
```typescript
// Captain Dashboard now uses ZappableUserRow for member display
<ZappableUserRow
  npub={memberPubkey}  // Works with both hex and npub formats
  fallbackName={index === 0 ? 'Captain' : `Member ${index}`}
  additionalContent={<Text style={styles.memberStatus}>...</Text>}
  showQuickZap={false}
/>
```

### Profile Services
- **NostrProfileService**: Fetches and caches kind 0 events from relays
- **useNostrProfile Hook**: React hook for profile data with automatic caching
- **UnifiedCacheService**: Manages profile cache with 30-minute TTL

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. "Team Setup Required" Despite Existing List
**Cause**: Captain ID format mismatch (npub vs hex)
**Solution**: Ensure captain ID is converted to hex before queries
**Fixed**: ✅ Captain ID conversion now handled properly in CaptainDashboardScreen

#### 2. Members Not Showing in Dashboard
**Cause**: Stale cache or relay sync issues
**Solution**: Invalidate cache and retry with longer timeout
**Fixed**: ✅ Member list now properly displays with usernames and avatars

#### 3. "Team already has a member list" Error
**Cause**: List exists but detection failed
**Solution**: Check relay connectivity and captain ID format
**Fixed**: ✅ Detection improved with proper hex conversion

#### 4. Authentication Retrieval Failures
**Cause**: Corrupted AsyncStorage or missing keys
**Solution**: Use recovery mechanisms in nostrAuth.ts
**Fixed**: ✅ Multiple fallback mechanisms implemented

#### 5. Members Showing as Hex/NPub Strings
**Cause**: Not resolving Nostr profiles for display
**Solution**: Use ZappableUserRow component with useNostrProfile hook
**Fixed**: ✅ All member displays now show proper usernames and profile pictures

#### 6. League Rankings Not Showing Members
**Cause**: Captain pubkey not passed to LeagueRankingsSection
**Solution**: Pass captainPubkey prop from EnhancedTeamScreen
**Fixed**: ✅ Captain pubkey now properly passed and members appear in 30-Day Streak Challenge

## Testing Checklist

### Captain Dashboard
- [x] Navigate to team as captain
- [x] Verify member list displays with proper usernames and avatars
- [x] Test "Add Member" functionality
- [ ] Approve/reject join requests
- [x] Create event/league competitions

### Member Management
- [x] Add member updates kind 30000 list
- [x] Remove member updates list
- [x] Changes reflect in competitions
- [x] Cache updates properly
- [x] Member profiles resolve correctly (names and avatars)

### Competition Queries
- [x] Leagues query correct members from kind 30000 lists
- [x] Events include all team members
- [x] Scoring applies to right participants
- [x] Leaderboards update dynamically
- [x] 30-Day Streak Challenge shows team members with profiles

### Profile Display
- [x] Captain Dashboard shows Nostr usernames instead of hex/npub
- [x] Profile pictures display when available
- [x] League Rankings show proper user profiles
- [x] Fallback names work when profiles unavailable
- [x] Both hex and npub formats handled correctly

## Future Improvements

1. **Batch Member Operations**: Add/remove multiple members at once
2. **Member Roles**: Support co-captains and moderators
3. **List Versioning**: Track history of membership changes
4. **Offline Support**: Queue list updates when offline
5. **Cross-Team Competitions**: Query multiple kind 30000 lists

## Code References

### Team Management Core Files
- Captain Dashboard: `src/screens/CaptainDashboardScreen.tsx:77-500`
- List Service: `src/services/nostr/NostrListService.ts:54-476`
- Member Cache: `src/services/team/TeamMemberCache.ts:18-250`
- List Detector: `src/utils/teamListDetector.ts:17-105`
- Auth Storage: `src/utils/nostrAuth.ts:31-444`
- Navigation: `src/App.tsx:167-187`

### Profile Display System Files
- ZappableUserRow Component: `src/components/ui/ZappableUserRow.tsx`
- Profile Service: `src/services/nostr/NostrProfileService.ts`
- Profile Hooks: `src/hooks/useCachedData.ts:201-250`
- Enhanced Team Screen: `src/screens/EnhancedTeamScreen.tsx:314`
- League Rankings: `src/components/team/LeagueRankingsSection.tsx:388-400`

## Related Documentation
- [App User Flow Documentation](./APP_USER_FLOW_AND_CAPTAIN_EXPERIENCE.md)
- [Competition System Documentation](./COMPETITION_SYSTEM.md)
- [Nostr Protocol Integration](./NOSTR_PROTOCOL.md)