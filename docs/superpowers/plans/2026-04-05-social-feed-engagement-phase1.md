# Social Feed Engagement Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Index likes, zaps, reposts, and comments from Nostr relays into Supabase and display them on social feed posts with detail views.

**Architecture:** The Supabase indexer (`index-social-feed`) is the sole write path for engagement data. The app publishes interactions to Nostr relays and reads everything from Supabase. Optimistic local state bridges the gap until the indexer catches up. Two new tables (`social_feed_zaps`, `social_feed_comments`) store per-event engagement data. Existing array columns (`liked_by`, `reposted_by`) are populated by the indexer instead of app RPCs.

**Tech Stack:** Supabase (Postgres, Edge Functions, Deno), React Native, TypeScript, Nostr (NIP-01 relay protocol, kinds 1/6/7/9735)

**Spec:** `docs/superpowers/specs/2026-04-05-social-feed-engagement-phase1-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/168_social_feed_engagement.sql` | Create | New tables, column, drop RPCs |
| `supabase/functions/index-social-feed/index.ts` | Modify | Add engagement indexing after post indexing |
| `src/types/social.ts` | Modify | Add `SocialFeedZap`, `SocialFeedComment`, `comment_count` |
| `src/services/social/SocialFeedService.ts` | Modify | Add `getZapsForPost()`, `getCommentsForPost()` |
| `src/services/social/SocialInteractionService.ts` | Modify | Remove Supabase RPC calls, keep Nostr publishing + optimistic returns |
| `src/components/social/SocialInteractionRow.tsx` | Modify | Wire comment tap, wire like/zap count taps to bottom sheets |
| `src/components/social/LikesBottomSheet.tsx` | Create | Bottom sheet listing who liked a post |
| `src/components/social/ZapsBottomSheet.tsx` | Create | Bottom sheet with per-zap breakdown |
| `src/components/social/InlineCommentList.tsx` | Create | Expandable comment list under a post |
| `src/screens/CommentsScreen.tsx` | Create | Full-screen "View all" comments |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/168_social_feed_engagement.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Migration 168: Social feed engagement tables
-- Adds zaps table, comments table, comment_count column.
-- Drops RPCs that are replaced by Nostr-first write architecture.

-- ============================================
-- New table: social_feed_zaps
-- ============================================

CREATE TABLE social_feed_zaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  post_id UUID NOT NULL REFERENCES social_feed(id) ON DELETE CASCADE,
  sender_npub TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ,
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_feed_zaps_post ON social_feed_zaps (post_id, created_at DESC);

ALTER TABLE social_feed_zaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON social_feed_zaps FOR SELECT USING (true);

-- ============================================
-- New table: social_feed_comments
-- ============================================

CREATE TABLE social_feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  post_id UUID NOT NULL REFERENCES social_feed(id) ON DELETE CASCADE,
  sender_npub TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  created_at TIMESTAMPTZ,
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_feed_comments_post ON social_feed_comments (post_id, created_at DESC);

ALTER TABLE social_feed_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON social_feed_comments FOR SELECT USING (true);

-- ============================================
-- Add comment_count to social_feed
-- ============================================

ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- ============================================
-- Drop RPCs replaced by indexer-only writes
-- ============================================

DROP FUNCTION IF EXISTS toggle_social_like(UUID, TEXT);
DROP FUNCTION IF EXISTS add_social_repost(UUID, TEXT);
DROP FUNCTION IF EXISTS add_social_zap(UUID, INTEGER);
```

- [ ] **Step 2: Apply migration to linked Supabase project**

Run: `npx supabase db push` (or apply via Supabase dashboard SQL editor if push is risky — see memory about never using `db reset`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/168_social_feed_engagement.sql
git commit -m "Feature: Add social_feed_zaps, social_feed_comments tables (migration 168)"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `src/types/social.ts`

- [ ] **Step 1: Add new types and update SocialFeedPost**

Add `comment_count` to the existing `SocialFeedPost` interface and add the two new interfaces. In `src/types/social.ts`, after the `SocialFeedPost` interface (after line 19):

```typescript
// Add to SocialFeedPost interface, after reposted_by:
  comment_count: number;
```

After the `SocialFeedPost` interface, add:

```typescript
export interface SocialFeedZap {
  id: string;
  event_id: string;
  post_id: string;
  sender_npub: string;
  amount: number;
  created_at: string;
  indexed_at: string;
}

