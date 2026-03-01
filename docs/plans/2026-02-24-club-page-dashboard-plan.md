# Club Page Dashboard Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fit the entire club page on one screen — no scrolling for the core experience.

**Architecture:** Replace the current ScrollView layout with a flex column. Remove the leaderboard entirely. Compact events into single-line rows. Move the member horizontal scroll into ClubInfoSection. Let chat fill remaining vertical space with `flex: 1`.

**Tech Stack:** React Native, TypeScript, Ionicons, Supabase (existing services)

---

## Task 1: Remove ClubLeaderboardSection from ClubPageScreen

**Files:**
- Modify: `src/screens/ClubPageScreen.tsx`

**Step 1: Remove the leaderboard import and usage**

Remove the import on line 33:
```typescript
// DELETE this line:
import { ClubLeaderboardSection } from '../components/club/ClubLeaderboardSection';
```

Remove the leaderboard render on line 388:
```typescript
// DELETE this line:
<ClubLeaderboardSection clubId={clubId} leaderboardMetric={club.leaderboard_metric || 'distance'} refreshKey={refreshKey} />
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (unused import removed, no references remain)

**Step 3: Commit**

```bash
git add src/screens/ClubPageScreen.tsx
git commit -m "Refactor: Remove ClubLeaderboardSection from club page"
```

---

## Task 2: Remove lazy loading, bottom spacer, and ScrollView scroll handler

**Files:**
- Modify: `src/screens/ClubPageScreen.tsx`

**Step 1: Remove lazy loading state and timer**

Delete these lines (approx lines 86-101):
```typescript
// DELETE: lazy loading state
const [belowFoldVisible, setBelowFoldVisible] = useState(false);
const belowFoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

// DELETE: auto-reveal timer useEffect
useEffect(() => {
  if (!isLoading && club && !belowFoldVisible) {
    belowFoldTimer.current = setTimeout(() => setBelowFoldVisible(true), 600);
  }
  return () => { if (belowFoldTimer.current) clearTimeout(belowFoldTimer.current); };
}, [isLoading, club, belowFoldVisible]);

// DELETE: scroll handler
const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
  if (!belowFoldVisible && e.nativeEvent.contentOffset.y > 50) {
    setBelowFoldVisible(true);
  }
}, [belowFoldVisible]);
```

Remove the unused imports that were only needed for lazy loading:
```typescript
// DELETE from imports (if no longer used):
LayoutChangeEvent,
NativeSyntheticEvent,
NativeScrollEvent,
```

Remove `useRef` from the React import if no longer used.

**Step 2: Remove ScrollView's onScroll and scrollEventThrottle**

In the `<ScrollView>` props, remove:
```typescript
onScroll={handleScroll}
scrollEventThrottle={200}
```

**Step 3: Remove the conditional render wrapper**

Replace the `{belowFoldVisible ? (...) : (...)}` conditional with just the inner content directly rendered (chat and no leaderboard — leaderboard already removed in Task 1):

Before:
```tsx
{belowFoldVisible ? (
  <>
    <ClubLeaderboardSection ... />
    <ClubChatSection ... />
    <ClubMembersSection clubId={clubId} />
  </>
) : (
  <View style={styles.lazyPlaceholder}>
    <ActivityIndicator color={theme.colors.accent} size="small" />
  </View>
)}
```

After (leaderboard already removed in Task 1, members will be moved in Task 4):
```tsx
<ClubChatSection
  clubId={clubId}
  clubName={displayName}
  captainNpub={club.created_by_npub || ''}
  isMember={isMember}
/>
<ClubMembersSection clubId={clubId} />
```

**Step 4: Remove bottom spacer and lazyPlaceholder style**

Delete:
```tsx
<View style={styles.bottomSpacer} />
```

Delete from styles:
```typescript
lazyPlaceholder: {
  alignItems: 'center',
  paddingVertical: 40,
},
bottomSpacer: {
  height: 40,
},
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/screens/ClubPageScreen.tsx
git commit -m "Refactor: Remove lazy loading, bottom spacer from club page"
```

---

## Task 3: Compact ClubEventsSection — replace DynamicEventCard with single-line rows

**Files:**
- Modify: `src/components/club/ClubEventsSection.tsx`

**Step 1: Remove DynamicEventCard import, add date formatter**

Remove:
```typescript
import { DynamicEventCard } from '../events/DynamicEventCard';
```

Add a compact date formatter helper inside the file:
```typescript
function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

