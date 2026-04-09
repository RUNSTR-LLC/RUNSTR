# Social Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add like, zap, and repost buttons to social feed posts with Nostr publishing + Supabase dual-write for instant UI feedback.

**Architecture:** New `SocialInteractionRow` component renders below each post. `SocialInteractionService` handles Nostr event creation/publish via NDKEvent + Supabase RPC calls for atomic count updates. Zaps use existing `LightningZapService` (modified to accept eventId). Comment icon is a visual placeholder only.

**Tech Stack:** React Native, NDK, UnifiedSigningService, LightningZapService, PaymentRouter, Supabase RPC

**Spec:** `docs/superpowers/specs/2026-03-27-social-interactions-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/social/SocialInteractionRow.tsx` | Like/zap/repost/comment icon row UI |
| `src/services/social/SocialInteractionService.ts` | Nostr publish + Supabase RPC for interactions |
| `supabase/migrations/161_social_feed_interactions.sql` | Add count columns + RPC functions |

### Modified Files
| File | Change |
|------|--------|
| `src/types/social.ts` | Add interaction fields to SocialFeedPost interface |
| `src/components/social/SocialFeedPost.tsx` | Add SocialInteractionRow below content |
| `src/services/nutzap/LightningZapService.ts` | Add optional `eventId` param for NIP-57 |

---

## Task 1: Supabase Migration — Interaction Columns + RPC Functions

**Files:**
- Create: `supabase/migrations/161_social_feed_interactions.sql`

- [ ] **Step 1: Create migration**

```sql
-- Migration 161: Social feed interaction columns and RPC functions
-- Adds like/repost/zap tracking with atomic Postgres functions

-- Add interaction columns
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0;
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS zap_total INTEGER DEFAULT 0;
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS liked_by TEXT[] DEFAULT '{}';
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS reposted_by TEXT[] DEFAULT '{}';

-- Toggle like: add/remove from array, increment/decrement count atomically
CREATE OR REPLACE FUNCTION toggle_social_like(post_id UUID, user_npub TEXT)
RETURNS TABLE(new_like_count INTEGER, is_liked BOOLEAN) AS $$
DECLARE
  currently_liked BOOLEAN;
BEGIN
  SELECT user_npub = ANY(liked_by) INTO currently_liked
  FROM social_feed WHERE id = post_id;

  IF currently_liked THEN
    UPDATE social_feed
    SET liked_by = array_remove(liked_by, user_npub),
        like_count = GREATEST(like_count - 1, 0)
    WHERE id = post_id;
    RETURN QUERY SELECT like_count, false FROM social_feed WHERE id = post_id;
  ELSE
    UPDATE social_feed
    SET liked_by = array_append(liked_by, user_npub),
        like_count = like_count + 1
    WHERE id = post_id;
    RETURN QUERY SELECT like_count, true FROM social_feed WHERE id = post_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add repost: no-op if already reposted
CREATE OR REPLACE FUNCTION add_social_repost(post_id UUID, user_npub TEXT)
RETURNS TABLE(new_repost_count INTEGER, was_added BOOLEAN) AS $$
DECLARE
  already_reposted BOOLEAN;
BEGIN
  SELECT user_npub = ANY(reposted_by) INTO already_reposted
  FROM social_feed WHERE id = post_id;

  IF already_reposted THEN
    RETURN QUERY SELECT repost_count, false FROM social_feed WHERE id = post_id;
  ELSE
    UPDATE social_feed
    SET reposted_by = array_append(reposted_by, user_npub),
        repost_count = repost_count + 1
    WHERE id = post_id;
    RETURN QUERY SELECT repost_count, true FROM social_feed WHERE id = post_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add zap amount
CREATE OR REPLACE FUNCTION add_social_zap(post_id UUID, amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
BEGIN
  UPDATE social_feed
  SET zap_total = zap_total + amount
  WHERE id = post_id
  RETURNING zap_total INTO new_total;
  RETURN new_total;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/161_social_feed_interactions.sql
git commit -m "Feature: Add social feed interaction columns and RPC functions"
```

---

## Task 2: Update Social Types

**Files:**
- Modify: `src/types/social.ts`

- [ ] **Step 1: Add interaction fields to SocialFeedPost interface**

