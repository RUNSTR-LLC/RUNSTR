# Phase 1: Inbound Nostr Engagement for Social Feed

**Date:** 2026-04-05
**Status:** Approved
**Related Issues:** #260, #253, #254, #252, #263 (Phase 1 covers #260 and #253 fully, lays groundwork for the rest)

## Overview

Add inbound engagement data (likes, zaps, reposts, comments) from Nostr to the RUNSTR social feed. The Supabase indexer becomes the sole write path for engagement data — the app publishes interactions to Nostr and reads everything from Supabase.

## Architecture

```
App (write) --> Nostr Relays <-- Indexer (read) --> Supabase <-- App (read)
```

- **App writes to Nostr only** for interactions (kind 7, 6, 9735)
- **App reads from Supabase only** for feed posts and engagement data
- **Indexer is the sole write path** into Supabase for all engagement
- **Optimistic local state** bridges the UI gap until the indexer catches up
- **Post dual-write stays** for workout posts (immediate visibility)

## Data Layer

### New Table: `social_feed_zaps`

Stores individual zap receipts (kind 9735) for per-zap breakdown display.

```sql
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
```

### New Table: `social_feed_comments`

Stores kind 1 reply events that reference posts in the feed.

```sql
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
```

### Changes to `social_feed`

```sql
ALTER TABLE social_feed ADD COLUMN comment_count INTEGER DEFAULT 0;
```

Existing columns stay as-is:
- `liked_by TEXT[]`, `like_count INTEGER` — populated by indexer from kind 7 events
- `reposted_by TEXT[]`, `repost_count INTEGER` — populated by indexer from kind 6 events
- `zap_total INTEGER` — recalculated by indexer as SUM from `social_feed_zaps`

### RPCs to Remove

The following Supabase RPCs are no longer called by the app (interactions go through Nostr, not direct Supabase writes):

- `toggle_social_like(post_id, user_npub)`
- `add_social_repost(post_id, user_npub)`
- `add_social_zap(post_id, amount)`

Drop these in the migration.

### Single Migration File

One migration handles all schema changes:
1. Create `social_feed_zaps` table with index
2. Create `social_feed_comments` table with index
3. Add `comment_count` column to `social_feed`
4. Drop the three RPCs

## Indexer Enhancement

Expand the existing `index-social-feed` edge function. The cron schedule stays at 5 minutes.

### Extended Flow

```
Step 1: [Existing] Query relays for kind 1 posts with fitness hashtags (last 2 hours)
Step 2: [Existing] Upsert new posts into social_feed
Step 3: [NEW] Load recent post event_ids from social_feed (last 7 days)
Step 4: [NEW] Batch event_ids into chunks of 50
Step 5: [NEW] For each chunk, query relays for kinds 7, 6, 9735, 1 using #e filter
Step 6: [NEW] Process engagement results (see below)
```

### Relay Query

Uses the same 7 relays already configured for post indexing. NIP-01 filter per chunk:

```json
{ "kinds": [7, 6, 9735, 1], "#e": ["event_id_1", "event_id_2", ...] }
```

Kind 1 results are filtered server-side to only include events with `e` tags matching our posts (distinguishes replies from standalone posts).

### Processing Logic

**Kind 7 (likes):**
- Collect unique sender npubs per post from all kind 7 events
- Merge with existing `liked_by` array (union, no duplicates)
- Set `like_count` = length of merged array
- Single UPDATE per post

**Kind 6 (reposts):**
- Same pattern as likes
- Merge sender npubs into `reposted_by`, set `repost_count` = array length

**Kind 9735 (zap receipts):**
- Parse zap amount from the bolt11 invoice in the `description` tag
- Extract sender npub from the zap request embedded in the receipt
- UPSERT into `social_feed_zaps` with `ON CONFLICT (event_id) DO NOTHING`
- Recalculate `zap_total` on `social_feed` as `SELECT COALESCE(SUM(amount), 0) FROM social_feed_zaps WHERE post_id = ?`

**Kind 1 (replies/comments):**
- Match by `e` tag to find which post is the parent
- Resolve author profile (display_name, picture) from relay metadata (same approach as post indexer)
- UPSERT into `social_feed_comments` with `ON CONFLICT (event_id) DO NOTHING`
- Recalculate `comment_count` on `social_feed` as `SELECT COUNT(*) FROM social_feed_comments WHERE post_id = ?`

All operations are idempotent. Running the indexer multiple times produces the same result.

