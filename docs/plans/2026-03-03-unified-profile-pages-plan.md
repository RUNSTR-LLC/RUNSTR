# Unified Profile Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Profile tab with a unified showcase-first profile page that works for both the logged-in user and any other user, restructure bottom tabs to Profile | Clubs | Events, and enable tap-to-profile navigation from leaderboards and clubs.

**Architecture:** A single `ProfileScreen` accepts an optional `pubkey` route param. When `pubkey` is undefined or matches the current user, owner-only controls (edit, settings, full history, rewards management) are shown. Profile data for any user is fetched via a new `ProfileDataService` that queries Supabase with 5-minute caching. The Rewards tab is absorbed into a compact badge on the profile. The Events tab promotes the CompeteScreen content to a first-class tab.

**Tech Stack:** React Native, TypeScript, Supabase (data), Nostr NDK (identity), Zustand (state), React Navigation (bottom tabs + native stack)

---

## Phase 1: Data Layer

### Task 1: Create ProfileDataService

**Files:**
- Create: `src/services/backend/ProfileDataService.ts`

**Context:** This service provides all Supabase queries needed by the unified profile page. Each method takes a pubkey (npub format) and returns typed data. Results are cached in-memory with 5-minute TTL (same pattern as `ClubLeaderboardSection` which uses `lastFetchTime` + `CACHE_DURATION`).

**Step 1: Create the service file with types and cache infrastructure**

```typescript
/**
 * ProfileDataService - Supabase queries for unified profile page
 * Provides stats, PRs, competitions, recent workouts, and club data for any user
 */

import { supabase } from '../../config/supabase';
import { npubToHex } from '../../utils/ndkConversion';

// --- Types ---

export interface ProfileStats {
  totalWorkouts: number;
  totalDistanceKm: number;
  longestStreakDays: number;
  currentStreakDays: number;
}

export interface PersonalRecord {
  category: '5k' | '10k' | 'half' | 'marathon';
  bestTimeSeconds: number;
  date: string;
}

export interface ActiveCompetition {
  id: string;
  name: string;
  rank: number;
  totalParticipants: number;
}

export interface RecentWorkout {
  id: string;
  activityType: string;
  distanceKm?: number;
  durationSeconds?: number;
  reps?: number;
  createdAt: string;
}

export interface ClubAffiliation {
  id: string;
  name: string;
  role: 'member' | 'captain';
  memberCount: number;
}

// --- Cache ---

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearProfileCache(npub?: string): void {
  if (npub) {
    for (const key of cache.keys()) {
      if (key.includes(npub)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}
```

**Step 2: Add getUserStats method**

```typescript
export async function getUserStats(npub: string): Promise<ProfileStats> {
  const cacheKey = `stats:${npub}`;
  const cached = getCached<ProfileStats>(cacheKey);
  if (cached) return cached;

  const hex = npubToHex(npub);
  if (!hex) return { totalWorkouts: 0, totalDistanceKm: 0, longestStreakDays: 0, currentStreakDays: 0 };

  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('id, distance_km, created_at')
      .eq('user_npub', npub)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[ProfileDataService] getUserStats error:', error);
      return { totalWorkouts: 0, totalDistanceKm: 0, longestStreakDays: 0, currentStreakDays: 0 };
    }

    const totalWorkouts = data.length;
    const totalDistanceKm = data.reduce((sum, w) => sum + (w.distance_km || 0), 0);

    // Calculate streaks from workout dates
    const dates = [...new Set(data.map(w => new Date(w.created_at).toDateString()))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    let currentStreakDays = 0;
    let longestStreakDays = 0;
    let streak = 0;

    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        // Check if most recent workout is today or yesterday
        const daysDiff = Math.floor(
          (Date.now() - new Date(dates[0]).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 1) {
          currentStreakDays = 0;
          streak = 1;
        } else {
          streak = 1;
        }
      } else {
        const prev = new Date(dates[i - 1]).getTime();
        const curr = new Date(dates[i]).getTime();
        const diffDays = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streak++;
        } else {
          if (i === 1 || currentStreakDays > 0) currentStreakDays = streak;
          longestStreakDays = Math.max(longestStreakDays, streak);
          streak = 1;
        }
      }
    }
    // Finalize
    longestStreakDays = Math.max(longestStreakDays, streak);
    if (currentStreakDays === 0 && dates.length > 0) {
      const daysDiff = Math.floor(
        (Date.now() - new Date(dates[0]).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 1) currentStreakDays = streak;
    }

    const result: ProfileStats = { totalWorkouts, totalDistanceKm, longestStreakDays, currentStreakDays };
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[ProfileDataService] getUserStats exception:', err);
    return { totalWorkouts: 0, totalDistanceKm: 0, longestStreakDays: 0, currentStreakDays: 0 };
  }
}
```

**Step 3: Add getUserPRs method**

