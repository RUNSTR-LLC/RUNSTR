# Social Interactions — Design Spec

## Overview

Add likes, zaps, and reposts to social feed posts. All interactions publish to Nostr (kind 7, kind 9735, kind 6) AND dual-write counts to Supabase for instant UI feedback. Comment icon shown as a placeholder (not functional for v1). Zaps use the existing NWC wallet + LightningZapService infrastructure.

## Goals

1. **Interoperable** — reactions are real Nostr events visible on other clients
2. **Instant feedback** — counts read from Supabase, not relays. Optimistic UI.
3. **Minimal friction** — one tap for likes/reposts, one tap + fixed amount for zaps

## Interaction Row

Below every post card, inside the card:

```
┌──────────────────────────────────────┐
│  (avatar)  Display Name             │
│            3h ago                    │
│                                      │
│  Post content here...               │
│                                      │
│  [image if any]                      │
│                                      │
│  heart    flash    repeat    chat    │
│    3       210       1              │
└──────────────────────────────────────┘
```

### Icons (Ionicons)

| Action | Inactive | Active (user interacted) | Count |
|--------|----------|--------------------------|-------|
| Like | `heart-outline` | `heart` | like_count |
| Zap | `flash-outline` | `flash-outline` (always same) | zap_total (sats) |
| Repost | `repeat-outline` | `repeat` | repost_count |
| Comment | `chatbubble-outline` | n/a (disabled v1) | none |

### Styling