Add these fields after `indexed_at`:
```typescript
  like_count: number;
  repost_count: number;
  zap_total: number;
  liked_by: string[] | null;
  reposted_by: string[] | null;
```

- [ ] **Step 2: Commit**

```bash
git add src/types/social.ts
git commit -m "Feature: Add interaction fields to SocialFeedPost type"
```

---

## Task 3: Modify LightningZapService — Add eventId Parameter

**Files:**
- Modify: `src/services/nutzap/LightningZapService.ts`

- [ ] **Step 1: Read the file first**

Read `src/services/nutzap/LightningZapService.ts` and find:
- The `sendLightningZap` method signature
- Where the kind 9734 zap request tags are built (the `zapRequest.tags = [...]` block)

- [ ] **Step 2: Add optional eventId parameter**

Change the method signature from:
```typescript
async sendLightningZap(
  recipientPubkey: string,
  amount: number,
  memo: string = ''
): Promise<LightningZapResult>
```
to:
```typescript
async sendLightningZap(
  recipientPubkey: string,
  amount: number,
  memo: string = '',
  eventId?: string
): Promise<LightningZapResult>
```

- [ ] **Step 3: Add event tag to zap request**

In the section where `zapRequest.tags` is built, add the event tag conditionally:
```typescript
zapRequest.tags = [
  ['p', recipientPubkey],
  ['amount', (amount * 1000).toString()],
  ['relays', 'wss://relay.damus.io', 'wss://nos.lol'],
];
// Add event reference for NIP-57 post zaps
if (eventId) {
  zapRequest.tags.push(['e', eventId]);
}
```

- [ ] **Step 4: Verify compiles**

Run: `npm run typecheck 2>&1 | tail -3`

- [ ] **Step 5: Commit**

```bash
git add src/services/nutzap/LightningZapService.ts
git commit -m "Feature: Add optional eventId param to LightningZapService for NIP-57 post zaps"
```

---

## Task 4: SocialInteractionService

**Files:**
- Create: `src/services/social/SocialInteractionService.ts`

- [ ] **Step 1: Create the service**

