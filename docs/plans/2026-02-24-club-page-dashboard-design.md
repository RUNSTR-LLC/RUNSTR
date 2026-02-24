# Club Page Dashboard Redesign

**Date:** 2026-02-24
**Goal:** Fit the entire club page on one screen. No scrolling for the core experience.

## Current Problem

The club page is 1500-2000px tall. Users must scroll past large event cards and an empty leaderboard to reach chat and members. The page feels like a long form instead of a living community dashboard.

## Design

### Layout (top to bottom)

**1. Banner Header (unchanged)**
Same as today. Banner image or plain header with back + ellipsis.

**2. Club Info + Members (~160px)**
- Club name, description, member count (existing ClubInfoSection)
- Move the horizontal member avatar scroll here, directly below the info card
- Join/Leave button stays here
- Remove ClubMembersSection as a standalone bottom section

**3. Events — Compact Rows (~40-80px)**
- Replace DynamicEventCard banners with single-line rows:
  - `[type badge]  Spring 5K  ·  Mar 15  ·  12 joined`
  - Each row ~32px tall
- Captain "Create Event" button becomes a `+` icon in the EVENTS section header
- Tap any row to open full event detail screen
- Empty state: single line "No events yet" (captain sees + button)

**4. Chat — Flexible Fill (remaining screen space)**
- Chat fills whatever vertical space remains
- Remove maxHeight: 400 cap — use flex: 1 to fill
- Input bar at bottom, messages scroll above
- This makes chat the dominant feature

### Sections Removed

- **ClubLeaderboardSection** — dropped entirely. Members compete on daily and event leaderboards already.
- **Bottom spacer** — no longer needed, chat fills to bottom.
- **Lazy loading mechanism** — no longer needed since all sections are lightweight.

### Estimated Heights

| Section | Height |
|---------|--------|
| Banner | ~56-180px |
| Info + Members | ~160px |
| Events | ~40-80px |
| Chat | remaining (~300px+) |
| **Total** | **fits one screen** |

## Files to Change

| File | Change |
|------|--------|
| `src/screens/ClubPageScreen.tsx` | Remove leaderboard, remove lazy loading, remove bottom spacer, switch from ScrollView to flex layout, move members into info area |
| `src/components/club/ClubInfoSection.tsx` | Add horizontal member scroll below info card |
| `src/components/club/ClubEventsSection.tsx` | Replace DynamicEventCard with compact single-line rows |
| `src/components/club/ClubChatSection.tsx` | Remove maxHeight cap, use flex: 1 to fill remaining space |
| `src/components/club/ClubMembersSection.tsx` | May be deleted or inlined into ClubInfoSection |
