# Social Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Clubs tab into a Social tab with a horizontal clubs row and a read-only feed of fitness Nostr posts from Supabase.

**Architecture:** New `SocialScreen` replaces `ClubsScreen` as the tab content. Clubs row at top uses existing `ClubService.fetchActiveClubs()`. Feed reads from a new `social_feed` Supabase table via `SocialFeedService`. Workout shares dual-write to Nostr + Supabase for instant feed appearance. External indexer (not built here) populates feed from Nostr relays.

**Tech Stack:** React Native, TypeScript, Supabase, FlatList, existing Avatar/Club infrastructure

**Spec:** `docs/superpowers/specs/2026-03-27-social-tab-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/types/social.ts` | Social feed types |
| `src/services/social/SocialFeedService.ts` | Supabase queries for feed + dual-write insert |
| `src/components/social/ClubsRow.tsx` | Horizontal FlatList of club avatars |
| `src/components/social/SocialFeedPost.tsx` | Individual post card with avatar, text, image |
| `src/screens/SocialScreen.tsx` | Top-level screen: header, clubs row, feed |
| `supabase/migrations/159_social_feed.sql` | Create social_feed table |

### Modified Files
| File | Change |
|------|--------|
| `src/navigation/BottomTabNavigator.tsx` | Rename Clubs → Social, swap icon and screen |
| `src/navigation/AppNavigator.tsx` | Update `navigate('Clubs')` → `navigate('Social')` |
| `src/navigation/navigationHandlers.ts` | Update `navigate('Clubs')` → `navigate('Social')` |
| `src/components/profile/NotificationModal.tsx` | Update `navigate('Clubs')` → `navigate('Social')` |
| `src/services/nostr/workoutPublishingService.ts` | Add dual-write to social_feed after kind 1 publish |

---

## Task 1: Social Feed Types

**Files:**
- Create: `src/types/social.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// src/types/social.ts

export interface SocialFeedPost {
  id: string;
  event_id: string;
  npub: string;
  content: string;
  images: string[] | null;
  hashtags: string[] | null;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
  indexed_at: string;
}

/**
 * Format a timestamp as relative time.
 * < 1 min: "now", < 60 min: "Xm ago", < 24h: "Xh ago",
 * < 7d: "Xd ago", >= 7d: "Mon DD"
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  const date = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/social.ts
git commit -m "Feature: Add social feed types and timeAgo utility"
```

---

## Task 2: Supabase Migration

**Files:**
- Create: `supabase/migrations/159_social_feed.sql`

- [ ] **Step 1: Create migration**

```sql
-- Migration 159: Social feed table
-- Stores Nostr kind 1 posts with fitness hashtags.
-- Populated by external indexer + app dual-write.

CREATE TABLE IF NOT EXISTS social_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  npub TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT[],
  hashtags TEXT[],
  author_name TEXT,
  author_avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_feed_created_at ON social_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_feed_npub ON social_feed(npub);

ALTER TABLE social_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read social feed" ON social_feed;
CREATE POLICY "Anyone can read social feed" ON social_feed
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert social feed" ON social_feed;
CREATE POLICY "Anyone can insert social feed" ON social_feed
  FOR INSERT WITH CHECK (true);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/159_social_feed.sql
git commit -m "Feature: Add social_feed Supabase migration"
```

---

## Task 3: SocialFeedService

**Files:**
- Create: `src/services/social/SocialFeedService.ts`
- Reference: `src/utils/supabase.ts` (Supabase pattern)

- [ ] **Step 1: Create service**