**Step 2: Replace the event card render with compact rows**

Replace the events.map block (lines 233-260) with:

```tsx
events.map((event) => (
  <TouchableOpacity
    key={event.id}
    style={styles.eventRow}
    onPress={() => handleEventPress(event.external_id)}
    activeOpacity={0.7}
  >
    <View style={[
      styles.statusDot,
      event.status === 'active' && styles.statusDotActive,
      event.status === 'upcoming' && styles.statusDotUpcoming,
      event.status === 'ended' && styles.statusDotEnded,
    ]} />
    <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
    <Text style={styles.eventMeta}>
      {formatShortDate(event.start_date)}
    </Text>
    {isCaptain && event.status !== 'ended' && (
      <TouchableOpacity
        onPress={() => handleEditPress(event)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.eventEditButton}
      >
        <Ionicons name="ellipsis-horizontal" size={16} color={theme.colors.textDark} />
      </TouchableOpacity>
    )}
  </TouchableOpacity>
))
```

**Step 3: Replace the "Create" button with a `+` icon**

Replace the existing create button (lines 211-219):

Before:
```tsx
{isCaptain && (
  <TouchableOpacity
    style={styles.createButton}
    onPress={handleCreatePress}
    activeOpacity={0.7}
  >
    <Ionicons name="add-circle-outline" size={16} color={theme.colors.textMuted} />
    <Text style={styles.createButtonText}>Create</Text>
  </TouchableOpacity>
)}
```

After:
```tsx
{isCaptain && (
  <TouchableOpacity
    onPress={handleCreatePress}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons name="add" size={20} color={theme.colors.textMuted} />
  </TouchableOpacity>
)}
```

**Step 4: Simplify empty state**

Replace the empty state (lines 227-231):

Before:
```tsx
<View style={styles.emptyContainer}>
  <Ionicons name="trophy-outline" size={36} color={theme.colors.textDark} />
  <Text style={styles.emptyText}>No events yet. Create one for your club!</Text>
</View>
```

After:
```tsx
<Text style={styles.emptyText}>No events yet</Text>
```

**Step 5: Simplify captain edit/cancel into a single action sheet**

The current captain actions (Edit + Cancel buttons below each card) become the `...` button's onPress. Replace `handleEditPress` to show an action sheet:

```typescript
const handleEventOptions = useCallback((event: DynamicCompetition) => {
  setAlertConfig({
    visible: true,
    title: event.name,
    buttons: [
      { text: 'Edit', onPress: () => { setEditingEvent(event); setShowModal(true); } },
      { text: 'Cancel Event', style: 'destructive', onPress: () => handleCancelEvent(event) },
      { text: 'Dismiss', style: 'cancel' },
    ],
  });
}, [handleCancelEvent]);
```

Update the `...` button's onPress to use `handleEventOptions`:
```tsx
onPress={() => handleEventOptions(event)}
```

Remove `handleEditPress` (replaced by inline within `handleEventOptions`).

**Step 6: Update styles — remove old card styles, add compact row styles**

Remove these styles: `createButton`, `createButtonText`, `captainActions`, `actionButton`, `actionButtonText`, `emptyContainer`.

Add:
```typescript
eventRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 10,
  paddingHorizontal: 4,
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.border,
  gap: 8,
},
statusDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: theme.colors.textDark,
},
statusDotActive: {
  backgroundColor: '#4CAF50',
},
statusDotUpcoming: {
  backgroundColor: theme.colors.accent,
},
statusDotEnded: {
  backgroundColor: theme.colors.textDark,
},
eventName: {
  flex: 1,
  fontSize: 14,
  fontWeight: theme.typography.weights.medium,
  color: theme.colors.text,
},
eventMeta: {
  fontSize: 12,
  color: theme.colors.textMuted,
},
eventEditButton: {
  paddingLeft: 8,
},
```

Update `emptyText` to be inline (no icon, no container):
```typescript
emptyText: {
  fontSize: 13,
  color: theme.colors.textDark,
  paddingVertical: 8,
  paddingHorizontal: 4,
},
```

**Step 7: Reduce section marginTop**

Change the section style from `marginTop: 20` to `marginTop: 12` to save vertical space.

**Step 8: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 9: Commit**

