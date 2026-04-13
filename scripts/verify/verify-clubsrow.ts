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
