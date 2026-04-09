# Unified Profile Pages Design

**Date:** 2026-03-03
**Status:** Approved
**Motivation:** Users want to view other people's profiles. Current profile tab is a navigation hub, not a showcase. No way to tap a user in a leaderboard or club and see their profile.

## Summary

Replace the current Profile tab with a unified profile page that works for both the logged-in user and any other user. The same layout is used everywhere — when viewing your own profile (tab root) and when tapping someone in a leaderboard or club. Owner-only controls (edit, settings, full history, rewards management) are conditionally rendered based on whether the viewed profile matches the current user's npub.

Additionally, restructure the bottom tab bar from **Profile | Clubs | Rewards** to **Profile | Clubs | Events**. The Rewards tab is absorbed into the profile as a compact destination badge. The "Join Events" navigation box is promoted to its own Events tab.

## Design Decisions

- **Unified page:** One profile layout for self and others. `isOwner` boolean drives conditional rendering.
- **Showcase-first:** PRs, active competitions, stats, club badges — everything that makes a user look good is public.
- **Rewards as badge:** Compact "Supporting: X" chip on profile. Owner taps to change. Others see it read-only.
- **Events tab:** Absorbs CompeteScreen content (daily leaderboards, featured events, club events, season competitions).
- **Design language:** Light orange + primary black. Ionicons only where functionally necessary. No decorative emoji or colored icons.

## Profile Page Layout (top to bottom)

### 1. Hero Section
- Banner image (from Nostr kind 0 `banner` field, or default gradient)
- Avatar overlaid on banner bottom-left
- Edit button (pencil icon, Ionicon) — owner only, overlaid on avatar
- Display name, bio (2 lines max), lightning address (monospace)
- Settings gear (top-right header) — owner only
- Back arrow (top-left header) — only when viewing another user

### 2. Badges Row (horizontally scrollable)
- Reward destination chip: "Supporting: ALS Network" — owner taps to open RewardDestinationPicker
- Subscription tier badge: "Pro" / "Supporter" / "Free"
- Club badges: one per club membership (abbreviation or name)

### 3. Stats Grid (2x2)
- Total workouts (count)
- Total distance (km/mi)
- Longest streak (days)
- Level ring (using existing WorkoutLevelRing component)

### 4. Personal Records Section
- Grid of best times: 5K, 10K, Half Marathon, Marathon
- Only shows categories the user has data for
- Times formatted as HH:MM:SS or MM:SS

### 5. Active Competitions Section
- List of competitions the user is currently in
- Shows competition name, user's rank, total participants
- Tappable — navigates to competition detail

### 6. Recent Workouts Section
- Last 3-5 public workouts
- Each row: activity type, distance/reps, date, duration
- "View All History" button — owner only, navigates to WorkoutHistoryScreen

### 7. Club Affiliations Section
- List of clubs the user belongs to
- Shows club name and role (Captain badge if applicable)
- Tappable — navigates to club page

## Navigation Structure

```
Bottom Tabs:
  Profile (tab root: ProfileScreen with no pubkey = self)
  Clubs (tab root: ClubsScreen — unchanged)
  Events (tab root: EventsScreen — new, absorbs CompeteScreen)

Profile Stack:
  ProfileScreen (pubkey?: string)
  ProfileEditScreen (owner only)
  WorkoutHistoryScreen (owner only)
  RewardDestinationPicker (modal, owner only)

Events Stack:
  EventsScreen (daily leaderboards, featured events, club events)
  EventDetailScreen
  LeaderboardsScreen
```

### How Users Reach Other Profiles

| From | Action | Result |
|------|--------|--------|
| Leaderboard row (ZappableUserRow) | Tap user | Navigate to ProfileScreen with `{ pubkey }` |
| Club member circle | Tap avatar | Navigate to ProfileScreen with `{ pubkey }` |
| Club chat message | Tap avatar | Navigate to ProfileScreen with `{ pubkey }` |