```typescript
export async function getUserPRs(npub: string): Promise<PersonalRecord[]> {
  const cacheKey = `prs:${npub}`;
  const cached = getCached<PersonalRecord[]>(cacheKey);
  if (cached) return cached;

  try {
    // Query workouts with distance data, look for best times per distance category
    const { data, error } = await supabase
      .from('workouts')
      .select('distance_km, duration_seconds, created_at')
      .eq('user_npub', npub)
      .not('distance_km', 'is', null)
      .not('duration_seconds', 'is', null)
      .gt('duration_seconds', 0)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const categories: { key: PersonalRecord['category']; minKm: number; maxKm: number }[] = [
      { key: '5k', minKm: 4.8, maxKm: 5.5 },
      { key: '10k', minKm: 9.5, maxKm: 11 },
      { key: 'half', minKm: 20, maxKm: 22.5 },
      { key: 'marathon', minKm: 41, maxKm: 44 },
    ];

    const prs: PersonalRecord[] = [];
    for (const cat of categories) {
      const matching = data.filter(
        (w) => w.distance_km >= cat.minKm && w.distance_km <= cat.maxKm
      );
      if (matching.length > 0) {
        const best = matching.reduce((a, b) =>
          a.duration_seconds < b.duration_seconds ? a : b
        );
        prs.push({
          category: cat.key,
          bestTimeSeconds: best.duration_seconds,
          date: best.created_at,
        });
      }
    }

    setCache(cacheKey, prs);
    return prs;
  } catch (err) {
    console.warn('[ProfileDataService] getUserPRs exception:', err);
    return [];
  }
}
```

**Step 4: Add getUserActiveCompetitions method**

```typescript
export async function getUserActiveCompetitions(npub: string): Promise<ActiveCompetition[]> {
  const cacheKey = `comps:${npub}`;
  const cached = getCached<ActiveCompetition[]>(cacheKey);
  if (cached) return cached;

  try {
    // Get competitions the user is entered in that are currently active
    const { data, error } = await supabase
      .from('competition_entries')
      .select(`
        competition_id,
        rank,
        competitions (
          id,
          name,
          status,
          participant_count
        )
      `)
      .eq('user_npub', npub);

    if (error || !data) return [];

    const active = data
      .filter((entry: any) => entry.competitions?.status === 'active')
      .map((entry: any) => ({
        id: entry.competitions.id,
        name: entry.competitions.name,
        rank: entry.rank || 0,
        totalParticipants: entry.competitions.participant_count || 0,
      }));

    setCache(cacheKey, active);
    return active;
  } catch (err) {
    console.warn('[ProfileDataService] getUserActiveCompetitions exception:', err);
    return [];
  }
}
```

**Step 5: Add getUserRecentWorkouts method**

```typescript
export async function getUserRecentWorkouts(
  npub: string,
  limit: number = 5
): Promise<RecentWorkout[]> {
  const cacheKey = `recent:${npub}:${limit}`;
  const cached = getCached<RecentWorkout[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('id, activity_type, distance_km, duration_seconds, reps, created_at')
      .eq('user_npub', npub)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    const workouts: RecentWorkout[] = data.map((w) => ({
      id: w.id,
      activityType: w.activity_type || 'workout',
      distanceKm: w.distance_km || undefined,
      durationSeconds: w.duration_seconds || undefined,
      reps: w.reps || undefined,
      createdAt: w.created_at,
    }));

    setCache(cacheKey, workouts);
    return workouts;
  } catch (err) {
    console.warn('[ProfileDataService] getUserRecentWorkouts exception:', err);
    return [];
  }
}
```

**Step 6: Add getUserClubs method**

```typescript
export async function getUserClubs(npub: string): Promise<ClubAffiliation[]> {
  const cacheKey = `clubs:${npub}`;
  const cached = getCached<ClubAffiliation[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('club_members')
      .select(`
        role,
        clubs (
          id,
          name,
          member_count
        )
      `)
      .eq('user_npub', npub);

    if (error || !data) return [];

    const clubs: ClubAffiliation[] = data
      .filter((m: any) => m.clubs)
      .map((m: any) => ({
        id: m.clubs.id,
        name: m.clubs.name,
        role: m.role || 'member',
        memberCount: m.clubs.member_count || 0,
      }));

    setCache(cacheKey, clubs);
    return clubs;
  } catch (err) {
    console.warn('[ProfileDataService] getUserClubs exception:', err);
    return [];
  }
}
```

**Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors from this file (pre-existing errors are expected)

**Step 8: Commit**

```bash
git add src/services/backend/ProfileDataService.ts
git commit -m "Feature: Add ProfileDataService for unified profile page data"
```

**Notes:**
- The exact Supabase column names (`user_npub`, `distance_km`, `duration_seconds`, `activity_type`, `reps`, `created_at`, `competition_id`, `rank`, `status`, `participant_count`, `role`) need to be verified against the actual schema. Check `src/services/backend/SupabaseCompetitionService.ts` for column naming patterns. The implementing agent should read a few queries from that file to confirm column names and adjust accordingly.
- The `supabase` import path should match the existing pattern. Check `src/services/backend/ClubService.ts` line 1-10 for the correct import path.
- If the `workouts` table uses `npub` instead of `user_npub`, adjust all queries.

---

## Phase 2: Profile Components

### Task 2: Create ProfileHero component

**Files:**
- Create: `src/components/profile/ProfileHero.tsx`
- Reference: `src/components/profile/ProfileHeader.tsx` (lines 77-120 for render pattern, lines 123-244 for styles)
- Reference: `src/components/ui/Avatar.tsx` for Avatar API

**Context:** This replaces `ProfileHeader.tsx`. It renders the banner, avatar, display name, bio, and lightning address. When `isOwner` is true, it shows an edit button (pencil icon overlay on avatar area). When viewing someone else, it shows a back arrow. The banner is taller than the current ProfileHeader (which uses `height: 150` total) to create more visual impact.

**Step 1: Create ProfileHero component**