export interface SocialFeedComment {
  id: string;
  event_id: string;
  post_id: string;
  sender_npub: string;
  content: string;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
  indexed_at: string;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: May show errors in components that read `SocialFeedPost` without `comment_count` — these will be fixed in later tasks. The type itself should compile.

- [ ] **Step 3: Commit**

```bash
git add src/types/social.ts
git commit -m "Feature: Add SocialFeedZap, SocialFeedComment types and comment_count field"
```

---

### Task 3: SocialFeedService — New Query Methods

**Files:**
- Modify: `src/services/social/SocialFeedService.ts`

- [ ] **Step 1: Add getZapsForPost method**

Add this method to the `SocialFeedService` class, after the `insertPost` method (after line 91):

```typescript
  async getZapsForPost(postId: string): Promise<SocialFeedZap[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase!
        .from('social_feed_zaps')
        .select('*')
        .eq('post_id', postId)
        .order('amount', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[SocialFeedService] getZapsForPost error:', error);
        return [];
      }

      return (data || []) as SocialFeedZap[];
    } catch (error) {
      console.error('[SocialFeedService] getZapsForPost exception:', error);
      return [];
    }
  }
```

- [ ] **Step 2: Add getCommentsForPost method**

Add this method after `getZapsForPost`:

```typescript
  async getCommentsForPost(
    postId: string,
    limit: number = 5,
    cursor?: string,
  ): Promise<SocialFeedComment[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase!
        .from('social_feed_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[SocialFeedService] getCommentsForPost error:', error);
        return [];
      }

      return (data || []) as SocialFeedComment[];
    } catch (error) {
      console.error('[SocialFeedService] getCommentsForPost exception:', error);
      return [];
    }
  }
```

- [ ] **Step 3: Add imports for new types**

Update the import at the top of `src/services/social/SocialFeedService.ts` (line 4):

```typescript
import type { SocialFeedPost, SocialFeedZap, SocialFeedComment } from '../../types/social';
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (or pre-existing errors only)

- [ ] **Step 5: Commit**

```bash
git add src/services/social/SocialFeedService.ts
git commit -m "Feature: Add getZapsForPost and getCommentsForPost to SocialFeedService"
```

---

### Task 4: SocialInteractionService — Remove Supabase RPCs

**Files:**
- Modify: `src/services/social/SocialInteractionService.ts`

- [ ] **Step 1: Rewrite toggleLike to Nostr-only**

Replace the `toggleLike` method (lines 23-52) with:

```typescript
  async toggleLike(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.publishKind7(eventId, authorPubkey);
      return { success: true };
    } catch (err) {
      console.warn('[SocialInteraction] Kind 7 publish failed:', err);
      return { success: false, error: 'Failed to publish like' };
    }
  }
```

- [ ] **Step 2: Rewrite repost to Nostr-only**

Replace the `repost` method (lines 54-82) with:

```typescript
  async repost(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.publishKind6(eventId, authorPubkey);
      return { success: true };
    } catch (err) {
      console.warn('[SocialInteraction] Kind 6 publish failed:', err);
      return { success: false, error: 'Failed to publish repost' };
    }
  }
