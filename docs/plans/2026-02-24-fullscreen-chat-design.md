# Full-Screen Club Chat

**Date:** 2026-02-24
**Goal:** Add an expand button to the embedded club chat that pushes a full-screen chat screen.

## Design

**Trigger:** Expand icon (`expand-outline`) in the CHAT section header on the club dashboard. Tapping pushes `ClubChatScreen`.

**ClubChatScreen (new screen):**
- Full-screen chat using FlatList (inverted) — no height constraints
- Same header: back arrow + club name
- Same features: messages, replies, announcements, reactions, workout cards
- Reuses `useClubChat` hook and `ChatMessageBubble` component
- Input bar at bottom with keyboard avoidance

**Embedded chat on club page (unchanged):**
- Stays as the compact preview with flex: 1
- Shows recent messages + input bar
- Fully functional — send/reply/react without expanding

**Navigation:**
- Registered as a stack screen in the navigator
- Route params: `clubId`, `clubName`, `captainNpub`, `isMember`

## Files to Change

| File | Change |
|------|--------|
| `src/screens/ClubChatScreen.tsx` | **New** — Full-screen chat screen |
| `src/components/club/ClubChatSection.tsx` | Add expand icon to CHAT header |
| Navigation config | Register `ClubChatScreen` route |