```typescript
/**
 * ProfileHero - Banner, avatar, name, bio for unified profile page
 * Replaces ProfileHeader with a taller, more visual design
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import type { User } from '../../types';

interface ProfileHeroProps {
  user: User | null;
  isOwner: boolean;
  isLoading?: boolean;
  onEditPress?: () => void;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  user,
  isOwner,
  isLoading = false,
  onEditPress,
  onBackPress,
  onSettingsPress,
}) => {
  const { t } = useTranslation('profile');
  const isLoadingProfile = isLoading || !user;

  if (isLoadingProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.bannerPlaceholder} />
        <View style={styles.contentArea}>
          <View style={[styles.avatarWrapper, styles.skeletonAvatar]} />
          <View style={styles.textArea}>
            <View style={styles.skeletonText} />
            <View style={[styles.skeletonText, styles.skeletonTextSmall]} />
          </View>
        </View>
      </View>
    );
  }

  const rawDisplayName = user.displayName || user.name || '';
  const displayName =
    rawDisplayName === '' || rawDisplayName === 'Anonymous Athlete'
      ? t('anonymousAthlete')
      : rawDisplayName;
  const avatarUrl = user.picture || user.avatar || undefined;
  const rawBio = user.bio || '';
  const bio =
    rawBio === '' || rawBio === 'Welcome to RUNSTR! Tap to edit your profile.'
      ? t('defaultBio')
      : rawBio;
  const lud16 = user.lud16 || undefined;
  const banner = user.banner || undefined;

  return (
    <View style={styles.container}>
      {/* Banner */}
      <View style={styles.bannerContainer}>
        {banner ? (
          <Image source={{ uri: banner }} style={styles.bannerImage} resizeMode="cover" />
        ) : (
          <View style={styles.bannerPlaceholder} />
        )}
        <View style={styles.bannerOverlay} />

        {/* Header buttons overlaid on banner */}
        <View style={styles.headerButtons}>
          {!isOwner && (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.headerBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {isOwner && onSettingsPress && (
            <TouchableOpacity
              onPress={onSettingsPress}
              style={styles.headerBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu-outline" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Profile content below banner */}
      <View style={styles.contentArea}>
        <View style={styles.avatarRow}>
          <Avatar
            name={displayName}
            imageUrl={avatarUrl}
            size={64}
            style={styles.avatar}
            showIcon={true}
          />
          {isOwner && onEditPress && (
            <TouchableOpacity onPress={onEditPress} style={styles.editBtn}>
              <Ionicons name="create-outline" size={16} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.name}>{displayName}</Text>
        {bio ? (
          <Text style={styles.bio} numberOfLines={2}>{bio}</Text>
        ) : null}
        {lud16 ? (
          <Text style={styles.lud16} numberOfLines={1}>{lud16}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  bannerContainer: {
    height: 100,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.border,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerButtons: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  headerBtn: {
    padding: 4,
  },
  contentArea: {
    padding: 14,
    paddingTop: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -40, // Pull avatar up to overlap banner
    marginBottom: 8,
  },
  avatar: {
    borderWidth: 3,
    borderColor: theme.colors.cardBackground,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  editBtn: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
  },
  name: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  bio: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 2,
  },
  lud16: {
    fontSize: 11,
    color: theme.colors.accent,
    fontFamily: 'monospace',
  },
  skeletonAvatar: {
    backgroundColor: theme.colors.border,
    marginBottom: 8,
  },
  textArea: {
    gap: 8,
  },
  skeletonText: {
    height: 16,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    width: '50%',
  },
  skeletonTextSmall: {
    width: '70%',
    height: 12,
  },
});
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/components/profile/ProfileHero.tsx
git commit -m "Feature: Add ProfileHero component for unified profile page"
```

---

### Task 3: Create ProfileBadgesRow component

**Files:**
- Create: `src/components/profile/ProfileBadgesRow.tsx`
- Reference: `src/components/rewards/RewardDestinationSection.tsx` for destination display patterns

**Context:** Horizontal row of compact chips: reward destination, subscription tier, club badges. Owner can tap destination badge to change it.

**Step 1: Create component**

```typescript
/**
 * ProfileBadgesRow - Horizontal row of compact profile badges
 * Shows reward destination, subscription tier, and club affiliations as chips
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import type { ClubAffiliation } from '../../services/backend/ProfileDataService';

interface ProfileBadgesRowProps {
  rewardDestination?: string | null; // Display name like "ALS Network" or "Self"
  subscriptionTier?: 'free' | 'supporter' | 'pro';
  clubs?: ClubAffiliation[];
  isOwner: boolean;
  onDestinationPress?: () => void;
  onClubPress?: (clubId: string) => void;
}

export const ProfileBadgesRow: React.FC<ProfileBadgesRowProps> = ({
  rewardDestination,
  subscriptionTier = 'free',
  clubs = [],
  isOwner,
  onDestinationPress,
  onClubPress,
}) => {
  const tierLabel = subscriptionTier === 'free' ? null : subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {/* Reward destination badge */}
      {rewardDestination && (
        <TouchableOpacity
          style={styles.badge}
          onPress={isOwner ? onDestinationPress : undefined}
          activeOpacity={isOwner ? 0.7 : 1}
          disabled={!isOwner}
        >
          <Text style={styles.badgeLabel}>Supporting</Text>
          <Text style={styles.badgeValue} numberOfLines={1}>{rewardDestination}</Text>
        </TouchableOpacity>
      )}

      {/* Subscription tier badge (hide "Free") */}
      {tierLabel && (
        <View style={[styles.badge, styles.tierBadge]}>
          <Text style={styles.tierText}>{tierLabel}</Text>
        </View>
      )}

      {/* Club badges */}
      {clubs.map((club) => (
        <TouchableOpacity
          key={club.id}
          style={styles.badge}
          onPress={() => onClubPress?.(club.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.badgeValue} numberOfLines={1}>{club.name}</Text>
          {club.role === 'captain' && (
            <Text style={styles.captainTag}>Capt</Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  badgeLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  badgeValue: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    maxWidth: 120,
  },
  tierBadge: {
    borderColor: theme.colors.accent,
  },
  tierText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold as any,
    color: theme.colors.accent,
  },
  captainTag: {
    fontSize: 10,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.semiBold as any,
  },
});
```