```typescript
// src/services/social/SocialFeedService.ts

import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import type { SocialFeedPost } from '../../types/social';

export class SocialFeedService {
  private static instance: SocialFeedService;
  private cachedPosts: SocialFeedPost[] | null = null;

  static getInstance(): SocialFeedService {
    if (!SocialFeedService.instance) {
      SocialFeedService.instance = new SocialFeedService();
    }
    return SocialFeedService.instance;
  }

  /**
   * Fetch feed posts from Supabase with cursor-based pagination.
   * First load: omit cursor. Subsequent: pass created_at of last post.
   */
  async fetchFeed(cursor?: string, limit: number = 20): Promise<SocialFeedPost[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase!
        .from('social_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[SocialFeedService] Failed to fetch feed:', error);
        return [];
      }

      const posts = (data || []) as SocialFeedPost[];

      // Cache first page
      if (!cursor) {
        this.cachedPosts = posts;
      }

      return posts;
    } catch (error) {
      console.error('[SocialFeedService] fetchFeed error:', error);
      return [];
    }
  }

  /**
   * Get cached first page (for instant render before network).
   */
  getCachedFeed(): SocialFeedPost[] | null {
    return this.cachedPosts;
  }

  /**
   * Clear cache (on pull-to-refresh).
   */
  clearCache(): void {
    this.cachedPosts = null;
  }

  /**
   * Insert a post into social_feed (dual-write after Nostr publish).
   */
  async insertPost(post: {
    event_id: string;
    npub: string;
    content: string;
    images: string[];
    hashtags: string[];
    author_name: string;
    author_avatar: string;
    created_at: string;
  }): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error } = await supabase!
        .from('social_feed')
        .insert(post);

      if (error) {
        // Duplicate event_id is fine — indexer may have already picked it up
        if (error.code === '23505') return true;
        console.error('[SocialFeedService] Failed to insert post:', error);
        return false;
      }

      // Prepend to cache so it appears immediately
      if (this.cachedPosts) {
        this.cachedPosts = [post as SocialFeedPost, ...this.cachedPosts];
      }

      return true;
    } catch (error) {
      console.error('[SocialFeedService] insertPost error:', error);
      return false;
    }
  }
}

export default SocialFeedService.getInstance();
```

- [ ] **Step 2: Verify compiles**

Run: `npm run typecheck 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/services/social/SocialFeedService.ts
git commit -m "Feature: Add SocialFeedService with cursor pagination and dual-write"
```

---

## Task 4: ClubsRow Component

**Files:**
- Create: `src/components/social/ClubsRow.tsx`
- Reference: `src/components/ui/Avatar.tsx` (Avatar pattern)
- Reference: `src/types/club.ts` (Club interface)

- [ ] **Step 1: Create ClubsRow component**

```typescript
// src/components/social/ClubsRow.tsx

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import type { Club } from '../../types/club';

interface ClubsRowProps {
  clubs: Club[];
  userClubId?: string | null;
}

export const ClubsRow: React.FC<ClubsRowProps> = ({ clubs, userClubId }) => {
  const navigation = useNavigation<any>();

  // Sort: user's club first, then by member count
  const sorted = React.useMemo(() => {
    if (!userClubId) return clubs;
    return [...clubs].sort((a, b) => {
      if (a.id === userClubId) return -1;
      if (b.id === userClubId) return 1;
      return 0;
    });
  }, [clubs, userClubId]);

  const renderClub = ({ item }: { item: Club }) => (
    <TouchableOpacity
      style={styles.clubItem}
      onPress={() => navigation.navigate('ClubPage', { clubId: item.id, clubName: item.name })}
      activeOpacity={0.7}
    >
      <Avatar
        name={item.name}
        size={40}
        imageUrl={item.banner_url || undefined}
      />
      <Text style={styles.clubName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (clubs.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted.slice(0, 20)}
        renderItem={renderClub}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  clubItem: {
    alignItems: 'center',
    width: 56,
  },
  clubName: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    marginTop: 4,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/social/ClubsRow.tsx
git commit -m "Feature: Add ClubsRow horizontal scroll component"
```

---

## Task 5: SocialFeedPost Component

**Files:**
- Create: `src/components/social/SocialFeedPost.tsx`
- Reference: `src/components/ui/Avatar.tsx`

- [ ] **Step 1: Create post card component**

```typescript
// src/components/social/SocialFeedPost.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../types/social';
import type { SocialFeedPost as SocialFeedPostType } from '../../types/social';

const MAX_IMAGE_HEIGHT = 300;

interface SocialFeedPostProps {
  post: SocialFeedPostType;
}

export const SocialFeedPost: React.FC<SocialFeedPostProps> = ({ post }) => {
  const [imageError, setImageError] = useState(false);

  const firstImage = post.images && post.images.length > 0 ? post.images[0] : null;
  const showImage = firstImage && !imageError && firstImage.startsWith('https://');

  // Sanitize and truncate content
  const sanitized = post.content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  const displayContent = sanitized.length > 500
    ? sanitized.slice(0, 500) + '...'
    : sanitized;

  return (
    <View style={styles.card}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <Avatar
          name={post.author_name || '?'}
          size={36}
          imageUrl={post.author_avatar || undefined}
        />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.author_name || 'Anonymous'}
          </Text>
          <Text style={styles.timestamp}>{timeAgo(post.created_at)}</Text>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.content}>{displayContent}</Text>

      {/* Image */}
      {showImage && (
        <Image
          source={{ uri: firstImage }}
          style={styles.image}
          resizeMode="contain"
          onError={() => setImageError(true)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  timestamp: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.regular,
    marginTop: 1,
  },
  content: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.regular,
    lineHeight: 20,
  },
  image: {
    width: '100%',
    height: MAX_IMAGE_HEIGHT,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: theme.colors.cardBackground,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/social/SocialFeedPost.tsx
git commit -m "Feature: Add SocialFeedPost card with image support"
```