```typescript
// src/services/social/SocialInteractionService.ts

import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';
import { LightningZapService } from '../nutzap/LightningZapService';
import { PaymentRouter } from '../wallet/PaymentRouter';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

const DEFAULT_ZAP_AMOUNT = 100;
const PUBLISH_TIMEOUT_MS = 10000;

export class SocialInteractionService {
  private static instance: SocialInteractionService;

  static getInstance(): SocialInteractionService {
    if (!SocialInteractionService.instance) {
      SocialInteractionService.instance = new SocialInteractionService();
    }
    return SocialInteractionService.instance;
  }

  /**
   * Like or unlike a post.
   * Publishes kind 7 to Nostr (like only), dual-writes to Supabase.
   */
  async toggleLike(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    newCount: number;
    isLiked: boolean;
    error?: string;
  }> {
    const userNpub = await this.getUserNpub();
    if (!userNpub) return { success: false, newCount: 0, isLiked: false, error: 'Not signed in' };

    // Supabase RPC (atomic toggle)
    if (!isSupabaseConfigured()) return { success: false, newCount: 0, isLiked: false, error: 'Supabase not configured' };

    const { data, error: rpcError } = await supabase!
      .rpc('toggle_social_like', { post_id: postId, user_npub: userNpub });

    if (rpcError) {
      console.error('[SocialInteraction] toggle_social_like error:', rpcError);
      return { success: false, newCount: 0, isLiked: false, error: 'Failed to update like' };
    }

    const result = data?.[0] || { new_like_count: 0, is_liked: false };
    const isLiked = result.is_liked;

    // Publish kind 7 to Nostr (like only, not unlike)
    if (isLiked) {
      this.publishKind7(eventId, authorPubkey).catch((err) =>
        console.warn('[SocialInteraction] Kind 7 publish failed:', err)
      );
    }

    return { success: true, newCount: result.new_like_count, isLiked };
  }

  /**
   * Repost a post.
   * Publishes kind 6 to Nostr, dual-writes to Supabase.
   */
  async repost(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    newCount: number;
    wasAdded: boolean;
    error?: string;
  }> {
    const userNpub = await this.getUserNpub();
    if (!userNpub) return { success: false, newCount: 0, wasAdded: false, error: 'Not signed in' };

    if (!isSupabaseConfigured()) return { success: false, newCount: 0, wasAdded: false, error: 'Supabase not configured' };

    const { data, error: rpcError } = await supabase!
      .rpc('add_social_repost', { post_id: postId, user_npub: userNpub });

    if (rpcError) {
      console.error('[SocialInteraction] add_social_repost error:', rpcError);
      return { success: false, newCount: 0, wasAdded: false, error: 'Failed to repost' };
    }

    const result = data?.[0] || { new_repost_count: 0, was_added: false };

    // Publish kind 6 to Nostr (only if new repost)
    if (result.was_added) {
      this.publishKind6(eventId, authorPubkey).catch((err) =>
        console.warn('[SocialInteraction] Kind 6 publish failed:', err)
      );
    }

    return { success: true, newCount: result.new_repost_count, wasAdded: result.was_added };
  }

  /**
   * Zap a post via LightningZapService + NWC.
   */
  async zap(postId: string, eventId: string, authorPubkey: string): Promise<{
    success: boolean;
    newTotal: number;
    error?: string;
  }> {
    // Check wallet availability
    const walletAvailable = await PaymentRouter.isWalletAvailable();
    if (!walletAvailable) {
      return { success: false, newTotal: 0, error: 'Connect a wallet in Settings to zap' };
    }

    try {
      const zapService = LightningZapService.getInstance();
      const result = await zapService.sendLightningZap(
        authorPubkey,
        DEFAULT_ZAP_AMOUNT,
        '',
        eventId
      );

      if (!result.success) {
        return { success: false, newTotal: 0, error: result.error || 'Zap failed' };
      }

      // Dual-write zap amount to Supabase
      let newTotal = 0;
      if (isSupabaseConfigured()) {
        const { data } = await supabase!
          .rpc('add_social_zap', { post_id: postId, amount: DEFAULT_ZAP_AMOUNT });
        newTotal = data || 0;
      }

      return { success: true, newTotal };
    } catch (error) {
      console.error('[SocialInteraction] zap error:', error);
      return { success: false, newTotal: 0, error: 'Zap failed' };
    }
  }

  // --- Private helpers ---

  private async getUserNpub(): Promise<string | null> {
    try {
      const pubkey = await UnifiedSigningService.getInstance().getUserPubkey();
      return pubkey;
    } catch {
      return null;
    }
  }

  private async publishKind7(eventId: string, authorPubkey: string): Promise<void> {
    const ndk = await GlobalNDKService.getInstance();
    const signer = await UnifiedSigningService.getInstance().getSigner();
    if (!signer) throw new Error('No signer');

    const event = new NDKEvent(ndk);
    event.kind = 7 as NDKKind;
    event.content = '+';
    event.tags = [
      ['e', eventId, ''],
      ['p', authorPubkey],
    ];

    await Promise.race([
      event.publish(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Publish timeout')), PUBLISH_TIMEOUT_MS)),
    ]);
  }

  private async publishKind6(eventId: string, authorPubkey: string): Promise<void> {
    const ndk = await GlobalNDKService.getInstance();
    const signer = await UnifiedSigningService.getInstance().getSigner();
    if (!signer) throw new Error('No signer');

    const event = new NDKEvent(ndk);
    event.kind = 6 as NDKKind;
    event.content = '';
    event.tags = [
      ['e', eventId, ''],
      ['p', authorPubkey],
    ];

    await Promise.race([
      event.publish(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Publish timeout')), PUBLISH_TIMEOUT_MS)),
    ]);
  }
}

export default SocialInteractionService.getInstance();
```

- [ ] **Step 2: Verify compiles**

Run: `npm run typecheck 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/services/social/SocialInteractionService.ts
git commit -m "Feature: Add SocialInteractionService with like/zap/repost + Nostr publish"
```

---

## Task 5: SocialInteractionRow Component