**Step 2: Commit**

```bash
git add src/components/profile/ProfileBadgesRow.tsx
git commit -m "Feature: Add ProfileBadgesRow component"
```

---

### Task 4: Create ProfileStatsGrid component

**Files:**
- Create: `src/components/profile/ProfileStatsGrid.tsx`
- Reference: `src/components/profile/WorkoutLevelRing.tsx` for level ring API

**Context:** 2x2 grid showing total workouts, total distance, longest streak, and level ring.

**Step 1: Create component**

```typescript
/**
 * ProfileStatsGrid - 2x2 stats grid for profile page
 * Shows total workouts, distance, streak, and level
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import type { ProfileStats } from '../../services/backend/ProfileDataService';

interface ProfileStatsGridProps {
  stats: ProfileStats | null;
  isLoading?: boolean;
}

export const ProfileStatsGrid: React.FC<ProfileStatsGridProps> = ({
  stats,
  isLoading = false,
}) => {
  if (isLoading || !stats) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.cell}>
            <View style={styles.skeletonValue} />
            <View style={styles.skeletonLabel} />
          </View>
        ))}
      </View>
    );
  }

  const cells = [
    { value: String(stats.totalWorkouts), label: 'Workouts' },
    { value: `${stats.totalDistanceKm.toFixed(1)} km`, label: 'Distance' },
    { value: `${stats.longestStreakDays}d`, label: 'Best Streak' },
    { value: `${stats.currentStreakDays}d`, label: 'Current Streak' },
  ];

  return (
    <View style={styles.grid}>
      {cells.map((cell, i) => (
        <View key={i} style={styles.cell}>
          <Text style={styles.value}>{cell.value}</Text>
          <Text style={styles.label}>{cell.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  cell: {
    width: '50%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  value: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  skeletonValue: {
    width: 50,
    height: 20,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonLabel: {
    width: 60,
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
});
```

**Step 2: Commit**

```bash
git add src/components/profile/ProfileStatsGrid.tsx
git commit -m "Feature: Add ProfileStatsGrid component"
```

---

### Task 5: Create PersonalRecordsSection component

**Files:**
- Create: `src/components/profile/PersonalRecordsSection.tsx`

**Step 1: Create component**

```typescript
/**
 * PersonalRecordsSection - Grid of personal records by distance category
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import type { PersonalRecord } from '../../services/backend/ProfileDataService';

interface PersonalRecordsSectionProps {
  records: PersonalRecord[];
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const CATEGORY_LABELS: Record<PersonalRecord['category'], string> = {
  '5k': '5K',
  '10k': '10K',
  'half': 'Half Marathon',
  'marathon': 'Marathon',
};

export const PersonalRecordsSection: React.FC<PersonalRecordsSectionProps> = ({ records }) => {
  if (records.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Personal Records</Text>
      <View style={styles.grid}>
        {records.map((pr) => (
          <View key={pr.category} style={styles.prCard}>
            <Text style={styles.prCategory}>{CATEGORY_LABELS[pr.category]}</Text>
            <Text style={styles.prTime}>{formatTime(pr.bestTimeSeconds)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold as any,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prCard: {
    width: '48%',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  prCategory: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  prTime: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
  },
});
```

**Step 2: Commit**

```bash
git add src/components/profile/PersonalRecordsSection.tsx
git commit -m "Feature: Add PersonalRecordsSection component"
```

---

### Task 6: Create ActiveCompetitionsSection component

**Files:**
- Create: `src/components/profile/ActiveCompetitionsSection.tsx`

**Step 1: Create component**

```typescript
/**
 * ActiveCompetitionsSection - Shows competitions the user is currently in
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import type { ActiveCompetition } from '../../services/backend/ProfileDataService';

interface ActiveCompetitionsSectionProps {
  competitions: ActiveCompetition[];
  onCompetitionPress?: (competitionId: string) => void;
}

export const ActiveCompetitionsSection: React.FC<ActiveCompetitionsSectionProps> = ({
  competitions,
  onCompetitionPress,
}) => {
  if (competitions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Active Competitions</Text>
      {competitions.map((comp) => (
        <TouchableOpacity
          key={comp.id}
          style={styles.row}
          onPress={() => onCompetitionPress?.(comp.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.compName} numberOfLines={1}>{comp.name}</Text>
          <Text style={styles.compRank}>
            #{comp.rank} of {comp.totalParticipants}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold as any,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  compName: {
    flex: 1,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginRight: 12,
  },
  compRank: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.semiBold as any,
  },
});
```

**Step 2: Commit**

```bash
git add src/components/profile/ActiveCompetitionsSection.tsx
git commit -m "Feature: Add ActiveCompetitionsSection component"
```

---

### Task 7: Create RecentWorkoutsSection component

**Files:**
- Create: `src/components/profile/RecentWorkoutsSection.tsx`

**Step 1: Create component**