---

## Task 6: SocialScreen

**Files:**
- Create: `src/screens/SocialScreen.tsx`
- Reference: `src/screens/ClubsScreen.tsx` (screen pattern)

- [ ] **Step 1: Create SocialScreen**

```typescript
// src/screens/SocialScreen.tsx

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { ClubsRow } from '../components/social/ClubsRow';
import { SocialFeedPost } from '../components/social/SocialFeedPost';
import SocialFeedService from '../services/social/SocialFeedService';
import { ClubService } from '../services/backend/ClubService';
import { ClubMembershipService } from '../services/backend/ClubMembershipService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SocialFeedPost as SocialFeedPostType } from '../types/social';
import type { Club } from '../types/club';

const SocialScreenComponent: React.FC = () => {
  const [posts, setPosts] = useState<SocialFeedPostType[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [userClubId, setUserClubId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadData = async (refresh = false) => {
    try {
      if (refresh) {
        SocialFeedService.clearCache();
      }

      // Load clubs and feed in parallel
      const [clubsData, feedData, npub] = await Promise.all([
        ClubService.fetchActiveClubs(),
        refresh ? SocialFeedService.fetchFeed() : (SocialFeedService.getCachedFeed() || SocialFeedService.fetchFeed()),
        AsyncStorage.getItem('@runstr:npub'),
      ]);

      setClubs(clubsData);
      setPosts(feedData);
      setHasMore(feedData.length >= 20);

      // Get user's club (getCurrentClub returns string | null directly)
      if (npub) {
        const clubId = await ClubMembershipService.getCurrentClub(npub);
        setUserClubId(clubId);
      }
    } catch (error) {
      console.error('[SocialScreen] Failed to load data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(true);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || posts.length === 0) return;

    setIsLoadingMore(true);
    const lastPost = posts[posts.length - 1];
    const morePosts = await SocialFeedService.fetchFeed(lastPost.created_at);

    if (morePosts.length < 20) {
      setHasMore(false);
    }

    setPosts((prev) => [...prev, ...morePosts]);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, posts]);

  const renderPost = useCallback(({ item }: { item: SocialFeedPostType }) => (
    <SocialFeedPost post={item} />
  ), []);

  const renderHeader = useCallback(() => (
    <ClubsRow clubs={clubs} userClubId={userClubId} />
  ), [clubs, userClubId]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No posts yet.</Text>
        <Text style={styles.emptySubtext}>Share a workout to get started.</Text>
      </View>
    );
  }, [isLoading]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }, [isLoadingMore]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TexturedBackground edges={[]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Social</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        </TexturedBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TexturedBackground edges={[]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Social</Text>
        </View>
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.text}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </TexturedBackground>
    </SafeAreaView>
  );
};

export const SocialScreen = React.memo(SocialScreenComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
```

Note: Check whether `TexturedBackground` requires children wrapping or acts as a container. Adapt the JSX structure accordingly based on how other screens use it (see `RewardsScreen.tsx` or `LevelDetailScreen.tsx`).

- [ ] **Step 2: Verify compiles**

Run: `npm run typecheck 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/screens/SocialScreen.tsx
git commit -m "Feature: Add SocialScreen with clubs row and feed"
```

---

## Task 7: Navigation — Rename Clubs to Social