### Route Params

```typescript
type ProfileScreenParams = {
  pubkey?: string;  // undefined = current user (tab root default)
};
```

### Owner Detection

```typescript
const isOwner = !pubkey || pubkey === currentUser?.npub;
```

## Data Sources

| Section | Source | Query |
|---------|--------|-------|
| Hero (avatar, name, bio) | Nostr kind 0 | `NostrProfileService.getProfile(pubkey)` |
| Reward destination | Supabase `reward_destinations` | By pubkey |
| Subscription tier | Supabase `subscriptions` | By pubkey |
| Stats grid | Supabase `workouts` | `COUNT(*)`, `SUM(distance)`, streak calc |
| Personal records | Supabase `workouts` or `leaderboard_entries` | Best time per distance category |
| Active competitions | Supabase `competition_entries` + `competitions` | Active comps where user is entered |
| Recent workouts | Supabase `workouts` | Last 5, public only |
| Club affiliations | Supabase `club_members` + `clubs` | Memberships with role |

All query results cached in Zustand store with 5-minute TTL.

## New Service

`ProfileDataService` — centralized Supabase queries for profile page data:
- `getUserStats(pubkey)` — aggregate workout stats
- `getUserPRs(pubkey)` — personal records by distance
- `getUserActiveCompetitions(pubkey)` — competition entries with rank
- `getUserRecentWorkouts(pubkey, limit)` — recent public workouts
- `getUserClubs(pubkey)` — club memberships with role

## Component Architecture

### New Components
| Component | Purpose | Lines (est.) |
|-----------|---------|-------------|
| `ProfileHero.tsx` | Banner + avatar + name + bio + edit button | ~150 |
| `ProfileBadgesRow.tsx` | Destination + tier + club chips | ~100 |
| `ProfileStatsGrid.tsx` | 2x2 stats with level ring | ~120 |
| `PersonalRecordsSection.tsx` | PR grid by distance | ~100 |
| `ActiveCompetitionsSection.tsx` | Current competitions with rank | ~100 |
| `RecentWorkoutsSection.tsx` | Last 3-5 workouts + gated View All | ~120 |
| `ClubAffiliationsSection.tsx` | Club list with roles | ~80 |
| `EventsScreen.tsx` | New tab — absorbs CompeteScreen content | ~200 |
| `ProfileDataService.ts` | Supabase queries for profile data | ~150 |

### Modified Components
| Component | Change |
|-----------|--------|
| `ProfileScreen.tsx` | Rewrite — compose new sections, accept `pubkey` param |
| `BottomTabNavigator.tsx` | 3 tabs: Profile, Clubs, Events (replace Rewards) |
| `ZappableUserRow.tsx` | Add `onPress` to navigate to ProfileScreen with pubkey |
| `ClubMembersSection.tsx` | Add tap handler on member circles |

### Removed Components
| Component | Reason |
|-----------|--------|
| `ProfileHeader.tsx` | Replaced by `ProfileHero.tsx` |
| `YourWorkoutsBox.tsx` | Replaced by `RecentWorkoutsSection.tsx` |
| `YourCompetitionsBox.tsx` | Replaced by `ActiveCompetitionsSection.tsx` |

### Reused Components
- `WorkoutLevelRing` — stats grid level display
- `RewardDestinationPicker` — opened from badge tap (owner only)

## Owner-Only Gating

| Element | Owner | Others |
|---------|-------|--------|
| Edit profile button | Visible | Hidden |
| Settings gear | Visible | Hidden |
| Notification badge | Visible | Hidden |
| "Change" on destination badge | Tappable | Read-only |
| "View All History" button | Visible | Hidden |
| Back arrow | Hidden (tab root) | Visible |

## Out of Scope (future)

- Profile sharing links / deep links
- User-controlled visibility settings (choose which sections to show/hide)
- Follow/unfollow users
- Social feed / activity tab
- Profile search / discovery