```typescript
/**
 * RecentWorkoutsSection - Last 3-5 public workouts with gated "View All"
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import type { RecentWorkout } from '../../services/backend/ProfileDataService';

interface RecentWorkoutsSectionProps {
  workouts: RecentWorkout[];
  isOwner: boolean;
  onViewAllPress?: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatActivityType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
}

export const RecentWorkoutsSection: React.FC<RecentWorkoutsSectionProps> = ({
  workouts,
  isOwner,
  onViewAllPress,
}) => {
  if (workouts.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Workouts</Text>
      {workouts.map((w) => (
        <View key={w.id} style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.activityType}>{formatActivityType(w.activityType)}</Text>
            <Text style={styles.date}>{formatDate(w.createdAt)}</Text>
          </View>
          <Text style={styles.metric}>
            {w.distanceKm
              ? `${w.distanceKm.toFixed(1)} km`
              : w.reps
                ? `${w.reps} reps`
                : ''}
            {w.durationSeconds ? `  ${formatDuration(w.durationSeconds)}` : ''}
          </Text>
        </View>
      ))}
      {isOwner && onViewAllPress && (
        <TouchableOpacity onPress={onViewAllPress} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>View All History</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold as any,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowLeft: {
    flex: 1,
  },
  activityType: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
  },
  date: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  metric: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium as any,
  },
  viewAllBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium as any,
  },
});
```

**Step 2: Commit**

```bash
git add src/components/profile/RecentWorkoutsSection.tsx
git commit -m "Feature: Add RecentWorkoutsSection component"
```

---

### Task 8: Create ClubAffiliationsSection component

**Files:**
- Create: `src/components/profile/ClubAffiliationsSection.tsx`

**Step 1: Create component**

```typescript
/**
 * ClubAffiliationsSection - List of clubs user belongs to
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import type { ClubAffiliation } from '../../services/backend/ProfileDataService';

interface ClubAffiliationsSectionProps {
  clubs: ClubAffiliation[];
  onClubPress?: (clubId: string) => void;
}

export const ClubAffiliationsSection: React.FC<ClubAffiliationsSectionProps> = ({
  clubs,
  onClubPress,
}) => {
  if (clubs.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Clubs</Text>
      {clubs.map((club) => (
        <TouchableOpacity
          key={club.id}
          style={styles.row}
          onPress={() => onClubPress?.(club.id)}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
            {club.role === 'captain' && (
              <Text style={styles.captainLabel}>Captain</Text>
            )}
          </View>
          <Text style={styles.memberCount}>{club.memberCount} members</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold as any,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  clubName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    flexShrink: 1,
  },
  captainLabel: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.semiBold as any,
  },
  memberCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
```

**Step 2: Commit**

```bash
git add src/components/profile/ClubAffiliationsSection.tsx
git commit -m "Feature: Add ClubAffiliationsSection component"
```

---

## Phase 3: Profile Screen Rewrite

### Task 9: Rewrite ProfileScreen as unified profile page

**Files:**
- Modify: `src/screens/ProfileScreen.tsx` (full rewrite — current file is 515 lines)

**Context:** This is the biggest task. The current ProfileScreen is a navigation hub with a ProfileHeader, notification badge, and 3 navigation boxes. The new version composes all the profile section components and loads data via ProfileDataService. It accepts an optional `pubkey` route param and determines `isOwner` from it.

**Important:** The current ProfileScreen is instantiated in TWO places:
1. `BottomTabNavigator.tsx` lines 144-202 — passes `data: ProfileScreenData` and many callback props
2. `AppNavigator.tsx` lines 209-239 — same pattern

Both pass `data.user`, callback props, etc. The rewrite needs to work in both contexts.

**Strategy:** Rather than rewriting the prop interface entirely (which would require updating both navigators simultaneously), the new ProfileScreen should:
1. Accept the existing props for backward compatibility during the transition
2. Also accept `route.params?.pubkey` for viewing other users
3. When `pubkey` is provided (viewing someone else), ignore the existing `data` prop and fetch fresh data via ProfileDataService + NostrProfileService
4. When `pubkey` is not provided (tab root / self), use the existing `data` prop for the hero section and fetch additional profile sections via ProfileDataService

**Step 1: Rewrite ProfileScreen**

The implementing agent should:
1. Read the current `src/screens/ProfileScreen.tsx` in full
2. Read how it's used in `src/navigation/BottomTabNavigator.tsx` lines 142-216
3. Read how it's used in `src/navigation/AppNavigator.tsx` lines 209-239
4. Rewrite the component to:
   - Keep the same export name and React.memo wrapper
   - Keep the same `ProfileScreenProps` interface for backward compatibility
   - Add route params support: `const route = useRoute<any>(); const pubkey = route?.params?.pubkey;`
   - Determine `isOwner`: `const isOwner = !pubkey || pubkey === userNpub;`
   - For self: use `data.user` for ProfileHero, fetch stats/PRs/competitions/workouts/clubs via ProfileDataService using `userNpub`
   - For others: fetch Nostr profile via `useNostrProfile(pubkey)`, fetch all sections via ProfileDataService using `pubkey`
   - Compose: ProfileHero → ProfileBadgesRow → ProfileStatsGrid → PersonalRecordsSection → ActiveCompetitionsSection → RecentWorkoutsSection → ClubAffiliationsSection
   - Owner-only: NotificationBadge, NotificationModal, "View All History" button, edit profile, settings
   - Keep pull-to-refresh (owner only)
   - Keep existing header logic (music player toggle, settings button) for owner only
   - Remove the three navigation boxes (FitnessTrackerBox, FitnessHistoryBox, FitnessCompetitionsBox)
5. Target: under 400 lines (the section components do the heavy lifting)