**Files:**
- Modify: `src/navigation/BottomTabNavigator.tsx`
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/navigationHandlers.ts`
- Modify: `src/components/profile/NotificationModal.tsx`

- [ ] **Step 1: Update BottomTabNavigator**

In `src/navigation/BottomTabNavigator.tsx`:

1. Update `BottomTabParamList` (line 60-64):
```typescript
export type BottomTabParamList = {
  Profile: undefined;
  Social: undefined;
  Events: undefined;
};
```

2. Replace the lazy import (line 27-30):
```typescript
const SocialScreen = React.lazy(() =>
  import('../screens/SocialScreen').then((m) => ({
    default: m.SocialScreen,
  }))
);
```

3. Update the icon config in `screenOptions` — change the `Clubs` case to `Social` with icon `chatbubbles` / `chatbubbles-outline`.

4. Replace the `Tab.Screen` for Clubs (lines 220-232) with:
```typescript
<Tab.Screen name="Social" options={{ lazy: true }}>
  {() => (
    <Suspense fallback={<LoadingFallback />}>
      <SocialScreen />
    </Suspense>
  )}
</Tab.Screen>
```

- [ ] **Step 2: Update all navigate('Clubs') references**

Replace `navigate('Clubs')` with `navigate('Social')` in ALL of these files:

- `src/navigation/BottomTabNavigator.tsx` — lines 148, 149 (ProfileScreen onNavigateToTeam callbacks)
- `src/navigation/AppNavigator.tsx` — lines 218, 219
- `src/navigation/navigationHandlers.ts` — lines 221, 299
- `src/components/profile/NotificationModal.tsx` — lines 136, 152, 158

- [ ] **Step 3: Verify compiles**

Run: `npm run typecheck 2>&1 | tail -3`

- [ ] **Step 4: Update CLAUDE.md**

In `CLAUDE.md`, update the **Product Structure** section:
- Change "Three-Tab Navigation: Profile (workouts, history, settings) · Clubs (Fitness Clubs) · Rewards (earnings, destination, sponsor)" to "Three-Tab Navigation: Profile (workouts, history, settings) · Social (feed, Fitness Clubs) · Events (competitions, leaderboards)"

- [ ] **Step 5: Commit**

```bash
git add src/navigation/BottomTabNavigator.tsx src/navigation/AppNavigator.tsx src/navigation/navigationHandlers.ts src/components/profile/NotificationModal.tsx CLAUDE.md
git commit -m "Feature: Rename Clubs tab to Social, update all navigation references and docs"
```

---

## Task 8: Dual-Write in Workout Publishing

**Files:**
- Modify: `src/services/nostr/workoutPublishingService.ts`

- [ ] **Step 1: Read the file first**

Read `src/services/nostr/workoutPublishingService.ts` to find:
- The `postWorkoutToSocial` method (~line 413)
- Where `ndkEvent.publish()` succeeds (~line 579-592)
- What data is available: `ndkEvent.id`, `ndkEvent.content`, `ndkEvent.created_at`, `imageUrl`, user npub

- [ ] **Step 2: Add dual-write import**

At the top of the file, add:
```typescript
import SocialFeedService from './../../services/social/SocialFeedService';
```

Adjust the relative path if needed based on the actual file location.

- [ ] **Step 3: Add dual-write after successful publish**

After the `ndkEvent.publish()` succeeds and before cache invalidation, add:
```typescript
// Dual-write to social_feed for instant feed appearance
try {
  const hashtags = ndkEvent.tags
    .filter((t: string[]) => t[0] === 't')
    .map((t: string[]) => t[1]?.toLowerCase())
    .filter(Boolean);

  const images: string[] = [];
  // Extract image URLs from content
  const imageRegex = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)/gi;
  const imageMatches = ndkEvent.content.match(imageRegex);
  if (imageMatches) images.push(...imageMatches);
  // Check imeta tags
  ndkEvent.tags
    .filter((t: string[]) => t[0] === 'imeta')
    .forEach((t: string[]) => {
      const urlPart = t.find((p: string) => p.startsWith('url '));
      if (urlPart) images.push(urlPart.replace('url ', ''));
    });

  // Get cached user profile for author info
  const cachedProfile = await this.getCachedProfile?.(userId);

  await SocialFeedService.insertPost({
    event_id: ndkEvent.id || '',
    npub: userId,
    content: ndkEvent.content,
    images,
    hashtags,
    author_name: cachedProfile?.name || cachedProfile?.display_name || '',
    author_avatar: cachedProfile?.picture || '',
    created_at: new Date((ndkEvent.created_at || 0) * 1000).toISOString(),
  });
} catch (dualWriteError) {
  // Non-fatal — post was published to Nostr, feed insert is best-effort
  console.warn('[workoutPublishingService] Dual-write to social_feed failed:', dualWriteError);
}
```

- [ ] **Step 4: Verify compiles**

Run: `npm run typecheck 2>&1 | tail -3`

- [ ] **Step 5: Commit**

```bash
git add src/services/nostr/workoutPublishingService.ts
git commit -m "Feature: Dual-write workout shares to social_feed for instant feed"
```

---

## Task 9: Verification

**Files:** None (testing only)

- [ ] **Step 1: Write verification script**

Create `scripts/verify/verify-social-tab.ts`:
```typescript
/**
 * Verify Social Tab implementation
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) { console.log(`  PASS: ${name}`); passed++; }
  else { console.log(`  FAIL: ${name}`); failed++; }
}

function readFile(p: string) { return fs.readFileSync(path.join(ROOT, p), 'utf-8'); }
function fileExists(p: string) { return fs.existsSync(path.join(ROOT, p)); }

console.log('\n--- File existence ---');
check('types/social.ts', fileExists('src/types/social.ts'));
check('SocialFeedService.ts', fileExists('src/services/social/SocialFeedService.ts'));
check('ClubsRow.tsx', fileExists('src/components/social/ClubsRow.tsx'));
check('SocialFeedPost.tsx', fileExists('src/components/social/SocialFeedPost.tsx'));
check('SocialScreen.tsx', fileExists('src/screens/SocialScreen.tsx'));
check('migration 159', fileExists('supabase/migrations/159_social_feed.sql'));

console.log('\n--- Navigation ---');
const nav = readFile('src/navigation/BottomTabNavigator.tsx');
check('Social in BottomTabParamList', nav.includes('Social'));
check('No Clubs in ParamList', !nav.includes("Clubs:"));
check('chatbubbles icon', nav.includes('chatbubbles'));
check('SocialScreen imported', nav.includes('SocialScreen'));

console.log('\n--- No stale Clubs references ---');
const appNav = readFile('src/navigation/AppNavigator.tsx');
const handlers = readFile('src/navigation/navigationHandlers.ts');
const notif = readFile('src/components/profile/NotificationModal.tsx');
check('AppNavigator: no navigate Clubs', !appNav.includes("navigate('Clubs')"));
check('Handlers: no navigate Clubs', !handlers.includes("navigate('Clubs')"));
check('NotificationModal: no navigate Clubs', !notif.includes("navigate('Clubs')"));

console.log('\n--- Dual-write ---');
const publish = readFile('src/services/nostr/workoutPublishingService.ts');
check('SocialFeedService imported', publish.includes('SocialFeedService'));
check('insertPost called', publish.includes('insertPost'));

console.log('\n--- timeAgo function ---');
const { timeAgo } = require('../../src/types/social');
check('timeAgo: now', timeAgo(new Date().toISOString()) === 'now');
check('timeAgo: minutes', timeAgo(new Date(Date.now() - 300000).toISOString()) === '5m ago');
check('timeAgo: hours', timeAgo(new Date(Date.now() - 7200000).toISOString()) === '2h ago');

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 2: Run verification**

Run: `npx tsx scripts/verify/verify-social-tab.ts`
Expected: All checks pass

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add scripts/verify/verify-social-tab.ts
git commit -m "Chore: Add social tab verification script"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Social feed types + timeAgo | `src/types/social.ts` | — |
| 2 | Supabase migration | `supabase/migrations/159_social_feed.sql` | — |
| 3 | SocialFeedService | `src/services/social/SocialFeedService.ts` | — |
| 4 | ClubsRow component | `src/components/social/ClubsRow.tsx` | — |
| 5 | SocialFeedPost component | `src/components/social/SocialFeedPost.tsx` | — |
| 6 | SocialScreen | `src/screens/SocialScreen.tsx` | — |
| 7 | Navigation rename | — | 4 files (navigate Clubs → Social) |
| 8 | Dual-write | — | `workoutPublishingService.ts` |
| 9 | Verification | `scripts/verify/verify-social-tab.ts` | — |

**Not in scope:** The external Nostr indexer that populates `social_feed` from relay data. The app-side code is complete without it — the feed will show user's own posts via dual-write, and will show community posts once the indexer is running.