```bash
git add src/components/club/ClubEventsSection.tsx
git commit -m "Refactor: Compact event rows replace banner cards on club page"
```

---

## Task 4: Move member horizontal scroll into ClubInfoSection

**Files:**
- Modify: `src/components/club/ClubInfoSection.tsx`
- Modify: `src/screens/ClubPageScreen.tsx`

**Step 1: Add member data fetching and rendering to ClubInfoSection**

Add imports:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { ClubMembershipService } from '../../services/backend/ClubMembershipService';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import { Avatar } from '../ui/Avatar';
import type { ClubMembership } from '../../types/club';
```

Note: `ScrollView` and `ActivityIndicator` are already imported — just add them to the existing import if not present.

Add props to `ClubInfoSectionProps`:
```typescript
interface ClubInfoSectionProps {
  club: Club;
  isMember: boolean;
  isCaptain: boolean;
  userNpub: string | null;
  isJoining: boolean;
  isLeaving: boolean;
  cooldown: CooldownState | null;
  onJoin: () => void;
  onLeaveConfirm: () => void;
  onCooldownBlocked: () => void;
  clubId: string; // NEW — needed for member fetch
}
```

Convert to a function component with state (currently a pure FC — needs `useState`/`useEffect` for member fetch). Add inside the component body:

```typescript
const [members, setMembers] = useState<ClubMembership[]>([]);
const [memberProfiles, setMemberProfiles] = useState<Map<string, NostrProfile>>(new Map());
const [membersLoading, setMembersLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  const load = async () => {
    try {
      const data = await ClubMembershipService.getClubMembers(clubId);
      if (cancelled) return;
      setMembers(data);
      if (data.length > 0) {
        const npubs = data.map((m) => m.member_npub);
        const fetched = await nostrProfileService.getProfiles(npubs);
        if (!cancelled) setMemberProfiles(fetched);
      }
    } catch (err) {
      console.error('[ClubInfoSection] Error loading members:', err);
    } finally {
      if (!cancelled) setMembersLoading(false);
    }
  };
  load();
  return () => { cancelled = true; };
}, [clubId]);
```

**Step 2: Add the member scroll below the info card**

After the `infoCard` View and before the action container, add:
```tsx
{/* Member avatars */}
{!membersLoading && members.length > 0 && (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.membersScroll}
    style={styles.membersContainer}
  >
    {members.map((member) => {
      const memberIsCaptain = member.role === 'captain';
      const profile = memberProfiles.get(member.member_npub);
      const name = profile?.display_name || profile?.name || member.member_npub.slice(0, 8) + '...';
      return (
        <View key={member.id} style={styles.memberItem}>
          <View style={styles.avatarWrapper}>
            <Avatar name={name} size={36} imageUrl={profile?.picture} />
            {memberIsCaptain && (
              <View style={styles.captainBadge}>
                <Ionicons name="star-outline" size={10} color={theme.colors.accent} />
              </View>
            )}
          </View>
          <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
        </View>
      );
    })}
  </ScrollView>
)}
```

**Step 3: Add member styles**

```typescript
membersContainer: {
  marginHorizontal: 16,
  marginTop: 10,
},
membersScroll: {
  gap: 12,
  paddingRight: 16,
},
memberItem: {
  alignItems: 'center',
  width: 52,
},
avatarWrapper: {
  position: 'relative',
},
captainBadge: {
  position: 'absolute',
  bottom: -2,
  right: -2,
  backgroundColor: theme.colors.cardBackground,
  borderRadius: 8,
  width: 16,
  height: 16,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: theme.colors.text,
},
memberName: {
  fontSize: 10,
  color: theme.colors.textMuted,
  marginTop: 4,
  textAlign: 'center',
},
```

**Step 4: Remove ClubMembersSection from ClubPageScreen**

In `ClubPageScreen.tsx`:

Remove import:
```typescript
import { ClubMembersSection } from '../components/club/ClubMembersSection';
```

Remove the render:
```tsx
<ClubMembersSection clubId={clubId} />
```

Pass `clubId` prop to ClubInfoSection:
```tsx
<ClubInfoSection
  club={club}
  isMember={isMember}
  isCaptain={isCaptain}
  userNpub={userNpub}
  isJoining={isJoining}
  isLeaving={isLeaving}
  cooldown={cooldown}
  onJoin={handleJoin}
  onLeaveConfirm={handleLeaveConfirm}
  onCooldownBlocked={handleCooldownBlocked}
  clubId={clubId}