**Key imports to add:**
```typescript
import { useRoute } from '@react-navigation/native';
import { ProfileHero } from '../components/profile/ProfileHero';
import { ProfileBadgesRow } from '../components/profile/ProfileBadgesRow';
import { ProfileStatsGrid } from '../components/profile/ProfileStatsGrid';
import { PersonalRecordsSection } from '../components/profile/PersonalRecordsSection';
import { ActiveCompetitionsSection } from '../components/profile/ActiveCompetitionsSection';
import { RecentWorkoutsSection } from '../components/profile/RecentWorkoutsSection';
import { ClubAffiliationsSection } from '../components/profile/ClubAffiliationsSection';
import * as ProfileDataService from '../services/backend/ProfileDataService';
import { useNostrProfile } from '../hooks/useCachedData';
```

**Key imports to remove:**
```typescript
// Remove these - no longer used
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { FitnessTrackerBox } from '../components/profile/MyTeamsBox';
import { FitnessHistoryBox } from '../components/profile/YourCompetitionsBox';
import { FitnessCompetitionsBox } from '../components/profile/YourWorkoutsBox';
```

**Data loading pattern (inside the component):**
```typescript
const [stats, setStats] = useState<ProfileStats | null>(null);
const [prs, setPrs] = useState<PersonalRecord[]>([]);
const [competitions, setCompetitions] = useState<ActiveCompetition[]>([]);
const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
const [clubs, setClubs] = useState<ClubAffiliation[]>([]);

const targetNpub = pubkey || userNpub;

useEffect(() => {
  if (!targetNpub) return;

  // Fetch all profile data in parallel
  Promise.all([
    ProfileDataService.getUserStats(targetNpub),
    ProfileDataService.getUserPRs(targetNpub),
    ProfileDataService.getUserActiveCompetitions(targetNpub),
    ProfileDataService.getUserRecentWorkouts(targetNpub, 5),
    ProfileDataService.getUserClubs(targetNpub),
  ]).then(([s, p, c, w, cl]) => {
    setStats(s);
    setPrs(p);
    setCompetitions(c);
    setRecentWorkouts(w);
    setClubs(cl);
  });
}, [targetNpub]);
```

**Render structure:**
```tsx
<TexturedBackground>
  <ScrollView refreshControl={isOwner ? <RefreshControl ... /> : undefined}>
    <ProfileHero
      user={isOwner ? data.user : otherUser}
      isOwner={isOwner}
      onEditPress={isOwner ? handleEditProfile : undefined}
      onBackPress={!isOwner ? () => navigation.goBack() : undefined}
      onSettingsPress={isOwner ? handleSettingsPress : undefined}
    />

    <ProfileBadgesRow
      rewardDestination={rewardDestinationName}
      subscriptionTier={subscriptionTier}
      clubs={clubs}
      isOwner={isOwner}
      onDestinationPress={handleDestinationPress}
      onClubPress={handleClubPress}
    />

    <ProfileStatsGrid stats={stats} />

    <PersonalRecordsSection records={prs} />

    <ActiveCompetitionsSection
      competitions={competitions}
      onCompetitionPress={handleCompetitionPress}
    />

    <RecentWorkoutsSection
      workouts={recentWorkouts}
      isOwner={isOwner}
      onViewAllPress={() => navigation.navigate('WorkoutHistory', { userId: targetNpub, pubkey: targetNpub })}
    />

    <ClubAffiliationsSection
      clubs={clubs}
      onClubPress={handleClubPress}
    />
  </ScrollView>

  {isOwner && (
    <NotificationModal
      visible={showNotificationModal}
      onClose={() => setShowNotificationModal(false)}
    />
  )}
</TexturedBackground>
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors from ProfileScreen changes

**Step 3: Commit**

```bash
git add src/screens/ProfileScreen.tsx
git commit -m "Feature: Rewrite ProfileScreen as unified profile page"
```

---

## Phase 4: Navigation Restructure

### Task 10: Update BottomTabNavigator to Profile | Clubs | Events

**Files:**
- Modify: `src/navigation/BottomTabNavigator.tsx`

**Changes:**

1. **Update BottomTabParamList** (line 60-64):
```typescript
export type BottomTabParamList = {
  Profile: undefined;
  Clubs: undefined;
  Events: undefined;  // was: Rewards
};
```

2. **Replace RewardsScreen lazy import** (lines 33-37) with CompeteScreen:
```typescript
const CompeteScreen = React.lazy(() =>
  import('../screens/CompeteScreen').then((m) => ({
    default: m.CompeteScreen,
  }))
);
```
Remove the RewardsScreen import entirely.

3. **Update icon mapping** (lines 114-120):
```typescript
} else if (route.name === 'Events') {
  iconName = focused ? 'trophy' : 'trophy-outline';
}
```

4. **Replace Rewards Tab.Screen** (lines 234-246) with Events tab:
```tsx
<Tab.Screen
  name="Events"
  options={{
    title: 'Events',
    headerShown: false,
  }}
>
  {() => (
    <Suspense fallback={<LoadingFallback />}>
      <CompeteScreen />
    </Suspense>
  )}
</Tab.Screen>
```

5. **Update i18n hook** (line 76): Remove `'rewards'` namespace, add `'events'` if needed, or just use hardcoded "Events" string since the CompeteScreen handles its own translations.

**Step 1: Make all changes above**

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/navigation/BottomTabNavigator.tsx
git commit -m "Feature: Restructure bottom tabs to Profile | Clubs | Events"
```

---

