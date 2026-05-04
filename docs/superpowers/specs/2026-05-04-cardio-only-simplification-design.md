# Cardio-Only Simplification — Design

**Date:** 2026-05-04
**Status:** Brainstorm-approved, ready for plan
**Scope:** User-visible app simplification. Dead code cleanup deferred.

## Goal

Reduce RUNSTR's surface area to the smallest version of the product that still works: reward people for cardio by sending Bitcoin to their Lightning address. Keep clubs, social feed, competitions, the in-app tracker, Apple Health / Health Connect sync, push notifications, encrypted Nostr backup, and streaks. Cut everything else from the user-facing app.

## In scope

Eight user-visible changes, organized into five sequenced phases.

## Out of scope

- **Dead code cleanup.** The in-app wallet, music (Wavlake/Blossom), voice transcription, fitness test, advanced analytics, web of trust, saved routes, pledge system, donation tracking, and watch services are all unreachable or near-unreachable from the shipped app. Their removal is a separate cleanup pass to be planned later.
- **Levels system.** No changes. `WorkoutLevelService`, `LevelCard`, `LevelDetailScreen`, and the level number on the profile stay exactly as they are. Conceptually the level number is the user's progression — it goes up by one when they work out, that's it.
- **Daily leaderboard internals.** The five-distance leaderboard (5K / 10K / Half / Marathon / Steps) inside `LeaderboardsScreen` is preserved as-is.
- **Existing team affiliations.** Users who have already joined a club keep that affiliation. The onboarding cut applies only to the first-run flow for new users.

## The eight changes

### 1. Activity grid: drop Strength tiles
The grid currently shows Strength + Cardio. Remove Strength tiles. Cardio (Run / Walk / Cycle / Hike), Steps, and Manual entry stay.

### 2. Onboarding: cut team-picker step
First-run flow no longer requires picking a team. Users land in the app and can join a club later from the Social tab when they want to.

### 3. Onboarding: cut reward-destination picker
Single destination: the user's own Lightning address. Onboarding asks for a Lightning address and that's it. Existing destination preferences (charity / AI / project) stop being honored — all rewards route to self.

### 4. Cut SponsorBanner and Zapvertising surfaces
`SponsorBanner` component, sponsor attribution, and any surface that frames rewards as sponsor-funded are removed. Rewards just happen.

### 5. Tab restructure: 4 tabs → 3 tabs
Eliminate the Events tab. Bottom tabs become **Home / Social / History**. The existing `EventsContent` and `LeaderboardsContent` components are already documented as embeddable; they get embedded directly into the Social tab.

### 6. Social tab layout
Top to bottom inside `SocialScreen`:
- Club discovery rail (existing horizontal scroll, unchanged)
- Embedded `<EventsContent />` — daily-leaderboard tile + tiles for events from clubs the user has joined; tile taps reuse existing nav (`LeaderboardsScreen`, event detail screens, etc.)
- Social feed posts (existing vertical list, unchanged)

### 7. Home tab: team banner with chat alert bell
Single addition to the existing Home (Profile) screen: a banner button at the top showing the user's current club, with an alert bell that shows an unread-count badge when the club chat has unread messages. Tap → opens `ClubChatScreen`. The rest of the Home screen is unchanged. Users without a club see no banner (or a "browse clubs" CTA — to be decided in implementation).

### 8. Rewards page: refocus to user-specific transaction history
Keep `RewardsScreen` in nav. Rebuild contents around the individual user:
- Transaction list of rewards received, each row showing the date, the workout that earned it, and the sat amount
- Reads from the existing `reward_payments` table via `SupabaseRewardService`

Remove the charity-payout leaderboard, `ImpactHeroCard`, `GlobalBreakdownCard`, `PersonalImpactSection`, `TransparencyDashboardModal`, and any other charity-aggregate / global-view surfaces that existed for the multi-destination model.

## Phasing

Five phases, ordered by smallest-effort-first to match the rolling-branch workflow. Each phase is independently shippable.

### Phase 1 — Strength cut
**Touches:** Activity grid component, `StrengthTrackerScreen` registration in nav.
**Risk:** Minimal. Confined to one grid and one screen.

### Phase 2 — Tab restructure
**Touches:** `BottomTabNavigator.tsx` (remove `Events` tab), `SocialScreen.tsx` (embed `EventsContent`), tab labels/icons, any deep-linking that targets the Events tab.
**Risk:** Low. Components are already designed to be embedded.

### Phase 3 — Home team banner + chat alert bell
**Touches:** New banner component, `ProfileScreen` (where Home renders), unread-count source (likely `ClubChatService` or equivalent), navigation handler to `ClubChatScreen`.
**Risk:** Low. Localized addition, no removals.

### Phase 4 — Onboarding cleanup
**Touches:** Onboarding flow (cut team-picker step, cut destination-picker step), `RewardDestinationService` (collapse to self), `SponsorBanner` removal across all surfaces it appears, related copy.
**Risk:** Medium. Touches multiple services and the first-run UX. Existing users who had non-self destinations need a graceful migration (default to self at next app open).

### Phase 5 — Rewards page rework
**Touches:** `RewardsScreen` (rebuild), new transaction-history component, `SupabaseRewardService` (likely already exposes the read), removal of charity-aggregate / impact / transparency / global-breakdown components.
**Risk:** Medium. Largest visual rework, but isolated to one screen and its sub-components.

## Architecture notes

**Data model:** No schema changes. `reward_payments` table already supports per-user transaction history. `RewardDestinationService` already supports "self" as the routing target — phase 4 just makes it the only one.

**Navigation:** The Events `Stack.Screen` registration in `AppNavigator.tsx` stays (deep-linkable from event tiles). Only the *bottom-tab entry* is removed in phase 2.

**Existing nav reuse:** Daily leaderboard tile in the new events grid → existing `LeaderboardsScreen` (no changes to the leaderboard surface). Club event tiles → existing event detail screens (`DynamicEventDetailScreen`, etc.).

**Onboarding migration:** Phase 4 needs to handle users who already picked a non-self reward destination. Simplest path: on first launch after the upgrade, silently overwrite the destination to "self" if the user has a Lightning address; if not, prompt for one.

## Verification per phase

Each phase ships with a short `scripts/verify/` script confirming:
- Phase 1: Strength tiles absent from grid; `StrengthTrackerScreen` not reachable from nav.
- Phase 2: Events tab not in bottom-tab list; `EventsContent` rendered inside `SocialScreen`; daily leaderboard tile still navigates to `LeaderboardsScreen`.
- Phase 3: Home banner renders with current club; unread-count badge updates when chat receives messages; tap navigates to `ClubChatScreen`.
- Phase 4: New users complete onboarding without team or destination prompts; existing users' rewards route to their own Lightning address.
- Phase 5: `RewardsScreen` renders user-scoped transaction list; charity / impact / transparency surfaces gone.

Plus `npm run typecheck` clean after each phase.

## Open implementation questions

These don't block the spec but should be settled in the implementation plan:

1. **Phase 3 unread-count source** — does `ClubChatService` already expose an unread-count subscription, or does this need a new local-state derivation?
2. **Phase 4 migration UX** — silent overwrite with a one-time toast, or an explicit "your reward destination is now your own wallet" notice?
3. **Phase 5 transaction list pagination** — page size, infinite scroll vs paginated? Likely just last 50 with a "load more" if `reward_payments` rows can grow unbounded per user.
