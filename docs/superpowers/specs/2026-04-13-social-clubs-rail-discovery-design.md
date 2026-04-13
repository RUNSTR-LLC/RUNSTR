# Social Clubs Rail + Discovery Bar — Design

**Date:** 2026-04-13
**Scope:** `src/components/social/ClubsRow.tsx`, `src/screens/SocialScreen.tsx`

## Goal

Make the horizontal clubs rail at the top of the Social tab bigger and easier to explore. Clubs are becoming a bigger part of RUNSTR, so the rail needs more visual weight and a way to find clubs by name without leaving the Social tab.

## Changes

### 1. Rail — bigger, sorted by member count

File: `src/components/social/ClubsRow.tsx`

- Avatar size: `40` → `56`.
- Sort order:
  1. User's current club pinned first (existing behavior).
  2. Remaining clubs sorted by `member_count` descending.
- Cap stays at 20 visible clubs.
- Name label, padding, and border unchanged otherwise.

### 2. Discovery bar — new, below the rail

A search input renders directly below the existing avatar rail and above the feed.

**Layout**
- Full-width row. Left: search icon. Right: `TextInput` with placeholder "Search clubs…" and an `×` clear button when non-empty.
- Dark card background, rounded, `borderWidth: 1`, matches the existing search styling in `ClubsScreen.tsx` (`searchContainer` / `searchInput` styles) for visual consistency.
- Lives inside `ClubsRow` so the component owns both its rail and its search; `SocialScreen` keeps rendering `<ClubsRow ... />` as-is.

**Behavior**
- Empty input: only the search bar is visible. Feed renders normally below.
- Non-empty input: a dropdown appears directly below the input.
  - Contents: vertical list of clubs whose `name` matches the query (case-insensitive `String.includes`, no fuzzy matching).
  - Each row: 32px avatar + club name. Tap → `navigation.navigate('ClubPage', { clubId, clubName })`.
  - Capped at 8 results. Scrollable (vertical) if more matches exist beyond that.
  - Positioned as an **absolute-positioned overlay** so it floats above the feed instead of pushing feed posts down. `zIndex` / `elevation` set so it renders above `SocialFeedPost`s.
- `×` button or emptying the input: dropdown unmounts; feed is fully visible again.

**Data**
- No new service calls. `ClubsRow` already receives the `clubs: Club[]` array from `SocialScreen`. Sort and filter are client-side on that array.
- No new Nostr or Supabase queries.

## Out of scope

- `ClubsScreen.tsx` and its existing "Browse Clubs" search — unchanged.
- `ClubCard.tsx` — unchanged. (The ClubsScreen card redesign is not part of this spec.)
- Sort signals beyond member count (no chat-activity or workout-activity ranking).
- No new props on `SocialScreen`; the component just re-renders with the existing `clubs` prop.

## Testing

Manual verification on the iOS simulator:

1. Social tab: rail avatars visibly larger than before.
2. Clubs appear in descending `member_count` order (user's club first, if any).
3. Typing in the discovery bar shows a dropdown of name matches.
4. Tapping a dropdown row navigates to `ClubPage` with the correct `clubId`.
5. Dropdown floats over feed posts — feed doesn't scroll or reflow when dropdown opens/closes.
6. Clearing the input restores the original view.
