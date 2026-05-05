# Phase A — Home Team Line + Chat Alert Badge: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a team line on the Home tab that replaces the kind 0 about text when the user has joined a club, with an unread-chat-message badge that clears when the chat is opened.

**Architecture:** The team line lives inside `ProfileHero` (which already owns the avatar/name/bio area), gated by a new `currentTeam` prop. When the prop is set, the bio text is swapped for `[team avatar] Team: <name> [bell + unread badge]`. The unread count comes from a new pair of methods on `ClubChatService` (`getUnreadCount` and `markChatAsSeen`) backed by an AsyncStorage key per club. `ClubChatScreen` calls `markChatAsSeen` on focus to clear the badge.

**Tech Stack:** React Native + TypeScript (Expo). AsyncStorage for the per-club last-seen timestamp. Verification via `npm run typecheck` and a short `npx tsx` script.

**Reference spec:** `docs/superpowers/specs/2026-05-05-rewards-first-navigation-design.md` (Phase A section).

---

## File Map

| File | Change | Why |
|---|---|---|
| `src/services/backend/ClubChatService.ts` | Modify | Add `getUnreadCount(clubId)` + `markChatAsSeen(clubId)` static methods |
| `src/components/profile/TeamLine.tsx` | Create | New component: team avatar + label + bell + unread badge |
| `src/components/profile/ProfileHero.tsx` | Modify | Accept `currentTeam`, `unreadChatCount`, `onTeamPress` props. When `currentTeam` is set, render `<TeamLine />` in place of `bio` |
| `src/screens/ProfileScreen.tsx` | Modify | Pass `currentTeam`, `unreadChatCount`, `onTeamPress` to `ProfileHero`. Compute count via `ClubChatService.getUnreadCount` on focus |
| `src/screens/ClubChatScreen.tsx` | Modify | Call `ClubChatService.markChatAsSeen(clubId)` inside a `useFocusEffect` |
| `scripts/verify/verify-team-line.ts` | Create | Sanity script confirming new methods exist + storage key shape |

**Storage:** One new key family — `@runstr:club_chat_last_seen:<clubId>` — written by `markChatAsSeen`, read by `getUnreadCount`.

**Note on spec deviation:** The spec listed the ClubChatService path as `src/services/club/ClubChatService.ts`. The actual file is at `src/services/backend/ClubChatService.ts` — using the real path here.

---

## Task 1: Add `getUnreadCount` and `markChatAsSeen` to ClubChatService

**Files:**
- Modify: `src/services/backend/ClubChatService.ts`

- [ ] **Step 1.1: Read the file end (where new static methods can land)**

```bash
sed -n '420,460p' src/services/backend/ClubChatService.ts
```

Confirm: `clearCache` ends around line 430-ish, then `setCachedMessages` (private), then `}` closing the class, then `export default ClubChatService;` on the last line. New methods will sit between `clearCache` and `setCachedMessages`.

- [ ] **Step 1.2: Add a storage-key constant near the top of the file**

Use `Read` then `Edit`. Find the top of the file (imports + any existing constants). Add:

```typescript
const LAST_SEEN_KEY_PREFIX = '@runstr:club_chat_last_seen:';
```

Place it directly after the existing imports / cache key constant if one exists, before the `export interface` declarations. Exact placement isn't critical; consistency with existing constant style is.

- [ ] **Step 1.3: Add the two new static methods to the class**