**Files:**
- Create: `src/components/social/SocialInteractionRow.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/social/SocialInteractionRow.tsx

import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import SocialInteractionService from '../../services/social/SocialInteractionService';
import type { SocialFeedPost } from '../../types/social';

interface SocialInteractionRowProps {
  post: SocialFeedPost;
  userNpub: string;
}

export const SocialInteractionRow: React.FC<SocialInteractionRowProps> = ({ post, userNpub }) => {
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [repostCount, setRepostCount] = useState(post.repost_count || 0);
  const [zapTotal, setZapTotal] = useState(post.zap_total || 0);
  const [isLiked, setIsLiked] = useState(post.liked_by?.includes(userNpub) || false);
  const [isReposted, setIsReposted] = useState(post.reposted_by?.includes(userNpub) || false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const debounceRef = useRef<number>(0);
  const zapFlash = useRef(new Animated.Value(1)).current;

  const debounce = useCallback((action: string, fn: () => Promise<void>) => {
    const now = Date.now();
    if (now - debounceRef.current < 500 || isProcessing) return;
    debounceRef.current = now;
    setIsProcessing(action);
    fn().finally(() => setIsProcessing(null));
  }, [isProcessing]);

  const handleLike = useCallback(() => {
    debounce('like', async () => {
      // Optimistic
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      setLikeCount((c) => wasLiked ? Math.max(c - 1, 0) : c + 1);

      const result = await SocialInteractionService.toggleLike(post.id, post.event_id, post.npub);
      if (!result.success) {
        // Revert
        setIsLiked(wasLiked);
        setLikeCount((c) => wasLiked ? c + 1 : Math.max(c - 1, 0));
      } else {
        setLikeCount(result.newCount);
        setIsLiked(result.isLiked);
      }
    });
  }, [isLiked, post, debounce]);

  const handleZap = useCallback(() => {
    debounce('zap', async () => {
      const result = await SocialInteractionService.zap(post.id, post.event_id, post.npub);
      if (result.success) {
        setZapTotal(result.newTotal);
        // Flash animation
        Animated.sequence([
          Animated.timing(zapFlash, { toValue: 1.4, duration: 150, useNativeDriver: true }),
          Animated.timing(zapFlash, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
      }
      // Error handling: toast would be shown by caller or service
    });
  }, [post, debounce, zapFlash]);

  const handleRepost = useCallback(() => {
    if (isReposted) return; // No un-repost
    debounce('repost', async () => {
      // Optimistic
      setIsReposted(true);
      setRepostCount((c) => c + 1);

      const result = await SocialInteractionService.repost(post.id, post.event_id, post.npub);
      if (!result.success || !result.wasAdded) {
        setIsReposted(false);
        setRepostCount((c) => Math.max(c - 1, 0));
      } else {
        setRepostCount(result.newCount);
      }
    });
  }, [isReposted, post, debounce]);

  const formatCount = (n: number): string => {
    if (n === 0) return '';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <View style={styles.row}>
      {/* Like */}
      <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.7}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={20}
          color={isLiked ? theme.colors.orangeDeep : theme.colors.textMuted}
        />
        {likeCount > 0 && <Text style={[styles.count, isLiked && styles.countActive]}>{formatCount(likeCount)}</Text>}
      </TouchableOpacity>

      {/* Zap */}
      <TouchableOpacity style={styles.action} onPress={handleZap} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ scale: zapFlash }] }}>
          <Ionicons name="flash-outline" size={20} color={theme.colors.textMuted} />
        </Animated.View>
        {zapTotal > 0 && <Text style={styles.count}>{formatCount(zapTotal)}</Text>}
      </TouchableOpacity>

      {/* Repost */}
      <TouchableOpacity style={styles.action} onPress={handleRepost} activeOpacity={0.7} disabled={isReposted}>
        <Ionicons
          name={isReposted ? 'repeat' : 'repeat-outline'}
          size={20}
          color={isReposted ? theme.colors.orangeDeep : theme.colors.textMuted}
        />
        {repostCount > 0 && <Text style={[styles.count, isReposted && styles.countActive]}>{formatCount(repostCount)}</Text>}
      </TouchableOpacity>

      {/* Comment (placeholder) */}
      <View style={styles.action}>
        <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textMuted} style={{ opacity: 0.4 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 44,
    minHeight: 32,
  },
  count: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
  },
  countActive: {
    color: theme.colors.orangeDeep,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/social/SocialInteractionRow.tsx
git commit -m "Feature: Add SocialInteractionRow with like/zap/repost/comment UI"
```