### Task 11: Update CompeteScreen for tab root usage

**Files:**
- Modify: `src/screens/CompeteScreen.tsx`

**Context:** CompeteScreen currently has a back button (line 110-116) since it was used as a stack screen. Now that it's a tab root, the back button should be hidden when used as tab root. The simplest approach: remove the back button and keep the "Create Event" button. The screen already works standalone.

**Changes:**

1. **Remove the back button** (lines 110-116). Replace the header with just the "Create Event" button aligned right:
```tsx
<View style={styles.header}>
  <View style={styles.headerSpacer} />
  <TouchableOpacity
    style={styles.hostButton}
    onPress={() => subscriptionTier === 'pro' ? setShowCreateEvent(true) : setShowSubscriptionInfo(true)}
    activeOpacity={0.7}
  >
    <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
    <Text style={styles.hostButtonText}>Create Event</Text>
  </TouchableOpacity>
</View>
```

2. **Remove `backButton` style** (line 181-183).

**Step 1: Make changes**

**Step 2: Run typecheck**

**Step 3: Commit**

```bash
git add src/screens/CompeteScreen.tsx
git commit -m "Refactor: Remove back button from CompeteScreen for tab root usage"
```

---

### Task 12: Update RootStackParamList for profile pubkey param

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`

**Changes:**

1. **Update Profile route params** (line 66):
```typescript
Profile: { pubkey?: string } | undefined;
```

2. **No other changes needed** — the Profile screen registration (lines 209-239) already works because it renders ProfileScreen which now reads route params internally via `useRoute()`.

**Step 1: Make the change**

**Step 2: Run typecheck**

**Step 3: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "Feature: Add pubkey param to Profile route for viewing other users"
```

---

## Phase 5: Tap-to-Profile Navigation

### Task 13: Add onPress to ZappableUserRow

**Files:**
- Modify: `src/components/ui/ZappableUserRow.tsx`

**Changes:**

1. **Add `onPress` prop** to the interface (line 26-40):
```typescript
onPress?: () => void;
```

2. **Add to destructured props** (line 42-56).

3. **Wrap the container View in a TouchableOpacity** when `onPress` is provided. Change lines 81-124:
```tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// In the render:
const Wrapper = onPress ? TouchableOpacity : View;
const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

return (
  <Wrapper style={[styles.container, style]} {...wrapperProps}>
    {/* ... existing content unchanged ... */}
  </Wrapper>
);
```

Note: `TouchableOpacity` is already imported in React Native — just add it to the import destructure if not already there.

**Step 1: Make changes**

**Step 2: Run typecheck**

**Step 3: Commit**

```bash
git add src/components/ui/ZappableUserRow.tsx
git commit -m "Feature: Add onPress prop to ZappableUserRow for tap-to-profile"
```

---

### Task 14: Wire up tap-to-profile in leaderboard cards

**Files:**
- Modify: `src/components/team/DailyLeaderboardCard.tsx`
- Reference: How ZappableUserRow is used in this file

**Context:** The implementing agent should:
1. Read `src/components/team/DailyLeaderboardCard.tsx` in full
2. Find where `ZappableUserRow` is rendered (look for `<ZappableUserRow`)
3. Add `onPress` prop that navigates to Profile with the entry's npub
4. The navigation should use: `navigation.navigate('Profile', { pubkey: entry.npub })`
5. Import `useNavigation` from `@react-navigation/native` if not already imported

**Step 1: Read the file and make changes**

**Step 2: Run typecheck**

**Step 3: Commit**

```bash
git add src/components/team/DailyLeaderboardCard.tsx
git commit -m "Feature: Add tap-to-profile navigation on leaderboard entries"
```

---

### Task 15: Wire up tap-to-profile in club member circles

**Files:**
- Modify: `src/components/club/ClubMembersSection.tsx`

**Context:** The implementing agent should:
1. Read `src/components/club/ClubMembersSection.tsx` in full
2. Find where member avatars/circles are rendered
3. Wrap each member circle in a TouchableOpacity that navigates to `Profile` with the member's pubkey
4. Add `useNavigation` import if not already present

**Step 1: Read the file and make changes**

**Step 2: Run typecheck**

**Step 3: Commit**

```bash
git add src/components/club/ClubMembersSection.tsx
git commit -m "Feature: Add tap-to-profile navigation on club member circles"
```

---

## Phase 6: Rewards Destination on Profile

### Task 16: Load reward destination name for profile badge

**Files:**
- Modify: `src/screens/ProfileScreen.tsx` (add destination loading)
- Reference: `src/components/rewards/RewardDestinationSection.tsx` for how destination is resolved
- Reference: `src/constants/charities.ts` for charity name lookup

**Context:** The ProfileBadgesRow needs a `rewardDestination` string (display name). The implementing agent should:
1. Read `src/components/rewards/RewardDestinationSection.tsx` to understand how the current destination is resolved from `selectedTeamId`
2. Read `src/constants/charities.ts` for charity name lookups
3. In the ProfileScreen, load the `selectedTeamId` from AsyncStorage (`@runstr:selected_team_id`) and resolve it to a display name using the same logic as RewardDestinationSection
4. For viewing other users: this data may not be available (skip for now — show badge only for owner)
5. Pass the resolved name to `ProfileBadgesRow` as `rewardDestination`
6. Wire up `onDestinationPress` to open the RewardDestinationPicker (existing modal component)

**Step 1: Read referenced files**

**Step 2: Add destination loading to ProfileScreen**

**Step 3: Run typecheck**

**Step 4: Commit**

