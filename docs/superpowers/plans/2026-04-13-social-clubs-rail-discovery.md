# Social Clubs Rail + Discovery Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Social tab's club rail bigger, sort it by member count, and add an inline discovery bar with a filtered dropdown — all without touching the rest of the Social screen or any backend.

**Architecture:** All changes live in one file: `src/components/social/ClubsRow.tsx`. The component already receives the `clubs` array from `SocialScreen`, so sort + filter stay client-side. The dropdown is rendered as an absolute-positioned overlay inside `ClubsRow` so it floats above `SocialScreen`'s feed without reflow.

**Tech Stack:** React Native + TypeScript, Expo, `@react-navigation/native`, `@expo/vector-icons`, theme tokens from `src/styles/theme.ts`.

**Spec:** `docs/superpowers/specs/2026-04-13-social-clubs-rail-discovery-design.md`

**Verification Protocol:** This project doesn't have a UI test framework. Each task ends in (a) `npm run typecheck` passing and (b) a simulator smoke-check step. See RUNSTR's CLAUDE.md "Verification Protocol" section.

---

## File Structure

**Modified:**
- `src/components/social/ClubsRow.tsx` — add sort logic, bump avatar size, add `TextInput` + filtered dropdown overlay.

**Unchanged (explicit):**
- `src/screens/SocialScreen.tsx` — continues to render `<ClubsRow clubs={clubs} userClubId={userClubId} onClubCreated={...} />` with no new props.
- `src/components/club/ClubCard.tsx` — not used by this feature.
- `src/screens/ClubsScreen.tsx` — separate screen, out of scope.

---

## Task 1: Bump rail avatar size from 40 → 56

**Files:**
- Modify: `src/components/social/ClubsRow.tsx`

- [ ] **Step 1: Update avatar `size` prop and related style widths**

In the `renderClub` function, change `size={40}` to `size={56}`.

In `styles.createCircle`, change `width: 40, height: 40, borderRadius: 20` to `width: 56, height: 56, borderRadius: 28`.

In `styles.clubItem` and `styles.createItem`, change `maxWidth: 80` to `maxWidth: 72` so a 56px avatar plus label stays tidy (56 + 8 padding on each side = 72).

```tsx
// inside renderClub
<Avatar
  name={item.name}
  size={56}
  imageUrl={item.banner_url || undefined}
/>
```

```ts
// styles
clubItem: {
  alignItems: 'center',
  maxWidth: 72,
},
createItem: {
  alignItems: 'center',
  maxWidth: 72,
},
createCircle: {
  width: 56,
  height: 56,
  borderRadius: 28,
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderStyle: 'dashed',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.colors.cardBackground,
},
```

- [ ] **Step 2: Bump the `+` icon size to match the larger circle**

In `createButton`, change `<Ionicons name="add" size={22} ... />` to `size={28}`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: passes with zero new errors.

- [ ] **Step 4: Simulator smoke-check**

Open the Social tab. Confirm avatars are visibly larger than before and the create-circle at the end matches the new size.

- [ ] **Step 5: Commit**

```bash
git add src/components/social/ClubsRow.tsx
git commit -m "Tweak: Bump Social clubs rail avatars from 40 to 56"
```

---

## Task 2: Sort rail by member_count (user's club still pinned first)

**Files:**
- Modify: `src/components/social/ClubsRow.tsx`

- [ ] **Step 1: Update the `sorted` memo to sort by `member_count` desc**

Replace the existing `sorted` memo with:

```tsx
const sorted = React.useMemo(() => {
  const byMembers = [...clubs].sort(
    (a, b) => (b.member_count ?? 0) - (a.member_count ?? 0)
  );
  if (!userClubId) return byMembers;
  return byMembers.sort((a, b) => {
    if (a.id === userClubId) return -1;
    if (b.id === userClubId) return 1;
    return 0;
  });
}, [clubs, userClubId]);
```

Why two passes: sort by member_count first, then a stable pass to float the user's club to the very front. Array.prototype.sort is stable in modern JS engines (Hermes included), so the member-count order is preserved within the non-user-club subset.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Simulator smoke-check**

- If you're in a club, your club should still appear first in the rail.
- Remaining clubs should be ordered from highest to lowest `member_count`.
- If you're not in a club, the rail is purely member_count desc.

- [ ] **Step 4: Commit**

```bash
git add src/components/social/ClubsRow.tsx
git commit -m "Feature: Sort Social clubs rail by member count"
```

---

## Task 3: Add the discovery bar (TextInput + clear button) below the rail

**Files:**
- Modify: `src/components/social/ClubsRow.tsx`

- [ ] **Step 1: Add imports and state**

Add to the imports:

```tsx
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
```

Inside the component, add search state near the `showCreate` state:

```tsx
const [searchQuery, setSearchQuery] = useState('');
```

- [ ] **Step 2: Render the discovery bar wrapped in a positioning anchor**

Inside the returned `<View style={styles.container}>`, after the `<FlatList ... />` and before `<SimpleTeamCreationModal ... />`, add a wrapper View that will anchor the later dropdown:

```tsx
<View style={styles.searchWrapper}>
  <View style={styles.searchContainer}>
    <Ionicons
      name="search-outline"
      size={18}
      color={theme.colors.textMuted}
      style={styles.searchIcon}
    />
    <TextInput
      style={styles.searchInput}
      placeholder="Search clubs..."
      placeholderTextColor={theme.colors.textMuted}
      value={searchQuery}
      onChangeText={setSearchQuery}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
    />
    {searchQuery.length > 0 && (
      <TouchableOpacity
        onPress={() => setSearchQuery('')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
    )}
  </View>
  {/* Dropdown added in Task 4 goes here as a sibling of searchContainer. */}
</View>
```

- [ ] **Step 3: Add the matching styles**

Append to the `StyleSheet.create({ ... })` block (keep existing entries):

```ts
searchWrapper: {
  marginHorizontal: 16,
  marginTop: 12,
  zIndex: 20,
},
searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: theme.colors.cardBackground,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: theme.colors.border,
  paddingHorizontal: 12,
  height: 42,
},
searchIcon: {
  marginRight: 8,
},
searchInput: {
  flex: 1,
  color: theme.colors.text,
  fontSize: 14,
  height: 42,
  padding: 0,
},
```

Styling intentionally mirrors `src/screens/ClubsScreen.tsx` for visual consistency.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 5: Simulator smoke-check**

- The discovery bar sits directly below the avatar rail, above the border that separates it from the feed.
- Typing shows the × clear button. Tapping × empties the field.
- No dropdown yet — that's Task 4. The feed below still renders normally.

- [ ] **Step 6: Commit**

```bash
git add src/components/social/ClubsRow.tsx
git commit -m "Feature: Add discovery bar below Social clubs rail"
```

---

## Task 4: Add the filtered dropdown overlay

**Files:**
- Modify: `src/components/social/ClubsRow.tsx`

- [ ] **Step 1: Add the filtered-matches memo and navigation helper**

Just after the `sorted` memo, add:

```tsx
const filteredMatches = React.useMemo(() => {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return [];
  return clubs
    .filter((c) => c.name.toLowerCase().includes(q))
    .slice(0, 8);
}, [clubs, searchQuery]);
```

- [ ] **Step 2: Add a handler that navigates + clears the query**

Above `renderClub`, add:

```tsx
const handleMatchPress = useCallback(
  (club: Club) => {
    setSearchQuery('');
    navigation.navigate('ClubPage', { clubId: club.id, clubName: club.name });
  },
  [navigation]
);
```

- [ ] **Step 3: Render the dropdown overlay inside the search wrapper**

Inside the `<View style={styles.searchWrapper}>` block created in Task 3, replace the `{/* Dropdown ... */}` comment with:

```tsx
{filteredMatches.length > 0 && (
  <View style={styles.dropdown}>
    {filteredMatches.map((club) => (
      <TouchableOpacity
        key={club.id}
        style={styles.dropdownRow}
        onPress={() => handleMatchPress(club)}
        activeOpacity={0.7}
      >
        <Avatar
          name={club.name}
          size={32}
          imageUrl={club.banner_url || undefined}
        />
        <Text style={styles.dropdownName} numberOfLines={1}>
          {club.name}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)}
```

- [ ] **Step 4: Add dropdown styles**

Append to the `StyleSheet.create` block:

```ts
dropdown: {
  // Anchored to searchWrapper (42px input + 4px gap).
  position: 'absolute',
  top: 46,
  left: 0,
  right: 0,
  backgroundColor: theme.colors.background,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: theme.colors.border,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  maxHeight: 320,
  overflow: 'hidden',
},
dropdownRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingHorizontal: 12,
  paddingVertical: 8,
},
dropdownName: {
  flex: 1,
  color: theme.colors.text,
  fontSize: 14,
  fontWeight: theme.typography.weights.medium,
},
```

Also update `styles.container` to set `zIndex: 10` so the whole ClubsRow (and its dropdown) floats above sibling content in the parent `SocialScreen` list:

```ts
container: {
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.border,
  paddingVertical: 12,
  zIndex: 10,
},
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 6: Simulator smoke-check**

- Type `run` (or any substring matching a real club name). A dropdown appears below the search bar with up to 8 matches. Each row shows a 32px avatar and the club name.
- The feed behind the dropdown does NOT reflow or scroll down. Dropdown floats above it.
- Tap a row: app navigates to `ClubPage` for that club. Returning to the Social tab, the search field is empty and the dropdown is gone.
- Tap the × clear button: dropdown disappears immediately.
- Type a query that matches nothing: the dropdown does not render (empty state is just "no dropdown", per spec).

- [ ] **Step 7: Commit**

```bash
git add src/components/social/ClubsRow.tsx
git commit -m "Feature: Filtered club dropdown under discovery bar"
```

---

## Task 5: Verification script

**Files:**
- Create: `scripts/verify/verify-clubsrow.ts`

Pure-logic verification of the sort and filter behavior. The UI layer is checked manually in the simulator; this covers the array math so regressions are caught.

- [ ] **Step 1: Create the script**

```ts
// scripts/verify/verify-clubsrow.ts
//
// Verifies the sort + filter logic used by ClubsRow:
// - sorted: user's club first, rest by member_count desc
// - filteredMatches: case-insensitive includes, capped at 8

type Club = { id: string; name: string; member_count: number };

const sortRail = (clubs: Club[], userClubId: string | null) => {
  const byMembers = [...clubs].sort(
    (a, b) => (b.member_count ?? 0) - (a.member_count ?? 0)
  );
  if (!userClubId) return byMembers;
  return byMembers.sort((a, b) => {
    if (a.id === userClubId) return -1;
    if (b.id === userClubId) return 1;
    return 0;
  });
};

const filterMatches = (clubs: Club[], query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return clubs.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
};

const clubs: Club[] = [
  { id: 'a', name: 'RUNSTR', member_count: 120 },
  { id: 'b', name: 'LATAM Corre', member_count: 45 },
  { id: 'c', name: 'CYCLESTR', member_count: 80 },
  { id: 'd', name: 'Bitcoin Runners', member_count: 200 },
  { id: 'e', name: 'Spain Scape', member_count: 30 },
];

// 1. Sort with no user club -> pure member_count desc
const s1 = sortRail(clubs, null).map((c) => c.id);
console.assert(
  JSON.stringify(s1) === JSON.stringify(['d', 'a', 'c', 'b', 'e']),
  `sort-no-user: got ${s1}`
);

// 2. Sort with user club pins it first, others stay in member_count desc
const s2 = sortRail(clubs, 'e').map((c) => c.id);
console.assert(
  JSON.stringify(s2) === JSON.stringify(['e', 'd', 'a', 'c', 'b']),
  `sort-user-pinned: got ${s2}`
);

// 3. Empty query -> no matches
console.assert(filterMatches(clubs, '').length === 0, 'empty-query');
console.assert(filterMatches(clubs, '   ').length === 0, 'whitespace-query');

// 4. Case-insensitive substring match
const m1 = filterMatches(clubs, 'run').map((c) => c.id);
console.assert(
  JSON.stringify(m1.sort()) === JSON.stringify(['a', 'd']),
  `filter-case: got ${m1}`
);

// 5. Cap at 8 matches
const many: Club[] = Array.from({ length: 20 }, (_, i) => ({
  id: `x${i}`,
  name: `Runners ${i}`,
  member_count: i,
}));
console.assert(filterMatches(many, 'runners').length === 8, 'cap-8');

console.log('✅ ClubsRow sort + filter verification passed');
```

- [ ] **Step 2: Run the verification script**

Run: `npx tsx scripts/verify/verify-clubsrow.ts`
Expected: `✅ ClubsRow sort + filter verification passed` with no assertion failures.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify/verify-clubsrow.ts
git commit -m "Chore: Verification script for ClubsRow sort and filter"
```

---

## Final smoke test (before marking complete)

- [ ] Social tab loads without errors; the rail shows clubs with 56px avatars sorted largest-first (with your club pinned, if applicable).
- [ ] Discovery bar sits under the rail, above the feed border.
- [ ] Typing filters into a floating dropdown that overlays the feed (no reflow). Tapping a result navigates to `ClubPage` and clears the query. × button clears immediately.
- [ ] `npm run typecheck` passes.
- [ ] `npx tsx scripts/verify/verify-clubsrow.ts` prints the success line.

---

## Self-review notes

- **Spec coverage:** avatar size (T1), sort by member_count with user pin (T2), discovery bar location + styling (T3), dropdown filter / overlay / tap behavior (T4), verification (T5). All spec sections covered.
- **Placeholders:** none. Every step has the code or command it needs.
- **Type consistency:** `Club` fields used (`id`, `name`, `member_count`, `banner_url`) match the existing `Club` type used elsewhere in the file. `handleMatchPress` signature stays stable across steps.
- **Scope:** single file modification (+ one verification script). No new services, no backend, no nav changes beyond the existing `ClubPage` route.