## Frontend: Interaction Flow

### Outbound (user taps interaction)

**Like:** Optimistic toggle (heart color, increment count, add npub to local `liked_by`) -> publish kind 7 to Nostr. No Supabase write.

**Repost:** Optimistic toggle (icon color, increment count) -> publish kind 6 to Nostr. No Supabase write.

**Zap:** Optimistic bump of `zap_total`, flash animation -> zap flow via external wallet (creates kind 9735 on Nostr). No Supabase write.

### Inbound (feed refresh)

On pull-to-refresh or next feed load, fresh data from Supabase replaces optimistic local state. If the indexer has caught up, counts match or exceed the optimistic values. If not, counts may briefly dip but self-correct within the next indexer cycle (up to 5 minutes).

### SocialInteractionService Changes

Remove all direct Supabase RPC calls (`toggle_social_like`, `add_social_repost`, `add_social_zap`). The service simplifies to:
- `toggleLike()` -> optimistic state + publish kind 7
- `repost()` -> optimistic state + publish kind 6
- `zap()` -> optimistic state + external zap flow
- Comment taps now open the inline comment list instead of showing "Coming soon"

## Frontend: Detail Views

### LikesBottomSheet

Triggered by tapping the like count.

- Reads `liked_by` array from the post object (already in memory)
- Resolves display names and avatars via `nostrProfileService.getProfiles()`
- Renders a scrollable list: avatar + display name, one row per user
- Dismissible bottom sheet, no actions

### ZapsBottomSheet

Triggered by tapping the zap count.

- Queries `social_feed_zaps` for the post via `SocialFeedService.getZapsForPost(postId)`
- Query: `SELECT * FROM social_feed_zaps WHERE post_id = ? ORDER BY amount DESC LIMIT 50`
- Resolves sender profiles via `nostrProfileService`
- Renders: total at top, per-zap rows with avatar + name + amount
- Dismissible bottom sheet, no actions

### Inline Comment List

Triggered by tapping the comment icon.

- Queries `social_feed_comments` via `SocialFeedService.getCommentsForPost(postId, 5)`
- Query: `SELECT * FROM social_feed_comments WHERE post_id = ? ORDER BY created_at DESC LIMIT 5`
- Expands inline below the post (not full-screen, not a bottom sheet)
- Each comment: avatar, display name, content snippet, relative timestamp
- If `comment_count > 5`, shows "View all X comments" link that navigates to a full-screen FlatList
- Read-only in Phase 1 (no reply input — that's Phase 2)

### New SocialFeedService Methods

```typescript
// Fetch per-zap breakdown for a post
static async getZapsForPost(postId: string): Promise<SocialFeedZap[]>

// Fetch comments for a post with pagination
static async getCommentsForPost(postId: string, limit?: number, cursor?: string): Promise<SocialFeedComment[]>
```

Both use the Supabase client directly (public RLS read). No edge function needed.

## New Types

```typescript
interface SocialFeedZap {
  id: string;
  event_id: string;
  post_id: string;
  sender_npub: string;
  amount: number;
  created_at: string;
  indexed_at: string;
}

interface SocialFeedComment {
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

Add `comment_count: number` to the existing `SocialFeedPost` type.

## File Inventory

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/168_social_feed_engagement.sql` | New tables, column, drop RPCs |
| Indexer | `supabase/functions/index-social-feed/index.ts` | Add engagement query + processing |
| Types | `src/types/social.ts` | Add `SocialFeedZap`, `SocialFeedComment`, `comment_count` |
| Service | `src/services/social/SocialFeedService.ts` | Add `getZapsForPost()`, `getCommentsForPost()` |
| Service | `src/services/social/SocialInteractionService.ts` | Remove Supabase RPC calls, keep Nostr publishing |
| Component | `src/components/social/SocialInteractionRow.tsx` | Comment tap opens inline list instead of toast |
| Component | `src/components/social/LikesBottomSheet.tsx` | New — like count detail view |
| Component | `src/components/social/ZapsBottomSheet.tsx` | New — zap breakdown detail view |
| Component | `src/components/social/InlineCommentList.tsx` | New — expandable comment list under post |
| Screen | `src/screens/CommentsScreen.tsx` | New — full-screen "View all" comments |

## Out of Scope (Phase 2+)

- Posting comments from the app (outbound kind 1 replies)
- Single-tap zap with NWC (#252)
- Full-screen threaded comment view with reply input
- Bumping indexer cron frequency
