# Social Tab — Design Spec

## Overview

Convert the Clubs tab into a Social tab. Top section shows a horizontal scroll of all clubs (tap to enter). Below that, a read-only feed of fitness-related Nostr kind 1 posts served from Supabase. An external indexer populates the feed by watching Nostr relays for posts with fitness hashtags. User's own workout shares dual-write to both Nostr and Supabase for instant feed appearance.

## Goals

1. **Discovery** — users see fitness content from the broader Nostr community
2. **Club access** — clubs remain easily accessible as a horizontal row
3. **Fast & responsive** — feed reads from Supabase, not relays. Paginated, cached.
4. **Immediate feedback** — user's own shared workouts appear in feed instantly via dual-write

## Tab Change

- Rename: "Clubs" → "Social"
- Icon: `people` / `people-outline` → `chatbubbles` / `chatbubbles-outline` (Ionicons)
- Screen: `ClubsScreen` → `SocialScreen` (new screen, ClubsScreen kept for club detail navigation)
- `BottomTabParamList`: rename `Clubs` to `Social` in the type and update all `navigation.navigate('Clubs')` references to `navigation.navigate('Social')`
- CLAUDE.md product structure should be updated to reflect the tab rename

Note: This changes the documented three-tab navigation from "Profile / Clubs / Rewards" to "Profile / Social / Events". CLAUDE.md must be updated as part of implementation.

## Layout

```
┌──────────────────────────────────────┐
│              Social                  │  header
├──────────────────────────────────────┤
│ (ClubA) (ClubB) (ClubC) (ClubD) ... │  horizontal scroll, all clubs
├──────────────────────────────────────┤
│                                      │
│  (avatar)  Display Name             │
│            3h ago                    │
│                                      │
│  Morning run complete! #running      │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  (avatar)  Display Name             │
│            5h ago                    │
│                                      │
│  50 pushups done. New PR.           │
│                                      │
│  ┌────────────────────────────────┐  │
│  │        [image]                 │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│  ...more posts...                    │
└──────────────────────────────────────┘
  Profile    Social    Events
```

## Clubs Row

- Horizontal `FlatList` of all active clubs from `ClubService.fetchActiveClubs()` (existing, cached)
- Each item: club avatar (40px circle) + club name below (11px, muted text)
- Tap → navigates to existing club detail page (`ClubPage` route)
- Shows all clubs, not just user's clubs — serves as both discovery and navigation
- Scrollable horizontally if more than fit on screen (~7 clubs)
- Limit to first 20 clubs. User's club (if any) shown first.
- No "Create" button in clubs row for v1 — club creation remains accessible from the club detail page via settings. Not a common action.

## Feed

### Data Source

Read from `social_feed` Supabase table. No direct Nostr relay calls from the app.

### Query

Cursor-based pagination using `created_at` (not offset-based, to avoid skipped/duplicate posts as new content is inserted):

```
SELECT * FROM social_feed
WHERE created_at < ?  -- cursor: created_at of last loaded post
ORDER BY created_at DESC
LIMIT 20
```

First load omits the WHERE clause. Infinite scroll passes the last post's `created_at` as cursor. Pull-to-refresh reloads without cursor.

### Caching

`SocialFeedService` manages its own in-memory cache (not reusing `FeedCache` — different data shape). Simple approach: cache the first page in memory, invalidate on pull-to-refresh.

### Post Card

```
┌──────────────────────────────────────┐
│  (avatar)  Display Name             │
│            3h ago                    │
│                                      │
│  Post content text here with        │
│  #hashtags visible                   │
│                                      │
│  ┌────────────────────────────────┐  │  (only if images exist)
│  │     [image]                    │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

- Read-only — no like, repost, or comment buttons. No tap action.
- Avatar: 36px, uses existing `Avatar` component with `author_avatar` URL
- Author name: resolved from `author_name` column
- Timestamp: relative ("3h ago", "2d ago") using existing time formatting
- Content: full post text with hashtags visible
- Image: first image only from `images` array. Full card width, aspect ratio preserved, max height 300px, rounded corners, `#0a0a0a` placeholder while loading. Hidden silently if load fails.

### Post Card Styling