Use `Edit` to insert these two methods inside the `ClubChatService` class, just before `clearCache` (or before `setCachedMessages` if `clearCache` isn't a clean anchor point — match the existing static-method indentation):

```typescript
  /**
   * Get the count of cached chat messages newer than the user's last
   * `markChatAsSeen` for this club. Reads from cache (no network).
   * Capped at 99 so the badge can render a 2-digit max.
   */
  static async getUnreadCount(clubId: string): Promise<number> {
    if (!clubId) return 0;
    try {
      const lastSeenStr = await AsyncStorage.getItem(`${LAST_SEEN_KEY_PREFIX}${clubId}`);
      const lastSeenMs = lastSeenStr ? Number(lastSeenStr) : 0;
      const cached = await this.getCachedMessages(clubId);
      let count = 0;
      for (const msg of cached) {
        const createdMs = new Date(msg.created_at).getTime();
        if (createdMs > lastSeenMs) {
          count += 1;
          if (count >= 99) return 99;
        }
      }
      return count;
    } catch (err) {
      console.warn('[ClubChatService] getUnreadCount failed:', err);
      return 0;
    }
  }

  /**
   * Record the current timestamp as the user's last-seen point for this
   * club's chat. Subsequent `getUnreadCount` calls return 0 until new
   * messages arrive.
   */
  static async markChatAsSeen(clubId: string): Promise<void> {
    if (!clubId) return;
    try {
      await AsyncStorage.setItem(
        `${LAST_SEEN_KEY_PREFIX}${clubId}`,
        String(Date.now()),
      );
    } catch (err) {
      console.warn('[ClubChatService] markChatAsSeen failed:', err);
    }
  }
```

- [ ] **Step 1.4: Verify AsyncStorage is already imported**

```bash
grep -n "AsyncStorage" src/services/backend/ClubChatService.ts | head -3
```

Expected: at least one import line for `@react-native-async-storage/async-storage`. If not, add it at the top alongside the other imports.

- [ ] **Step 1.5: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS, zero new errors.

- [ ] **Step 1.6: Commit**

```bash
git add src/services/backend/ClubChatService.ts
git commit -m "$(cat <<'EOF'
Feature: Add getUnreadCount + markChatAsSeen to ClubChatService

Two new static methods backing the Home team line's unread chat badge:

- getUnreadCount(clubId) reads cached messages and counts entries
  with created_at newer than the per-club last-seen timestamp in
  AsyncStorage. Caps at 99.

- markChatAsSeen(clubId) writes Date.now() to the same key. Called
  from ClubChatScreen on focus to clear the badge.

Storage key family: @runstr:club_chat_last_seen:<clubId>
EOF
)"
```

---

## Task 2: Create TeamLine component

**Files:**
- Create: `src/components/profile/TeamLine.tsx`

- [ ] **Step 2.1: Create the file with the component**

Write the file:

```typescript
/**
 * TeamLine — One-row display of the user's current club with an
 * unread chat-message badge. Renders inside ProfileHero in place of
 * the bio text when the user has joined a club.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';

interface TeamLineProps {
  teamName: string;
  teamAvatarUrl?: string | null;
  unreadCount: number;
  onPress: () => void;
}

const formatBadge = (count: number): string => {
  if (count <= 0) return '';
  if (count >= 99) return '99+';
  return String(count);
};

export const TeamLine: React.FC<TeamLineProps> = ({
  teamName,
  teamAvatarUrl,
  unreadCount,
  onPress,
}) => {
  const badge = formatBadge(unreadCount);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Avatar
        name={teamName}
        size={24}
        imageUrl={teamAvatarUrl || undefined}
      />
      <Text style={styles.label} numberOfLines={1}>
        Team: {teamName}
      </Text>
      <View style={styles.bellWrapper}>
        <Ionicons
          name="notifications-outline"
          size={18}
          color={theme.colors.text}
        />
        {badge !== '' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.regular,
    marginLeft: 8,
    marginRight: 8,
  },
  bellWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.orangeBright,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.background,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
});
```

- [ ] **Step 2.2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS, zero new errors. The component is self-contained — no consumers yet, no possibility of cascading failures.

- [ ] **Step 2.3: Commit**

```bash
git add src/components/profile/TeamLine.tsx
git commit -m "$(cat <<'EOF'
Feature: TeamLine component for Home team display

One-row component rendering [team avatar] Team: <name> [bell + badge].
Designed to slot into ProfileHero in place of the kind 0 bio when the
user has joined a club. Wires onPress through to whoever uses it
(ProfileHero will navigate to ClubChat).

Badge renders only when unreadCount > 0; '99+' for counts >= 99.
EOF
)"
```

---

## Task 3: Modify ProfileHero to accept team props and render TeamLine in place of bio

**Files:**
- Modify: `src/components/profile/ProfileHero.tsx`

- [ ] **Step 3.1: Read the props interface and the bio render block**

```bash
sed -n '23,40p' src/components/profile/ProfileHero.tsx
sed -n '185,205p' src/components/profile/ProfileHero.tsx
```

Confirm: the props interface has `user`, `isOwner`, `isLoading`, `level`, `streak`, `earnings`, plus four `on*Press` callbacks. The bio render block at ~190-196 looks like:

```tsx
{bio ? (
  <Text style={styles.bio} numberOfLines={2}>
    {bio}
  </Text>
) : null}
```

- [ ] **Step 3.2: Add three props to the interface**

Use `Edit`. Find the `interface ProfileHeroProps {` block (around line 23) and add three new optional props:

```typescript
interface ProfileHeroProps {
  user: User | null;
  isOwner: boolean;
  isLoading?: boolean;
  level?: number;
  streak?: number;
  earnings?: number;
  currentTeam?: { id: string; name: string; avatarUrl?: string | null } | null;
  unreadChatCount?: number;
  onTeamPress?: () => void;
  onEditPress?: () => void;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
  onLevelPress?: () => void;
  onEarningsPress?: () => void;
}
```

- [ ] **Step 3.3: Destructure the new props in the component signature**

Find the component declaration (around line 49):

```typescript
export const ProfileHero: React.FC<ProfileHeroProps> = ({
  user,
  isOwner,
  isLoading = false,
  level,
  streak,
  earnings,
  onEditPress,
  onBackPress,
  onSettingsPress,
  onLevelPress,
  onEarningsPress,
}) => {
```

Add the three new props:

```typescript
export const ProfileHero: React.FC<ProfileHeroProps> = ({
  user,
  isOwner,
  isLoading = false,
  level,
  streak,
  earnings,
  currentTeam,
  unreadChatCount = 0,
  onTeamPress,
  onEditPress,
  onBackPress,
  onSettingsPress,
  onLevelPress,
  onEarningsPress,
}) => {
```

- [ ] **Step 3.4: Import TeamLine at the top of ProfileHero.tsx**

Use `Edit`. Add to the imports section (after the existing component imports):

```typescript
import { TeamLine } from './TeamLine';
```

- [ ] **Step 3.5: Swap the bio render for TeamLine when currentTeam is set**

Find the bio render block and replace it. From:

```tsx
{bio ? (
  <Text style={styles.bio} numberOfLines={2}>
    {bio}
  </Text>
) : null}
```

To:

```tsx
{currentTeam && onTeamPress ? (
  <TeamLine
    teamName={currentTeam.name}
    teamAvatarUrl={currentTeam.avatarUrl}
    unreadCount={unreadChatCount}
    onPress={onTeamPress}
  />
) : bio ? (
  <Text style={styles.bio} numberOfLines={2}>
    {bio}
  </Text>
) : null}
```

This preserves existing behavior when `currentTeam` is null — bio renders exactly as before.

- [ ] **Step 3.6: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS. ProfileScreen may not yet pass the new props, but they're optional, so existing call sites remain valid.

- [ ] **Step 3.7: Commit**

```bash
git add src/components/profile/ProfileHero.tsx
git commit -m "$(cat <<'EOF'
Feature: ProfileHero accepts currentTeam + renders TeamLine

Three new optional props: currentTeam, unreadChatCount, onTeamPress.
When currentTeam is provided, TeamLine renders in the slot the bio
text used to occupy. When currentTeam is null/undefined, the bio
text renders unchanged — preserves existing behavior for users who
haven't joined a club.

ProfileScreen will start passing the new props in the next commit.
EOF
)"
```

---

## Task 4: Wire ProfileScreen to compute and pass team data

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`

- [ ] **Step 4.1: Locate the ProfileHero render call(s) for the owner view**

```bash
grep -n "ProfileHero" src/screens/ProfileScreen.tsx
```

Expected hits:
- Line ~23: import
- Line ~369: owner-view render
- Line ~413: other-user view render (don't modify this one — TeamLine is owner-only)

Read the owner-view render block:

```bash
sed -n '365,395p' src/screens/ProfileScreen.tsx
```

- [ ] **Step 4.2: Add unread-count state + a handler at the top of the component**

Use `Edit`. Find the existing `useState` declarations (around line 111). Add:

```typescript
const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
```

- [ ] **Step 4.3: Import ClubChatService and useFocusEffect**

Verify imports at the top of the file. `useFocusEffect` should already be imported from `@react-navigation/native` since the file uses `useNavigation` — check with grep:

```bash
grep -n "@react-navigation/native\|ClubChatService" src/screens/ProfileScreen.tsx | head -5
```

If `useFocusEffect` is missing, add it to the existing `@react-navigation/native` import. Add a new import for `ClubChatService`:

```typescript
import { ClubChatService } from '../services/backend/ClubChatService';
```

- [ ] **Step 4.4: Add a useFocusEffect that refreshes the unread count**

Insert near the existing `useFocusEffect` (around line 190 — search for "Refresh clubs"):

```typescript
useFocusEffect(
  useCallback(() => {
    const teamId = data?.currentTeam?.id;
    if (!teamId) {
      setUnreadChatCount(0);
      return;
    }
    ClubChatService.getUnreadCount(teamId)
      .then(setUnreadChatCount)
      .catch(() => setUnreadChatCount(0));
  }, [data?.currentTeam?.id]),
);
```

The reference name is `data` (verified in source — `data: ProfileScreenData` is destructured from props at the top of the component).

- [ ] **Step 4.5: Add a handler that navigates to ClubChat**

The `data.currentTeam` shape (sourced from `getUserTeamFromCache` in `useNavigationData.ts`) is typed `any` and contains: `id`, `name`, `description`, `prizePool`, `memberCount`, `isActive`, `role`. It does **not** include `captainNpub`, so we pass an empty string for that nav param — the chat screen handles missing captain gracefully (the team line's job is to open the chat, not to assert captaincy).

Near the other navigation handlers at the top of the component:

```typescript
const handleTeamPress = useCallback(() => {
  const team = data?.currentTeam;
  if (!team) return;
  navigation.navigate('ClubChat', {
    clubId: team.id,
    clubName: team.name,
    captainNpub: '',
  });
}, [navigation, data?.currentTeam]);
```

- [ ] **Step 4.6: Pass the new props on the owner-view ProfileHero render**

The team object doesn't expose an avatar URL today, so pass `avatarUrl: null` — the `Avatar` component inside `TeamLine` will fall back to rendering initials based on the team name. A future enhancement can populate the avatar from a separate query without changing TeamLine's interface.

Find the owner-view ProfileHero call (around line 369):

```tsx
<ProfileHero user={data.user} isOwner={true}
  isLoading={!data.user}
  level={levelData?.level ?? 0}
  ...
  onEarningsPress={() => navigate('Rewards')} />
```

Add three new props:

```tsx
<ProfileHero user={data.user} isOwner={true}
  isLoading={!data.user}
  level={levelData?.level ?? 0}
  currentTeam={data.currentTeam ? {
    id: data.currentTeam.id,
    name: data.currentTeam.name,
    avatarUrl: null,
  } : null}
  unreadChatCount={unreadChatCount}
  onTeamPress={handleTeamPress}
  ...
  onEarningsPress={() => navigate('Rewards')} />
```

- [ ] **Step 4.7: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS clean.

- [ ] **Step 4.8: Commit**

```bash
git add src/screens/ProfileScreen.tsx
git commit -m "$(cat <<'EOF'
Feature: ProfileScreen wires team line + unread count

Adds an unreadChatCount state, refreshed on screen focus via
ClubChatService.getUnreadCount. Passes currentTeam, the count, and a
ClubChat-navigating onTeamPress handler to the owner-view ProfileHero.

The other-user view (ProfileHero at ~line 413) is intentionally not
modified — the team line is owner-only.
EOF
)"
```

---

## Task 5: Mark chat as seen when ClubChatScreen is focused

**Files:**
- Modify: `src/screens/ClubChatScreen.tsx`

- [ ] **Step 5.1: Confirm ClubChatScreen imports**

```bash
grep -n "useFocusEffect\|ClubChatService" src/screens/ClubChatScreen.tsx | head -5
```

If `useFocusEffect` isn't imported from `@react-navigation/native`, add it. `ClubChatService` is already imported (verified during plan-write).

- [ ] **Step 5.2: Add a useFocusEffect that calls markChatAsSeen**

Find a clean location for the hook — after the existing `useEffect` blocks but before the `useClubChat` hook call. Use `Read` to find the right anchor.

Insert:

```typescript
useFocusEffect(
  useCallback(() => {
    if (clubId) {
      ClubChatService.markChatAsSeen(clubId).catch(() => {});
    }
  }, [clubId]),
);
```

This ensures every time the user lands on or returns to the chat screen, the last-seen timestamp updates and the Home badge will be 0 next time `ProfileScreen` gains focus.

- [ ] **Step 5.3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS clean.

- [ ] **Step 5.4: Commit**

```bash
git add src/screens/ClubChatScreen.tsx
git commit -m "$(cat <<'EOF'
Feature: ClubChatScreen marks chat seen on focus