---

## Task 6: Wire Into SocialFeedPost

**Files:**
- Modify: `src/components/social/SocialFeedPost.tsx`

- [ ] **Step 1: Read the file first**

Read `src/components/social/SocialFeedPost.tsx` to find where to add the interaction row — after the image block, before the closing `</View>`.

- [ ] **Step 2: Add import**

```typescript
import { SocialInteractionRow } from './SocialInteractionRow';
```

- [ ] **Step 3: Add userNpub prop**

Update the props interface to accept `userNpub`:
```typescript
interface SocialFeedPostProps {
  post: SocialFeedPostType;
  userNpub: string;
}
```

Update the component to destructure it:
```typescript
export const SocialFeedPost: React.FC<SocialFeedPostProps> = ({ post, userNpub }) => {
```

- [ ] **Step 4: Add interaction row to JSX**

After the image block and before the closing `</View>` of the card, add:
```typescript
<SocialInteractionRow post={post} userNpub={userNpub} />
```

- [ ] **Step 5: Update SocialScreen to pass userNpub**

In `src/screens/SocialScreen.tsx`, the `renderPost` callback needs to pass `userNpub`. Read the file to find where `renderPost` is defined and where the user's npub is available. Add a state variable for `userNpub` (loaded from AsyncStorage `@runstr:npub`) and pass it to each `SocialFeedPost`:

```typescript
<SocialFeedPost post={item} userNpub={userNpub || ''} />
```

- [ ] **Step 6: Verify compiles**

Run: `npm run typecheck 2>&1 | tail -3`

- [ ] **Step 7: Commit**

```bash
git add src/components/social/SocialFeedPost.tsx src/screens/SocialScreen.tsx
git commit -m "Feature: Wire SocialInteractionRow into feed posts"
```

---

## Task 7: Verification

**Files:** None (testing only)

- [ ] **Step 1: Write verification script**

Create `scripts/verify/verify-social-interactions.ts`:
```typescript
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
check('SocialInteractionRow', fileExists('src/components/social/SocialInteractionRow.tsx'));
check('SocialInteractionService', fileExists('src/services/social/SocialInteractionService.ts'));
check('Migration 161', fileExists('supabase/migrations/161_social_feed_interactions.sql'));

console.log('\n--- Types updated ---');
const types = readFile('src/types/social.ts');
check('like_count field', types.includes('like_count'));
check('repost_count field', types.includes('repost_count'));
check('zap_total field', types.includes('zap_total'));
check('liked_by field', types.includes('liked_by'));
check('reposted_by field', types.includes('reposted_by'));

console.log('\n--- Integration ---');
const feedPost = readFile('src/components/social/SocialFeedPost.tsx');
check('SocialInteractionRow imported', feedPost.includes('SocialInteractionRow'));
check('userNpub prop', feedPost.includes('userNpub'));

console.log('\n--- LightningZapService eventId ---');
const zapService = readFile('src/services/nutzap/LightningZapService.ts');
check('eventId parameter', zapService.includes('eventId'));

console.log('\n--- Service methods ---');
const service = readFile('src/services/social/SocialInteractionService.ts');
check('toggleLike method', service.includes('toggleLike'));
check('repost method', service.includes('repost'));
check('zap method', service.includes('zap'));
check('Kind 7 publish', service.includes('kind = 7'));
check('Kind 6 publish', service.includes('kind = 6'));

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 2: Run verification**

Run: `npx tsx scripts/verify/verify-social-interactions.ts`

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add scripts/verify/verify-social-interactions.ts
git commit -m "Chore: Add social interactions verification script"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Supabase migration + RPC | `161_social_feed_interactions.sql` | — |
| 2 | Update types | — | `src/types/social.ts` |
| 3 | LightningZapService eventId | — | `LightningZapService.ts` |
| 4 | SocialInteractionService | `SocialInteractionService.ts` | — |
| 5 | SocialInteractionRow UI | `SocialInteractionRow.tsx` | — |
| 6 | Wire into feed | — | `SocialFeedPost.tsx`, `SocialScreen.tsx` |
| 7 | Verification | `verify-social-interactions.ts` | — |

**Requires `supabase db push`** after Task 1 to create the RPC functions.