All colors use `theme.colors.*` tokens:
- Card: `theme.colors.cardBackground` (#0a0a0a), `theme.colors.border` (#1a1a1a) border, 12px radius
- Author name: `theme.colors.text` (#FFB366)
- Timestamp: `theme.colors.textMuted` (#CC7A33)
- Content: `theme.colors.text` (#FFB366)
- Hashtags in content: `theme.colors.textMuted` (#CC7A33)
- Image placeholder: `theme.colors.cardBackground`
- Image border radius: 8px

## Supabase Schema

### `social_feed` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, `gen_random_uuid()` |
| event_id | text | UNIQUE, Nostr event ID for dedup |
| npub | text | Author public key |
| content | text | Post body |
| images | text[] | Extracted image URLs |
| hashtags | text[] | Normalized, lowercase |
| author_name | text | Cached display name |
| author_avatar | text | Cached avatar URL |
| created_at | timestamptz | Original post timestamp |
| indexed_at | timestamptz | Default `now()` |

**Indexes:**
- `created_at DESC` — feed ordering
- `event_id` unique — dedup
- `npub` — filter by author

**RLS:**
- SELECT: anyone can read
- INSERT: anyone can insert (matches existing pattern for `workout_submissions` and `reward_payments`). The dual-write from the app inserts the user's own post. Content injection risk is mitigated by the `event_id` unique constraint — an attacker can't duplicate real posts, and fake posts without valid Nostr event IDs won't match anything the indexer produces. For v2, consider routing writes through an Edge Function for server-side validation.

### Migration

New migration: `159_social_feed.sql`

## External Indexer

Edge Function or cron job, runs every 5-10 minutes:

1. Connect to Nostr relays
2. Query kind 1 events with hashtag filter: `#RUNSTR`, `#running`, `#cycling`, `#fitness`, `#pushups`, `#strength`, `#hiking`, `#walking`, `#workout`, `#exercise`
3. For each event:
   - Skip if `event_id` already in `social_feed`
   - Extract image URLs from content (regex: `https?://\S+\.(?:jpg|jpeg|png|gif|webp)`)
   - Also check `imeta` tags for image URLs
   - Extract hashtags from `t` tags
   - Resolve author profile (kind 0) for name and avatar
4. Batch insert into `social_feed`

**Not built in v1 app code** — this is a separate service. The app just reads from the table. User's own posts appear via dual-write (see below).

## Workout Share Dual-Write

When a user shares a workout summary (existing kind 1 post flow):

1. Existing: publish kind 1 event to Nostr relays
2. **New:** after Nostr publish, insert into `social_feed` on Supabase:
   - `event_id` from the published event
   - `npub` from the user
   - `content` from the post
   - `images` extracted from content
   - `hashtags` from event tags
   - `author_name` and `author_avatar` from local user profile
   - `created_at` from event timestamp

This ensures the user's post appears in the feed immediately without waiting for the indexer.

When the indexer later encounters this event on relays, the `event_id` unique constraint causes it to skip — no duplicates.

## Edge Cases

### Empty feed
"No posts yet. Share a workout to get started." — muted text, centered below clubs row.

### Pagination
20 posts per page, infinite scroll. Loading indicator at bottom while fetching next page. Pull-to-refresh reloads first page.

### Stale author profiles
Indexer caches `author_name` and `author_avatar` at index time. May go stale if user changes Nostr profile. Acceptable for v1.

### Indexer not running
Feed shows only user's own dual-written posts. Empty state shown if no posts at all.

### Club row loading
Uses existing `ClubService.fetchActiveClubs()` with 5-minute cache. Skeleton circles while loading.

### Image loading
- Loading: `#0a0a0a` placeholder (matches card background)
- Failed: image area hidden silently, just show text
- Multiple images in post: show first image only for v1

## New Components

| Component | Responsibility |
|-----------|---------------|
| `SocialScreen` | Top-level screen: header, clubs row, feed list |
| `ClubsRow` | Horizontal FlatList of club avatars |
| `SocialFeedPost` | Individual post card with avatar, text, image |
| `SocialFeedService` | Supabase queries: fetch feed, insert dual-write |

## Files

### New
- `src/screens/SocialScreen.tsx`
- `src/components/social/ClubsRow.tsx`
- `src/components/social/SocialFeedPost.tsx`
- `src/services/social/SocialFeedService.ts`
- `src/types/social.ts`
- `supabase/migrations/159_social_feed.sql`

### Modified
- `src/navigation/BottomTabNavigator.tsx` — swap Clubs tab to Social
- `src/services/nostr/workoutPublishingService.ts` — add dual-write in `publishSocialPost` method (after `ndkEvent.publish()` succeeds, insert into `social_feed` using returned event ID)

## What Doesn't Change

- Club infrastructure (ClubService, ClubChatService, club screens)
- Club detail page and chat
- Nostr kind 1 publishing logic (just adds a side-effect)
- Profile tab, Events tab
- Any existing navigation routes

## Implementation Notes

- `SocialScreen` replaces `ClubsScreen` as the tab content but clubs remain accessible via the row
- Feed uses `FlatList` with `onEndReached` for infinite scroll
- Image rendering uses React Native `Image` component (matches existing Avatar pattern)
- All new components under 500 lines per CLAUDE.md

### Relative timestamps

`timeAgo()` function with these thresholds:
- < 1 min: "now"
- < 60 min: "Xm ago"
- < 24 hours: "Xh ago"
- < 7 days: "Xd ago"
- >= 7 days: "Mon DD" (e.g., "Mar 15")

### Content handling

- Post content rendered as plain text (no markdown/HTML parsing)
- URLs in content are plain text, not tappable for v1
- Content truncated at 500 characters with no "read more" — most fitness posts are short
- Strip any null bytes or control characters from content before display

### Image safety

- Only render image URLs with `https://` protocol
- Use `onError` callback on `Image` to hide failed loads silently