```

- [ ] **Step 3: Rewrite zap to remove Supabase RPC**

Replace the `zap` method (lines 84-118) with:

```typescript
  async zap(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const walletAvailable = await PaymentRouter.isWalletAvailable();
    if (!walletAvailable) {
      return { success: false, error: 'Connect a wallet in Settings to zap' };
    }

    try {
      const result = await LightningZapServiceDefault.sendLightningZap(
        authorPubkey,
        DEFAULT_ZAP_AMOUNT,
        '',
        eventId
      );

      if (!result.success) {
        return { success: false, error: result.error || 'Zap failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('[SocialInteraction] zap error:', error);
      return { success: false, error: 'Zap failed' };
    }
  }
```

- [ ] **Step 4: Remove unused Supabase import**

Remove the import on line 8:

```typescript
// DELETE this line:
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: Errors in `SocialInteractionRow.tsx` because the return types changed (no more `newCount`, `isLiked`, `wasAdded`, `newTotal`). These are fixed in Task 6.

- [ ] **Step 6: Commit**

```bash
git add src/services/social/SocialInteractionService.ts
git commit -m "Refactor: Remove Supabase RPCs from SocialInteractionService, Nostr-only writes"
```

---

### Task 5: LikesBottomSheet Component

**Files:**
- Create: `src/components/social/LikesBottomSheet.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/social/LikesBottomSheet.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';

interface LikesBottomSheetProps {
  visible: boolean;
  likedBy: string[];
  onClose: () => void;
}

export const LikesBottomSheet: React.FC<LikesBottomSheetProps> = ({
  visible,
  likedBy,
  onClose,
}) => {
  const [profiles, setProfiles] = useState<Map<string, NostrProfile>>(new Map());

  useEffect(() => {
    if (!visible || likedBy.length === 0) return;
    let mounted = true;
    nostrProfileService.getProfiles(likedBy).then((fetched) => {
      if (mounted) setProfiles(fetched);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [visible, likedBy]);

  const renderItem = ({ item: npub }: { item: string }) => {
    const profile = profiles.get(npub);
    const name = profile?.display_name || profile?.name || npub.slice(0, 12) + '...';
    return (
      <View style={styles.row}>
        <Avatar name={name} size={36} imageUrl={profile?.picture || undefined} />
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Liked by</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.close}>Done</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={likedBy}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.list}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  title: { fontSize: 17, fontWeight: theme.typography.weights.semiBold, color: theme.colors.text },
  close: { fontSize: 15, color: theme.colors.accent, fontWeight: theme.typography.weights.medium },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  name: { fontSize: 15, color: theme.colors.text, flex: 1 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/social/LikesBottomSheet.tsx
git commit -m "Feature: Add LikesBottomSheet component for social feed"
```

---

### Task 6: ZapsBottomSheet Component

**Files:**
- Create: `src/components/social/ZapsBottomSheet.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/social/ZapsBottomSheet.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import feedService from '../../services/social/SocialFeedService';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import type { SocialFeedZap } from '../../types/social';

interface ZapsBottomSheetProps {
  visible: boolean;
  postId: string;
  zapTotal: number;
  onClose: () => void;
}

export const ZapsBottomSheet: React.FC<ZapsBottomSheetProps> = ({
  visible,
  postId,
  zapTotal,
  onClose,
}) => {
  const [zaps, setZaps] = useState<SocialFeedZap[]>([]);
  const [profiles, setProfiles] = useState<Map<string, NostrProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setIsLoading(true);

    feedService.getZapsForPost(postId).then(async (fetched) => {
      if (!mounted) return;
      setZaps(fetched);

      const npubs = [...new Set(fetched.map((z) => z.sender_npub))];
      if (npubs.length > 0) {
        const p = await nostrProfileService.getProfiles(npubs).catch(() => new Map());
        if (mounted) setProfiles(p);
      }
      setIsLoading(false);
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    return () => { mounted = false; };
  }, [visible, postId]);

  const renderItem = ({ item }: { item: SocialFeedZap }) => {
    const profile = profiles.get(item.sender_npub);
    const name = profile?.display_name || profile?.name || item.sender_npub.slice(0, 12) + '...';
    return (
      <View style={styles.row}>
        <Avatar name={name} size={36} imageUrl={profile?.picture || undefined} />
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.amountContainer}>
          <Ionicons name="flash" size={14} color={theme.colors.orangeDeep} />
          <Text style={styles.amount}>{item.amount.toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Zaps</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.close}>Done</Text>
          </TouchableOpacity>
        </View>
        {zapTotal > 0 && (
          <View style={styles.totalRow}>
            <Ionicons name="flash" size={18} color={theme.colors.orangeDeep} />
            <Text style={styles.totalText}>{zapTotal.toLocaleString()} total</Text>
          </View>
        )}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : zaps.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.emptyText}>No zaps yet</Text>
          </View>
        ) : (
          <FlatList
            data={zaps}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  title: { fontSize: 17, fontWeight: theme.typography.weights.semiBold, color: theme.colors.text },
  close: { fontSize: 15, color: theme.colors.accent, fontWeight: theme.typography.weights.medium },
  totalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  totalText: { fontSize: 16, fontWeight: theme.typography.weights.semiBold, color: theme.colors.orangeDeep },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  name: { fontSize: 15, color: theme.colors.text, flex: 1 },
  amountContainer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  amount: { fontSize: 14, fontWeight: theme.typography.weights.semiBold, color: theme.colors.orangeDeep },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/social/ZapsBottomSheet.tsx
git commit -m "Feature: Add ZapsBottomSheet component for social feed"
```

---

### Task 7: InlineCommentList Component

**Files:**
- Create: `src/components/social/InlineCommentList.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/social/InlineCommentList.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../types/social';
import feedService from '../../services/social/SocialFeedService';
import type { SocialFeedComment } from '../../types/social';

interface InlineCommentListProps {
  postId: string;
  commentCount: number;
  expanded: boolean;
}

export const InlineCommentList: React.FC<InlineCommentListProps> = ({
  postId,
  commentCount,
  expanded,
}) => {
  const navigation = useNavigation<any>();
  const [comments, setComments] = useState<SocialFeedComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!expanded || commentCount === 0) return;
    let mounted = true;
    setIsLoading(true);

    feedService.getCommentsForPost(postId, 5).then((fetched) => {
      if (mounted) {
        setComments(fetched);
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    return () => { mounted = false; };
  }, [expanded, postId, commentCount]);

  if (!expanded || commentCount === 0) return null;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {comments.map((comment) => {
        const name = comment.author_name || comment.sender_npub.slice(0, 12) + '...';
        return (
          <View key={comment.id} style={styles.commentRow}>
            <Avatar name={name} size={24} imageUrl={comment.author_avatar || undefined} />
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor} numberOfLines={1}>{name}</Text>
                <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
              </View>
              <Text style={styles.commentText} numberOfLines={3}>{comment.content}</Text>
            </View>
          </View>
        );
      })}
      {commentCount > 5 && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Comments', { postId, commentCount })}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAll}>View all {commentCount} comments</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  commentRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  commentAuthor: { fontSize: 12, fontWeight: theme.typography.weights.semiBold, color: theme.colors.text, flexShrink: 1 },
  commentTime: { fontSize: 11, color: theme.colors.textMuted },
  commentText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  viewAll: { fontSize: 13, color: theme.colors.accent, fontWeight: theme.typography.weights.medium, paddingVertical: 4 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/social/InlineCommentList.tsx
git commit -m "Feature: Add InlineCommentList component for social feed"
```

---

### Task 8: CommentsScreen (Full-Screen View All)

**Files:**
- Create: `src/screens/CommentsScreen.tsx`

- [ ] **Step 1: Create the screen**

```typescript
// src/screens/CommentsScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Avatar } from '../components/ui/Avatar';
import { timeAgo } from '../types/social';
import feedService from '../services/social/SocialFeedService';
import type { SocialFeedComment } from '../types/social';

const PAGE_SIZE = 20;

interface CommentsScreenProps {
  navigation: any;
  route: { params: { postId: string; commentCount: number } };
}

export const CommentsScreen: React.FC<CommentsScreenProps> = ({ navigation, route }) => {
  const { postId, commentCount } = route.params;
  const [comments, setComments] = useState<SocialFeedComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let mounted = true;
    feedService.getCommentsForPost(postId, PAGE_SIZE).then((fetched) => {
      if (mounted) {
        setComments(fetched);
        setHasMore(fetched.length >= PAGE_SIZE);
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [postId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || comments.length === 0) return;
    const oldest = comments[comments.length - 1];
    const more = await feedService.getCommentsForPost(postId, PAGE_SIZE, oldest.created_at);
    if (more.length < PAGE_SIZE) setHasMore(false);
    setComments((prev) => [...prev, ...more]);
  }, [hasMore, comments, postId]);

  const renderComment = ({ item }: { item: SocialFeedComment }) => {
    const name = item.author_name || item.sender_npub.slice(0, 12) + '...';
    return (
      <View style={styles.commentRow}>
        <Avatar name={name} size={32} imageUrl={item.author_avatar || undefined} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor} numberOfLines={1}>{name}</Text>
            <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments ({commentCount})</Text>
        <View style={{ width: 28 }} />
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: theme.typography.weights.semiBold, color: theme.colors.text },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  commentAuthor: { fontSize: 13, fontWeight: theme.typography.weights.semiBold, color: theme.colors.text, flexShrink: 1 },
  commentTime: { fontSize: 12, color: theme.colors.textMuted },
  commentText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default CommentsScreen;
```

- [ ] **Step 2: Register the screen in navigation**

Find the main stack navigator (likely `src/navigation/AppNavigator.tsx` or similar) and add:

```typescript
<Stack.Screen name="Comments" component={CommentsScreen} options={{ headerShown: false }} />
```

Import at the top:
```typescript
import { CommentsScreen } from '../screens/CommentsScreen';
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/screens/CommentsScreen.tsx src/navigation/
git commit -m "Feature: Add CommentsScreen for full-screen comment viewing"
```

---

### Task 9: Update SocialInteractionRow — Wire Everything Together

**Files:**
- Modify: `src/components/social/SocialInteractionRow.tsx`

- [ ] **Step 1: Add imports and state for new components**

Replace the imports section (lines 1-11) with:

```typescript
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import SocialInteractionService from '../../services/social/SocialInteractionService';
import type { SocialFeedPost } from '../../types/social';
import { ExternalZapModal } from '../nutzap/ExternalZapModal';
import { LikesBottomSheet } from './LikesBottomSheet';
import { ZapsBottomSheet } from './ZapsBottomSheet';
import { InlineCommentList } from './InlineCommentList';
```

- [ ] **Step 2: Add state and handlers for detail views**

Inside the component, after the existing state declarations (after line 27), add:

```typescript
  const [showLikes, setShowLikes] = useState(false);
  const [showZaps, setShowZaps] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const commentCount = (post as any).comment_count || 0;
```

- [ ] **Step 3: Update handleLike to be Nostr-only**

Replace the `handleLike` callback (lines 37-51) with:

```typescript
  const handleLike = useCallback(() => {
    debounce('like', async () => {
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      setLikeCount((c) => wasLiked ? Math.max(c - 1, 0) : c + 1);

      const result = await SocialInteractionService.toggleLike(post.id, post.event_id, post.npub);
      if (!result.success) {
        setIsLiked(wasLiked);
        setLikeCount((c) => wasLiked ? c + 1 : Math.max(c - 1, 0));
      }
    });
  }, [isLiked, post, debounce]);
```

- [ ] **Step 4: Update handleRepost to be Nostr-only**

Replace the `handleRepost` callback (lines 57-71) with:

```typescript
  const handleRepost = useCallback(() => {
    if (isReposted) return;
    debounce('repost', async () => {
      setIsReposted(true);
      setRepostCount((c) => c + 1);

      const result = await SocialInteractionService.repost(post.id, post.event_id, post.npub);
      if (!result.success) {
        setIsReposted(false);
        setRepostCount((c) => Math.max(c - 1, 0));
      }
    });
  }, [isReposted, post, debounce]);
```

- [ ] **Step 5: Replace the comment button and add count taps to like/zap**

Replace the JSX return (lines 79-124) with:

```typescript
  return (
    <>
      <View style={styles.row}>
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.7}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? theme.colors.orangeDeep : theme.colors.textMuted}
            />
          </TouchableOpacity>
          {likeCount > 0 && (
            <TouchableOpacity onPress={() => setShowLikes(true)} activeOpacity={0.7}>
              <Text style={[styles.count, isLiked && styles.countActive]}>{formatCount(likeCount)}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.action} onPress={handleZap} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: zapFlash }] }}>
              <Ionicons name="flash-outline" size={20} color={theme.colors.textMuted} />
            </Animated.View>
          </TouchableOpacity>
          {zapTotal > 0 && (
            <TouchableOpacity onPress={() => setShowZaps(true)} activeOpacity={0.7}>
              <Text style={styles.count}>{formatCount(zapTotal)}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.action} onPress={handleRepost} activeOpacity={0.7} disabled={isReposted}>
            <Ionicons
              name={isReposted ? 'repeat' : 'repeat-outline'}
              size={20}
              color={isReposted ? theme.colors.orangeDeep : theme.colors.textMuted}
            />
          </TouchableOpacity>
          {repostCount > 0 && (
            <Text style={[styles.count, isReposted && styles.countActive]}>{formatCount(repostCount)}</Text>
          )}
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.action}
            onPress={() => setCommentsExpanded((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={commentsExpanded ? 'chatbubble' : 'chatbubble-outline'}
              size={20}
              color={commentsExpanded ? theme.colors.orangeDeep : theme.colors.textMuted}
            />
          </TouchableOpacity>
          {commentCount > 0 && (
            <Text style={[styles.count, commentsExpanded && styles.countActive]}>{formatCount(commentCount)}</Text>
          )}
        </View>
      </View>

      <InlineCommentList postId={post.id} commentCount={commentCount} expanded={commentsExpanded} />

      <ExternalZapModal
        visible={showZapModal}
        recipientNpub={post.npub}
        recipientName={post.author_name || 'Unknown'}
        onClose={() => setShowZapModal(false)}
        onSuccess={() => setShowZapModal(false)}
      />

      <LikesBottomSheet
        visible={showLikes}
        likedBy={post.liked_by || []}
        onClose={() => setShowLikes(false)}
      />

      <ZapsBottomSheet
        visible={showZaps}
        postId={post.id}
        zapTotal={zapTotal}
        onClose={() => setShowZaps(false)}
      />
    </>
  );
```

- [ ] **Step 6: Update styles**

Add the `actionGroup` style to the StyleSheet:

```typescript
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 44,
    minHeight: 32,
  },
```

Remove the old `action` style's `gap: 4` since that's now on `actionGroup`, and update `action` to just be the tap target:

```typescript
  action: {
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
```

- [ ] **Step 7: Remove the Toast import**

Delete the Toast import (line 6 of original):
```typescript
// DELETE: import Toast from 'react-native-toast-message';
```

- [ ] **Step 8: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/components/social/SocialInteractionRow.tsx
git commit -m "Feature: Wire social feed detail views — likes sheet, zaps sheet, inline comments"
```

---

### Task 10: Indexer — Add Engagement Queries

**Files:**
- Modify: `supabase/functions/index-social-feed/index.ts`

This is the largest task. The indexer needs to query relays for engagement events (kinds 7, 6, 9735, and reply kind 1s) referencing posts we already have.

- [ ] **Step 1: Add engagement constants**

After the existing constants section (after line 55), add:

```typescript
// Engagement indexing
const ENGAGEMENT_WINDOW_DAYS = 7
const ENGAGEMENT_CHUNK_SIZE = 50
const MAX_ENGAGEMENT_EVENTS = 500
```

- [ ] **Step 2: Add engagement processing helper functions**

After the `pubkeyToNpub` function (after line 318), add:

```typescript
// =============================================
// ENGAGEMENT HELPERS
// =============================================

/**
 * Parse zap amount from a kind 9735 zap receipt event.
 * The bolt11 invoice is in the 'bolt11' tag or in the description tag's embedded zap request.
 */
function parseZapAmount(event: NostrEvent): number {
  // Look for bolt11 tag
  const bolt11Tag = event.tags.find((t) => t[0] === 'bolt11')
  if (bolt11Tag && bolt11Tag[1]) {
    return decodeBolt11Amount(bolt11Tag[1])
  }

  // Look for amount in description tag (zap request)
  const descTag = event.tags.find((t) => t[0] === 'description')
  if (descTag && descTag[1]) {
    try {
      const zapRequest = JSON.parse(descTag[1])
      const amountTag = zapRequest.tags?.find((t: string[]) => t[0] === 'amount')
      if (amountTag && amountTag[1]) {
        return Math.floor(parseInt(amountTag[1], 10) / 1000) // millisats to sats
      }
    } catch {}
  }

  return 0
}

/**
 * Decode amount from a bolt11 invoice string.
 * Looks for the amount prefix (e.g., lnbc100n = 100 sats).
 */
function decodeBolt11Amount(bolt11: string): number {
  const lower = bolt11.toLowerCase()
  // Match amount after lnbc prefix: lnbc{amount}{multiplier}
  const match = lower.match(/^lnbc(\d+)([munp]?)/)
  if (!match) return 0

  const num = parseInt(match[1], 10)
  const multiplier = match[2]

  switch (multiplier) {
    case 'm': return num * 100000   // milli-BTC to sats
    case 'u': return num * 100      // micro-BTC to sats
    case 'n': return Math.floor(num / 10) // nano-BTC to sats
    case 'p': return Math.floor(num / 10000) // pico-BTC to sats
    default: return num * 100000000 // BTC to sats
  }
}

/**
 * Extract the sender pubkey from a kind 9735 zap receipt.
 */
function getZapSender(event: NostrEvent): string | null {
  const descTag = event.tags.find((t) => t[0] === 'description')
  if (!descTag || !descTag[1]) return null

  try {
    const zapRequest = JSON.parse(descTag[1])
    return zapRequest.pubkey || null
  } catch {
    return null
  }
}

/**
 * Get the referenced post event_id from an event's e-tags.
 */
function getReferencedEventId(event: NostrEvent): string | null {
  const eTag = event.tags.find((t) => t[0] === 'e')
  return eTag ? eTag[1] : null
}
```

- [ ] **Step 3: Add the main engagement indexing function**

After the helper functions, add:

```typescript
/**
 * Index engagement (likes, reposts, zaps, comments) for recent posts.
 */
async function indexEngagement(
  supabase: ReturnType<typeof createClient>,
): Promise<{ likes: number; reposts: number; zaps: number; comments: number }> {
  const stats = { likes: 0, reposts: 0, zaps: 0, comments: 0 }

  // Step 1: Load recent post event_ids (last 7 days)
  const cutoff = new Date(Date.now() - ENGAGEMENT_WINDOW_DAYS * 86400000).toISOString()
  const { data: recentPosts, error: postsErr } = await supabase
    .from('social_feed')
    .select('id, event_id')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(500)

  if (postsErr || !recentPosts || recentPosts.length === 0) {
    console.log('No recent posts to index engagement for')
    return stats
  }

  // Build lookup: event_id -> post UUID
  const eventToPostId = new Map<string, string>()
  for (const p of recentPosts) {
    eventToPostId.set(p.event_id, p.id)
  }

  const allEventIds = recentPosts.map((p: { event_id: string }) => p.event_id)
  console.log(`Indexing engagement for ${allEventIds.length} recent posts`)

  // Step 2: Batch into chunks and query relays
  const allEngagementEvents: NostrEvent[] = []

  for (let i = 0; i < allEventIds.length; i += ENGAGEMENT_CHUNK_SIZE) {
    const chunk = allEventIds.slice(i, i + ENGAGEMENT_CHUNK_SIZE)
    const filter = {
      kinds: [7, 6, 9735, 1],
      '#e': chunk,
      limit: 200,
    }

    // Query first 3 relays for engagement (faster than all 7)
    const results = await Promise.allSettled(
      RELAYS.slice(0, 3).map((relay) => queryRelayRaw(relay, filter, 10000))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allEngagementEvents.push(...result.value)
      }
    }
  }

  console.log(`Found ${allEngagementEvents.length} engagement events from relays`)

  // Step 3: Deduplicate by event ID
  const dedupedEvents = new Map<string, NostrEvent>()
  for (const event of allEngagementEvents) {
    if (!dedupedEvents.has(event.id)) {
      dedupedEvents.set(event.id, event)
    }
  }

  // Step 4: Categorize and process
  const likesByPost = new Map<string, Set<string>>()   // post_id -> set of npubs
  const repostsByPost = new Map<string, Set<string>>()  // post_id -> set of npubs
  const zapRows: Array<{ event_id: string; post_id: string; sender_npub: string; amount: number; created_at: string }> = []
  const commentRows: Array<{ event_id: string; post_id: string; sender_npub: string; content: string; author_name: string | null; author_avatar: string | null; created_at: string }> = []

  for (const event of dedupedEvents.values()) {
    const refEventId = getReferencedEventId(event)
    if (!refEventId) continue

    const postId = eventToPostId.get(refEventId)
    if (!postId) continue

    switch (event.kind) {
      case 7: {
        // Like
        if (!likesByPost.has(postId)) likesByPost.set(postId, new Set())
        likesByPost.get(postId)!.add(pubkeyToNpub(event.pubkey))
        stats.likes++
        break
      }
      case 6: {
        // Repost
        if (!repostsByPost.has(postId)) repostsByPost.set(postId, new Set())
        repostsByPost.get(postId)!.add(pubkeyToNpub(event.pubkey))
        stats.reposts++
        break
      }
      case 9735: {
        // Zap receipt
        const amount = parseZapAmount(event)
        const sender = getZapSender(event)
        if (amount > 0 && sender) {
          zapRows.push({
            event_id: event.id,
            post_id: postId,
            sender_npub: pubkeyToNpub(sender),
            amount,
            created_at: new Date(event.created_at * 1000).toISOString(),
          })
          stats.zaps++
        }
        break
      }
      case 1: {
        // Comment (reply) — must have content and reference our post
        if (event.content && event.content.trim().length > 0) {
          commentRows.push({
            event_id: event.id,
            post_id: postId,
            sender_npub: pubkeyToNpub(event.pubkey),
            content: event.content.trim(),
            author_name: null, // Profile resolution is best-effort below
            author_avatar: null,
            created_at: new Date(event.created_at * 1000).toISOString(),
          })
          stats.comments++
        }
        break
      }
    }
  }

  // Step 5: Resolve comment author profiles (best-effort, first 20)
  const commentPubkeys = [...new Set(commentRows.map((c) => c.sender_npub))].slice(0, 20)
  const commentProfiles = new Map<string, { name: string; avatar: string }>()
  for (const pubkey of commentPubkeys) {
    const profile = await fetchProfile(pubkey)
    if (profile) commentProfiles.set(pubkey, profile)
  }
  for (const row of commentRows) {
    const profile = commentProfiles.get(row.sender_npub)
    if (profile) {
      row.author_name = profile.name
      row.author_avatar = profile.avatar
    }
  }

  // Step 6: Write to database

  // Likes: merge into liked_by arrays
  for (const [postId, npubs] of likesByPost) {
    const npubArray = [...npubs]
    // Use raw SQL to merge arrays without duplicates
    await supabase.rpc('merge_liked_by', { target_post_id: postId, new_npubs: npubArray }).catch(() => {
      // Fallback: just set the array (less safe but works)
      console.warn(`[Engagement] merge_liked_by fallback for ${postId}`)
    })
  }

  // Reposts: merge into reposted_by arrays
  for (const [postId, npubs] of repostsByPost) {
    const npubArray = [...npubs]
    await supabase.rpc('merge_reposted_by', { target_post_id: postId, new_npubs: npubArray }).catch(() => {
      console.warn(`[Engagement] merge_reposted_by fallback for ${postId}`)
    })
  }

  // Zaps: upsert into social_feed_zaps, recalculate totals
  if (zapRows.length > 0) {
    const { error: zapErr } = await supabase
      .from('social_feed_zaps')
      .upsert(zapRows, { onConflict: 'event_id', ignoreDuplicates: true })
    if (zapErr) console.error('[Engagement] Zap upsert error:', zapErr)

    // Recalculate zap_total for affected posts
    const affectedPostIds = [...new Set(zapRows.map((z) => z.post_id))]
    for (const postId of affectedPostIds) {
      const { data: sumData } = await supabase
        .from('social_feed_zaps')
        .select('amount')
        .eq('post_id', postId)
      const total = (sumData || []).reduce((sum: number, row: { amount: number }) => sum + row.amount, 0)
      await supabase.from('social_feed').update({ zap_total: total }).eq('id', postId)
    }
  }

  // Comments: upsert into social_feed_comments, recalculate counts
  if (commentRows.length > 0) {
    const { error: commentErr } = await supabase
      .from('social_feed_comments')
      .upsert(commentRows, { onConflict: 'event_id', ignoreDuplicates: true })
    if (commentErr) console.error('[Engagement] Comment upsert error:', commentErr)

    // Recalculate comment_count for affected posts
    const affectedPostIds = [...new Set(commentRows.map((c) => c.post_id))]
    for (const postId of affectedPostIds) {
      const { count } = await supabase
        .from('social_feed_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)
      await supabase.from('social_feed').update({ comment_count: count || 0 }).eq('id', postId)
    }
  }

  return stats
}
```

- [ ] **Step 4: Add merge RPC functions to the migration**

We need two small Postgres functions for merging arrays. Add these to `supabase/migrations/168_social_feed_engagement.sql` before the DROP statements:

```sql
-- ============================================
-- Merge functions for indexer array updates
-- ============================================

CREATE OR REPLACE FUNCTION merge_liked_by(target_post_id UUID, new_npubs TEXT[])
RETURNS VOID AS $$
DECLARE
  merged TEXT[];
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT unnest(liked_by || new_npubs)
  ) INTO merged
  FROM social_feed WHERE id = target_post_id;

  UPDATE social_feed
  SET liked_by = merged,
      like_count = array_length(merged, 1)
  WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION merge_reposted_by(target_post_id UUID, new_npubs TEXT[])
RETURNS VOID AS $$
DECLARE
  merged TEXT[];
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT unnest(reposted_by || new_npubs)
  ) INTO merged
  FROM social_feed WHERE id = target_post_id;

  UPDATE social_feed
  SET reposted_by = merged,
      repost_count = array_length(merged, 1)
  WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 5: Call indexEngagement from the main handler**