- Row: `flexDirection: 'row'`, `justifyContent: 'space-around'`, top border `theme.colors.border`, `paddingTop: 10`, `marginTop: 10`
- Icon size: 20px
- Count text: 12px, `theme.colors.textMuted`
- Default icon color: `theme.colors.textMuted` (#CC7A33)
- Active icon color: `theme.colors.orangeDeep` (#FF7B1C), filled variant
- Comment icon: always `theme.colors.textMuted`, not tappable, no count
- Zap: always `flash-outline` (can zap multiple times), count shows total sats

## Like (Kind 7)

### User taps heart:

**If not already liked:**
1. Optimistic UI — fill `heart` icon orange, increment `like_count`
2. Sign kind 7 event:
   ```
   kind: 7
   content: "+"
   tags: [
     ["e", <event_id>, <relay_url>],
     ["p", <author_pubkey>]
   ]
   ```
3. Publish to Nostr relays via NDK
4. Dual-write to Supabase: increment `like_count`, append user npub to `liked_by` array
5. If Nostr publish fails — revert UI, show toast "Like failed"

**If already liked (unlike):**
1. Optimistic UI — unfill heart, decrement `like_count`
2. Supabase only: decrement `like_count`, remove user from `liked_by`
3. No Nostr event (kind 5 deletions are complex, skip for v1)

### Detection:
Check if current user's npub is in `liked_by` array on render. If yes, show filled orange heart.

## Zap (Kind 9735 via LightningZapService)

### User taps zap icon:

1. Check `PaymentRouter.isWalletAvailable()` — if no wallet, show toast "Connect a wallet in Settings to zap"
2. Call `LightningZapService` with:
   - Recipient: post author's pubkey (from `social_feed.npub`)
   - Event ID: post's `event_id`
   - Amount: 100 sats (default, configurable in settings later)
3. LightningZapService handles the full flow:
   - Fetch recipient's lud16 from Nostr profile (kind 0)
   - Create NIP-57 zap request (kind 9734)
   - Get invoice from LNURL callback
   - Pay invoice via `PaymentRouter.payInvoice()`
4. On success:
   - Brief orange flash animation on zap icon
   - Dual-write: add 100 to `zap_total` in Supabase
   - Show toast "Zapped 100"
5. On failure:
   - Show toast with error ("Insufficient balance", "Recipient has no Lightning address", etc.)
   - No count update

### Notes:
- Users can zap the same post multiple times (no prevention needed)
- No `zapped_by` array needed — just cumulative `zap_total`
- Default amount: 100 sats. Future: settings screen option to change default.

## Repost (Kind 6)

### User taps repost icon:

**If not already reposted:**
1. Optimistic UI — fill `repeat` icon orange, increment `repost_count`
2. Sign kind 6 event:
   ```
   kind: 6
   content: "" (or original event JSON)
   tags: [
     ["e", <event_id>, <relay_url>],
     ["p", <author_pubkey>]
   ]
   ```
3. Publish to Nostr relays via NDK
4. Dual-write: increment `repost_count`, append user npub to `reposted_by`
5. If publish fails — revert UI, show toast "Repost failed"

**If already reposted:**
- Do nothing. Tapping again is a no-op. Cannot un-repost.

### Detection:
Check `reposted_by` array on render.

## Comment (Placeholder)

- `chatbubble-outline` icon, always `theme.colors.textMuted`
- Not tappable
- No count displayed
- Visual placeholder only — will be wired in a future version

## Supabase Schema Changes

Migration adds columns to existing `social_feed` table:

```sql
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0;
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS zap_total INTEGER DEFAULT 0;
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS liked_by TEXT[] DEFAULT '{}';
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS reposted_by TEXT[] DEFAULT '{}';
```

**Do NOT allow raw UPDATE from client** — use Postgres RPC functions for atomic operations:

```sql
-- Toggle like (add/remove from array, increment/decrement count atomically)
CREATE FUNCTION toggle_social_like(post_id UUID, user_npub TEXT) RETURNS void ...

-- Add repost (append to array, increment count, no-op if already reposted)
CREATE FUNCTION add_social_repost(post_id UUID, user_npub TEXT) RETURNS void ...

-- Add zap amount (increment zap_total)
CREATE FUNCTION add_social_zap(post_id UUID, amount INTEGER) RETURNS void ...
```

This prevents clients from setting arbitrary count values and handles race conditions on concurrent array appends.

## Existing Infrastructure Used

| Need | Existing Service | Method |
|------|-----------------|--------|
| Sign + publish events | `GlobalNDKService` + `NDKEvent` | `new NDKEvent(ndk)` → `event.publish()` (handles signing via NDK signer internally) |
| Set NDK signer | `UnifiedSigningService` | `getSigner()` — ensures NDK has a signer before publishing |
| Get user pubkey | `UnifiedSigningService` | `getUserPubkey()` |
| Zap flow | `LightningZapService` | `sendLightningZap(pubkey, amount, memo)` — needs `eventId` param added (see below) |
| Pay invoice | `PaymentRouter` | `payInvoice(invoice)` |
| Check wallet | `PaymentRouter` | `isWalletAvailable()` — gated by `FEATURES.ENABLE_NWC_WALLET` flag |
| Supabase writes | Postgres RPC functions | Atomic increment/array append (not raw column updates) |

### Signing pattern

Use `NDKEvent` + `.publish()` (not `UnifiedSigningService.signEvent()` directly). This is the established pattern in the codebase (see `JoinRequestService.ts`). The NDK instance must have a signer set via `UnifiedSigningService.getSigner()` before creating events. Publish timeout: 10 seconds, revert optimistic UI on timeout.

### LightningZapService modification required

`sendLightningZap(recipientPubkey, amount, memo)` currently does not accept an `eventId`. Per NIP-57, zaps on specific events MUST include an `["e", eventId]` tag in the kind 9734 zap request. The method needs an optional `eventId` parameter added:

```typescript
async sendLightningZap(
  recipientPubkey: string,
  amount: number,
  memo?: string,
  eventId?: string  // NEW — adds ["e", eventId] tag to zap request
): Promise<LightningZapResult>
```

### Relay hints

For `["e", eventId, relayHint]` tags in kind 7 and kind 6 events, use an empty string for the relay hint. This is acceptable per NIP-10 and avoids needing a relay column in social_feed.

## New Components

| Component | Responsibility |
|-----------|---------------|
| `SocialInteractionRow` | Icon row with like/zap/repost/comment buttons |
| `SocialInteractionService` | Sign and publish Nostr events, dual-write to Supabase |

## Files

### New
- `src/components/social/SocialInteractionRow.tsx` — UI component
- `src/services/social/SocialInteractionService.ts` — Nostr publish + Supabase dual-write
- `supabase/migrations/161_social_feed_interactions.sql` — Add interaction columns

### Modified
- `src/components/social/SocialFeedPost.tsx` — Add `SocialInteractionRow` below content
- `src/types/social.ts` — Add interaction fields to `SocialFeedPost` interface

## Edge Cases

### No wallet connected (zap)
Check `PaymentRouter.isWalletAvailable()` before attempting. Show toast "Connect a wallet in Settings to zap."

### Zap failure
Show error toast with reason. Don't update count.

### Offline
Interaction row renders with cached counts. Tapping shows toast "No connection."

### Rapid double-tap
Debounce all interactions — 500ms minimum between taps on the same action.

### Post author has no Lightning address
`LightningZapService` checks this and returns an error. Show toast "This user can't receive zaps."

## Implementation Notes

- `SocialInteractionRow` receives `post` data and current user `npub` as props
- Checks `liked_by.includes(userNpub)` and `reposted_by.includes(userNpub)` for active states
- Debounce interactions with `useRef` timer
- Optimistic UI via local state, revert on failure
- NDK event publishing follows the pattern in `workoutPublishingService.ts`
- Supabase updates use RPC or direct column updates with array append
- All new files under 500 lines per CLAUDE.md
- No "sats" in user-facing UI — zap count shown as number only (e.g., "210")
