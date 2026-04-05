# Phase 2: Outbound Social Interactions

**Date:** 2026-04-05
**Status:** Approved
**Related Issues:** #254 (comments), #252 (single-tap zap), #263 (publish interactions to Nostr)
**Depends On:** Phase 1 (inbound engagement indexing)

## Overview

Add outbound comment posting and single-tap NWC zapping to the social feed. Comments publish as kind 1 replies to Nostr and appear optimistically in the inline list. Zaps fire instantly via NWC on single tap, with long-press opening the amount modal.

All users have an npub/nsec keypair — no anonymous user gates needed.

## Architecture

Same Nostr-first pattern as Phase 1:
- **Outbound:** App publishes to Nostr + optimistic local state
- **Inbound:** Indexer pulls from Nostr into Supabase on 5-minute cron
- **Reads:** App reads from Supabase, with optimistic local overlay

No new Supabase tables or migrations. Phase 1's schema handles everything.

## Feature 1: Inline Comment Input

### User Flow

1. User taps comment icon on a post
2. Inline comment list expands (existing Phase 1 behavior)
3. Below the comments (or empty state), a text input with send button appears
4. User types a comment and taps send
5. Optimistic comment appears instantly in the inline list
6. Kind 1 reply event published to Nostr relays
7. Indexer picks it up on next cycle, Supabase data reconciles on refresh

### Nostr Event Structure

Published as a standard kind 1 reply per NIP-10:

```json
{
  "kind": 1,
  "content": "Great run! Keep it up",
  "tags": [
    ["e", "<parent_post_event_id>", "", "root"],
    ["p", "<parent_post_author_pubkey>"]
  ]
}
```

Signed via `UnifiedSigningService`, published via `GlobalNDKService` with the existing 10-second timeout pattern.

### Optimistic Comment

When the user taps send:
- A comment object with a temporary ID (`optimistic-{timestamp}`) is prepended to the local `comments` array in `InlineCommentList`
- The user's profile info (name, avatar) is pulled from the current session
- The `commentCount` display increments locally
- On next feed refresh, Supabase data replaces local state entirely — no special dedup needed since the inline list re-fetches when expanded

### Component Changes

**`InlineCommentList.tsx`** — add:
- Text input + send button below the comment list (visible when expanded)
- Local `optimisticComments` state array
- `handleSend` callback that creates optimistic entry and calls `SocialInteractionService.publishComment()`
- Merged display: `[...optimisticComments, ...comments]`
- Props: add `userNpub`, `postEventId`, `postAuthorPubkey` (needed for Nostr tags)

**`SocialInteractionService.ts`** — add:
- `publishComment(eventId: string, authorPubkey: string, content: string): Promise<{ success: boolean; error?: string }>` method
- Creates NDKEvent kind 1 with `['e', eventId, '', 'root']` and `['p', authorPubkey]` tags
- Signs and publishes with 10-second timeout

**`CommentsScreen.tsx`** — add:
- Reply input at the bottom of the full-screen view (same pattern as inline)
- Optimistic comment prepended to list on send

**`SocialFeedPost.tsx`** — update:
- Pass `post.event_id` and `post.npub` through to `SocialInteractionRow` for comment publishing

**`SocialInteractionRow.tsx`** — update:
- Pass `postEventId` and `postAuthorPubkey` to `InlineCommentList`

## Feature 2: Single-Tap NWC Zap

### User Flow

**NWC wallet configured:**
- **Tap** zap icon → instant zap at 50 sats (default). Flash animation, success Toast.
- **Long-press** zap icon → opens `ExternalZapModal` for custom amount.

**No NWC wallet:**
- **Tap** zap icon → opens `ExternalZapModal` (existing behavior).

### Default Amount

50 sats. Stored in `@runstr:default_zap_amount` (AsyncStorage). Users can change the default through the long-press modal flow.

### Component Changes

**`SocialInteractionRow.tsx`** — replace `handleZap`:
- Check `NWCWalletService.isAvailable()` (or use `PaymentRouter.isWalletAvailable()`)
- If NWC available: use `useNWCZap` hook's `sendZap()` for instant payment on tap
- Add `onLongPress` handler that opens `ExternalZapModal` regardless of wallet status
- Flash animation + Toast on success/failure
- Optimistic `zapTotal` bump on success

## File Inventory

| File | Change |
|------|--------|
| `src/components/social/InlineCommentList.tsx` | Modify — add text input, optimistic comments, send handler |
| `src/components/social/SocialInteractionRow.tsx` | Modify — single-tap NWC zap, long-press modal, pass event data to comments |
| `src/services/social/SocialInteractionService.ts` | Modify — add `publishComment()` method |
| `src/screens/CommentsScreen.tsx` | Modify — add reply input at bottom |
| `src/components/social/SocialFeedPost.tsx` | Modify — pass event_id and npub through to interaction row |

## Out of Scope

- Threaded replies (reply to a comment) — all comments are flat replies to the root post
- Editing or deleting comments after posting
- Zap amount customization in a dedicated settings screen
- Comment content moderation or filtering