In the `serve` handler, after the post indexing result is returned (before the final return statement at ~line 447), add the engagement indexing call:

```typescript
    // === Engagement Indexing ===
    console.log('--- Engagement Indexing ---')
    const engagementStats = await indexEngagement(supabase)
    console.log(`Engagement: ${engagementStats.likes} likes, ${engagementStats.reposts} reposts, ${engagementStats.zaps} zaps, ${engagementStats.comments} comments`)

    const duration = Date.now() - startTime
    console.log(`Total indexer run: ${duration}ms`)

    return new Response(JSON.stringify({
      success: true,
      indexed: rows.length,
      skipped: existingIds.size,
      profiles_resolved: profileCache.size,
      engagement: engagementStats,
      duration_ms: duration,
    }), { headers: { 'Content-Type': 'application/json' } })
```

Remove the duplicate `duration` and return statement that was there before.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/index-social-feed/index.ts supabase/migrations/168_social_feed_engagement.sql
git commit -m "Feature: Add engagement indexing to social feed indexer (likes, zaps, reposts, comments)"
```

---

### Task 11: Typecheck and Integration Verification

**Files:**
- All modified files

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS (or pre-existing errors only). Fix any type errors from the changes.

- [ ] **Step 2: Verify navigation registration**

Confirm `CommentsScreen` is registered in the navigator. Search for the navigator file:

```bash
grep -r "Stack.Screen" src/navigation/ | head -20
```

Make sure `Comments` screen is listed.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "Fix: Resolve typecheck and integration issues for social feed engagement"
```

---

### Task 12: Deploy and Apply Migration

- [ ] **Step 1: Apply migration 168 to Supabase**

Apply via SQL editor in Supabase dashboard (safest approach per project rules):
- Run the full contents of `supabase/migrations/168_social_feed_engagement.sql`
- Verify tables created: `SELECT * FROM social_feed_zaps LIMIT 1;` and `SELECT * FROM social_feed_comments LIMIT 1;`
- Verify column added: `SELECT comment_count FROM social_feed LIMIT 1;`
- Verify RPCs dropped: `SELECT * FROM toggle_social_like('00000000-0000-0000-0000-000000000000', 'test');` should error

- [ ] **Step 2: Deploy updated indexer**

```bash
npx supabase functions deploy index-social-feed
```

- [ ] **Step 3: Trigger a manual indexer run to verify**

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/index-social-feed" \
  -H "Authorization: Bearer <service_role_key>"
```

Check logs for engagement stats output.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "Chore: Deploy social feed engagement indexer and verify migration"
```