Adds useFocusEffect that calls ClubChatService.markChatAsSeen(clubId)
whenever the chat screen mounts or regains focus. Pairs with
getUnreadCount on the Home tab — opening the chat clears the badge.
EOF
)"
```

---

## Task 6: Verification script

**Files:**
- Create: `scripts/verify/verify-team-line.ts`

- [ ] **Step 6.1: Write the script**

```typescript
/**
 * Verification: TeamLine + chat unread badge wiring
 *
 * Asserts:
 *  - ClubChatService exposes getUnreadCount and markChatAsSeen
 *  - The storage key family is correct
 *  - TeamLine component file exists
 *  - ProfileHero accepts currentTeam in its props
 *
 * Run: npx tsx scripts/verify/verify-team-line.ts
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ClubChatService } from '../../src/services/backend/ClubChatService';

const repoRoot = resolve(__dirname, '../..');
const failures: string[] = [];

// 1. Methods exist on the service
if (typeof ClubChatService.getUnreadCount !== 'function') {
  failures.push('ClubChatService.getUnreadCount is not a function');
}
if (typeof ClubChatService.markChatAsSeen !== 'function') {
  failures.push('ClubChatService.markChatAsSeen is not a function');
}

// 2. Storage key shape — written to source verbatim
const servicePath = resolve(repoRoot, 'src/services/backend/ClubChatService.ts');
const serviceSrc = readFileSync(servicePath, 'utf8');
if (!serviceSrc.includes('@runstr:club_chat_last_seen:')) {
  failures.push('ClubChatService.ts is missing the @runstr:club_chat_last_seen: storage key prefix');
}

// 3. TeamLine file exists
const teamLinePath = resolve(repoRoot, 'src/components/profile/TeamLine.tsx');
if (!existsSync(teamLinePath)) {
  failures.push('TeamLine.tsx does not exist at src/components/profile/TeamLine.tsx');
}

// 4. ProfileHero declares currentTeam prop
const heroPath = resolve(repoRoot, 'src/components/profile/ProfileHero.tsx');
const heroSrc = readFileSync(heroPath, 'utf8');
if (!heroSrc.includes('currentTeam') || !heroSrc.includes('TeamLine')) {
  failures.push('ProfileHero.tsx is missing currentTeam prop or TeamLine import');
}

if (failures.length > 0) {
  console.error('Team-line verification FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('Team-line verification PASSED.');
console.log('  ClubChatService.getUnreadCount: present');
console.log('  ClubChatService.markChatAsSeen: present');
console.log('  Storage key prefix: @runstr:club_chat_last_seen:');
console.log('  TeamLine.tsx: exists');
console.log('  ProfileHero.tsx: wired to TeamLine');
```

- [ ] **Step 6.2: Run the script**

```bash
npx tsx scripts/verify/verify-team-line.ts
```

Expected:

```
Team-line verification PASSED.
  ClubChatService.getUnreadCount: present
  ClubChatService.markChatAsSeen: present
  Storage key prefix: @runstr:club_chat_last_seen:
  TeamLine.tsx: exists
  ProfileHero.tsx: wired to TeamLine
```

- [ ] **Step 6.3: Final typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6.4: Commit**

```bash
git add scripts/verify/verify-team-line.ts
git commit -m "$(cat <<'EOF'
Chore: Add verify-team-line.ts

Verification script for Phase A (Home team line + chat unread badge).
Asserts the new ClubChatService methods exist, the storage key prefix
is correct, TeamLine.tsx exists, and ProfileHero declares the
currentTeam prop with a TeamLine import.
EOF
)"
```

- [ ] **Step 6.5: Push to main**

```bash
git pull --ff-only
git push origin main
```

If `git pull --ff-only` fails (someone pushed in the meantime), `git pull --rebase`, re-run `npm run typecheck`, re-run the verification script, then push.

---

## Manual smoke test (after merge)

Per `feedback_always_erase_simulator.md`: erase + reinstall the simulator before testing.

- [ ] Open the app on the simulator with a user that has joined a club
- [ ] Verify the Home tab shows `[team avatar] Team: <name> [bell]` instead of the bio text
- [ ] Tap the team line → confirm it opens the club chat
- [ ] Send a message from another account into that club's chat
- [ ] Return to Home → confirm the bell shows a numeric badge with the unread count
- [ ] Tap the team line → enter the chat → leave the chat → return to Home
- [ ] Confirm the badge is gone

For a user that has NOT joined a club:

- [ ] Open the app on the simulator
- [ ] Verify the Home tab still shows the existing kind 0 bio text — no team line, no bell

If any of those fail, file a follow-up. If all pass, Phase A is shipped and we can plan Phase B (Reward Transaction screen).