/>
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/club/ClubInfoSection.tsx src/screens/ClubPageScreen.tsx
git commit -m "Refactor: Move member avatars into ClubInfoSection, remove standalone section"
```

---

## Task 5: Convert ClubPageScreen from ScrollView to flex layout

**Files:**
- Modify: `src/screens/ClubPageScreen.tsx`

**Step 1: Replace ScrollView with View**

Change the main content wrapper from:
```tsx
<ScrollView
  style={styles.scrollView}
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={false}
  refreshControl={
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      tintColor={theme.colors.accent}
    />
  }
>
  {/* sections */}
</ScrollView>
```

To a plain `View` with `flex: 1`:
```tsx
<View style={styles.mainContent}>
  {/* sections */}
</View>
```

Remove unused imports: `ScrollView`, `RefreshControl`, `NativeSyntheticEvent`, `NativeScrollEvent`, `LayoutChangeEvent` (if not already removed).

Remove unused state/handlers: `isRefreshing`, `handleRefresh` (pull-to-refresh no longer works in a non-scroll View — the chat scroll handles its own scrolling).

**Step 2: Update styles**

Remove `scrollView` and `scrollContent` styles.

Add:
```typescript
mainContent: {
  flex: 1,
},
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/screens/ClubPageScreen.tsx
git commit -m "Refactor: Replace ScrollView with flex layout on club page"
```

---

## Task 6: Make ClubChatSection fill remaining vertical space

**Files:**
- Modify: `src/components/club/ClubChatSection.tsx`

**Step 1: Update section style to flex: 1**

Change the outer `section` style from:
```typescript
section: {
  paddingHorizontal: 16,
  marginTop: 20,
},
```

To:
```typescript
section: {
  flex: 1,
  paddingHorizontal: 16,
  marginTop: 12,
  paddingBottom: 8,
},
```

**Step 2: Remove maxHeight cap on chatContainer**

Change `chatContainer` from:
```typescript
chatContainer: {
  minHeight: 200,
  maxHeight: 400,
  backgroundColor: theme.colors.cardBackground,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: theme.colors.border,
  overflow: 'hidden',
},
```

To:
```typescript
chatContainer: {
  flex: 1,
  backgroundColor: theme.colors.cardBackground,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: theme.colors.border,
  overflow: 'hidden',
},
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/club/ClubChatSection.tsx
git commit -m "Refactor: Chat section fills remaining screen space with flex: 1"
```

---

## Task 7: Final cleanup and typecheck

**Files:**
- Review: `src/screens/ClubPageScreen.tsx`
- Review: `src/components/club/ClubInfoSection.tsx`
- Review: `src/components/club/ClubEventsSection.tsx`
- Review: `src/components/club/ClubChatSection.tsx`

**Step 1: Verify no unused imports remain**

Run: `npm run typecheck`
Expected: PASS with zero errors

**Step 2: Verify all files are under 500 lines**

Check line counts for all modified files. If any exceed 500 lines, trim unnecessary comments or extract small helpers.

**Step 3: Final commit**

```bash
git add -A
git commit -m "Chore: Club page dashboard redesign cleanup"
```

---

## File Summary

| File | Change | Est. Lines |
|------|--------|-----------|
| `src/screens/ClubPageScreen.tsx` | Remove leaderboard, lazy loading, ScrollView → View, remove pull-to-refresh | ~390 (from 485) |
| `src/components/club/ClubInfoSection.tsx` | Add member fetch + horizontal avatar scroll | ~450 (from 362) |
| `src/components/club/ClubEventsSection.tsx` | Replace DynamicEventCard with compact rows, captain `...` action sheet | ~310 (from 359) |
| `src/components/club/ClubChatSection.tsx` | flex: 1, remove maxHeight cap | ~500 (from 500) |

All files stay under 500 lines.

## Verification

1. `npm run typecheck` — must pass after each task
2. Manual test: open a club page — everything should be visible on one screen without scrolling
3. Manual test: tap a compact event row → navigates to event detail
4. Manual test: captain taps `...` on event row → sees Edit / Cancel Event options
5. Manual test: member avatars scroll horizontally below club info
6. Manual test: chat fills remaining space and messages scroll within it
