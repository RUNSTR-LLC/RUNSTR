# Dead Code Catalog — v1.8.8

Generated 2026-04-10. Verified by tracing navigation paths from user-reachable UI.

## Confirmed Dead Screens

These screens are registered in App.tsx or AppNavigator.tsx but have **zero** `navigate()` calls pointing to them anywhere in the codebase.

| File | Lines | Route Name | Evidence |
|------|-------|------------|----------|
| `src/screens/SimpleTeamScreen.tsx` | 881 | `EnhancedTeamScreen` | 3 callers exist but none are reachable (see below) |
| `src/screens/EventsScreen.tsx` | 439 | `Events` (stack) | No `navigate('Events')` in codebase |
| `src/screens/LeagueDetailScreen.tsx` | 373 | `LeagueDetail` | No `navigate('LeagueDetail')` in codebase |
| `src/screens/MyTeamsScreen.tsx` | 334 | `MyTeams` | No `navigate('MyTeams')` in codebase |
| `src/screens/CompetitionsListScreen.tsx` | 335 | `CompetitionsList` | No `navigate('CompetitionsList')` in codebase |
| `src/screens/TeamsScreen.tsx` | 806 | `Teams` | No `navigate('Teams')` in codebase |
| `src/screens/DonateScreen.tsx` | 286 | `Donate` | No `navigate('Donate')` in codebase |
| **Total** | **3,454** | | |

### Why SimpleTeamScreen is Dead

`EnhancedTeamScreen` has 3 registered callers:
1. `BottomTabNavigator.tsx:180` — `onViewCurrentTeam` callback, but this prop is passed through ProfileScreen to Settings and **never rendered as a clickable button**.
2. `navigationHandlers.ts:189` — `handleTeamView()` is defined but **never called by any component**.
3. `MyTeamsScreen.tsx:88` — MyTeamsScreen itself is dead (no `navigate('MyTeams')`).

The actual Fitness Club detail view is `ClubPageScreen.tsx`, reached via `navigate('ClubPage')` from ClubsRow, ProfileScreen, and DynamicEventDetailScreen.

## Confirmed Dead Services

These services are only imported by dead screens listed above.

| File | Lines | Only Used By |
|------|-------|-------------|
| `src/services/competition/SimpleLeaderboardService.ts` | 1,512 | SimpleTeamScreen, EventsScreen, LeagueDetailScreen |
| `src/services/competition/SimpleCompetitionService.ts` | 884 | LeagueDetailScreen, SimpleLeaderboardService |
| **Total** | **2,396** | |

**Note:** SimpleCompetitionService exports `CompetitionEvent` type which is imported by 3 live event store services (`EventSnapshotStore`, `CaptainEventStore`, `EventParticipationStore`). Those type imports would need to be moved before deletion.

## Grand Total

**5,850 lines** of confirmed dead code across 9 files.

## NOT Dead (Verified Live)

These were initially suspected but confirmed reachable:
- `ClubPageScreen.tsx` — reached from ClubsRow, ProfileScreen, DynamicEventDetailScreen
- `ClubsScreen.tsx` — registered but needs verification (may be dead)
- `SavedRoutesScreen.tsx` — file does not exist

## How to Remove

1. Delete the 7 dead screen files
2. Delete `SimpleLeaderboardService.ts` and `SimpleCompetitionService.ts`
3. Move `CompetitionEvent` type to a shared types file
4. Remove screen registrations from `App.tsx` and `AppNavigator.tsx`
5. Remove dead imports of these screens
6. Run `npm run typecheck` to verify