```bash
git add src/screens/ProfileScreen.tsx
git commit -m "Feature: Load reward destination for profile badge"
```

---

## Phase 7: Cleanup

### Task 17: Remove unused navigation boxes

**Files:**
- Consider removing or marking as deprecated:
  - `src/components/profile/YourCompetitionsBox.tsx` (exported as FitnessHistoryBox — no longer used if ProfileScreen doesn't import it)
  - `src/components/profile/YourWorkoutsBox.tsx` (exported as FitnessCompetitionsBox — same)
  - `src/components/profile/MyTeamsBox.tsx` (exported as FitnessTrackerBox — same)

**Context:** Before deleting, the implementing agent should:
1. Search for all imports of `FitnessTrackerBox`, `FitnessHistoryBox`, `FitnessCompetitionsBox` across the codebase
2. If they're only imported in ProfileScreen (which we've rewritten), they're safe to delete
3. If imported elsewhere, leave them

**Step 1: Search for imports**

Run: `grep -r "FitnessTrackerBox\|FitnessHistoryBox\|FitnessCompetitionsBox\|YourCompetitionsBox\|YourWorkoutsBox\|MyTeamsBox" --include="*.tsx" --include="*.ts" src/`

**Step 2: Delete files if safe**

**Step 3: Run typecheck**

**Step 4: Commit**

```bash
git add -A
git commit -m "Chore: Remove unused navigation box components"
```

---

### Task 18: Final typecheck and verification

**Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: Same or fewer errors than baseline (~199 pre-existing)

**Step 2: Write a verification script**

Create `scripts/verify/verify-profile-pages.ts`:
```typescript
/**
 * Verify unified profile pages implementation
 * Checks that key files exist and exports are correct
 */

import * as fs from 'fs';
import * as path from 'path';

const srcRoot = path.join(__dirname, '../../src');

const requiredFiles = [
  'services/backend/ProfileDataService.ts',
  'components/profile/ProfileHero.tsx',
  'components/profile/ProfileBadgesRow.tsx',
  'components/profile/ProfileStatsGrid.tsx',
  'components/profile/PersonalRecordsSection.tsx',
  'components/profile/ActiveCompetitionsSection.tsx',
  'components/profile/RecentWorkoutsSection.tsx',
  'components/profile/ClubAffiliationsSection.tsx',
];

let allPassed = true;

for (const file of requiredFiles) {
  const fullPath = path.join(srcRoot, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  OK: ${file}`);
  } else {
    console.error(`  MISSING: ${file}`);
    allPassed = false;
  }
}

// Check ProfileScreen imports new components
const profileScreen = fs.readFileSync(path.join(srcRoot, 'screens/ProfileScreen.tsx'), 'utf-8');
const expectedImports = ['ProfileHero', 'ProfileBadgesRow', 'ProfileStatsGrid', 'ProfileDataService'];
for (const imp of expectedImports) {
  if (profileScreen.includes(imp)) {
    console.log(`  OK: ProfileScreen imports ${imp}`);
  } else {
    console.error(`  MISSING: ProfileScreen should import ${imp}`);
    allPassed = false;
  }
}

// Check BottomTabNavigator has Events tab
const tabNav = fs.readFileSync(path.join(srcRoot, 'navigation/BottomTabNavigator.tsx'), 'utf-8');
if (tabNav.includes("name=\"Events\"") || tabNav.includes("name='Events'")) {
  console.log('  OK: BottomTabNavigator has Events tab');
} else {
  console.error('  MISSING: BottomTabNavigator should have Events tab');
  allPassed = false;
}

// Check ZappableUserRow has onPress prop
const zappable = fs.readFileSync(path.join(srcRoot, 'components/ui/ZappableUserRow.tsx'), 'utf-8');
if (zappable.includes('onPress')) {
  console.log('  OK: ZappableUserRow has onPress prop');
} else {
  console.error('  MISSING: ZappableUserRow should have onPress prop');
  allPassed = false;
}

console.log(allPassed ? '\nAll checks passed!' : '\nSome checks failed!');
process.exit(allPassed ? 0 : 1);
```

**Step 3: Run verification**

Run: `npx tsx scripts/verify/verify-profile-pages.ts`
Expected: All checks passed

**Step 4: Commit**

```bash
git add scripts/verify/verify-profile-pages.ts
git commit -m "Chore: Add profile pages verification script"
```

---

## Task Dependency Graph

```
Task 1 (ProfileDataService)
  └─→ Tasks 2-8 (Profile components) [can be parallel]
       └─→ Task 9 (ProfileScreen rewrite) [depends on all components]
            └─→ Task 16 (Rewards destination on profile)

Tasks 10-12 (Navigation restructure) [can be parallel with Tasks 2-8]
  └─→ Task 9 (needs updated nav types)

Tasks 13-15 (Tap-to-profile) [depends on Task 12 for route params]

Task 17 (Cleanup) [depends on Task 9]

Task 18 (Verification) [depends on everything]
```

## Summary

| Phase | Tasks | Est. Components |
|-------|-------|----------------|
| 1. Data layer | 1 | ProfileDataService |
| 2. UI components | 2-8 | 7 new components |
| 3. Screen rewrite | 9 | ProfileScreen |
| 4. Navigation | 10-12 | BottomTabNavigator, CompeteScreen, AppNavigator |
| 5. Tap-to-profile | 13-15 | ZappableUserRow, DailyLeaderboardCard, ClubMembersSection |
| 6. Rewards badge | 16 | ProfileScreen addition |
| 7. Cleanup | 17-18 | Remove old, verify |
