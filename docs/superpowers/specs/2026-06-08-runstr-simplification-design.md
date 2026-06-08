# RUNSTR Simplification Pass — Design

**Date:** 2026-06-08
**Status:** Awaiting user review
**Author:** Dakota + Claude

## 1. North Star

RUNSTR rewards you for cardio. After this pass the app is **three surfaces and nothing else**:

- **Leaderboard** — always-on daily competitions (5K, 10K, Half, Marathon, Steps, Walking, Cycling)
- **Social** — a pure Nostr feed (workout posts, zaps, likes, reposts)
- **Dashboard** — the user's profile: workouts, history, settings

You complete a cardio workout, share it one way, and earn a reward that goes to your lightning address — or, if you toggle it (or have no address), to the ALS Network. Every surface removed is a surface that can no longer break. This pass is a deliberate **subtraction**, not a feature build.

This simplified RUNSTR is intended to fold under the **No Burnout** brand as a low-maintenance, automatable property.

## 2. Final App Shape

**Bottom tabs (3):**

| Tab | Screen | Was |
|-----|--------|-----|
| Leaderboard | `LeaderboardsScreen` (promoted to primary tab) | a pushed stack screen |
| Social | `SocialScreen`, stripped to pure feed | feed + clubs row + events list |
| Dashboard | `ProfileScreen` (current Home) | Home tab |

**Removed tabs/entries:** `History` tab and `Compete` entry are gone; reward history is consolidated into Dashboard/Settings.

## 3. Scope

### Removed entirely
- **Teams / Fitness Clubs** — all club screens, components, services, the team store, captain detection, and the `ClubPage` route.
- **Team chat** — `ClubChatScreen`, `ClubChatService`, `ClubChatAutoShare`, `useClubChat`, chat components, and the `ClubChat` route. (User decision 2026-06-08: cut teams + chat entirely.)
- **Custom / captain-created events** — event-creation modals, `CaptainEventStore`, `RunstrEventPublishService`, `RunstrAutoPayoutService`, the event-creation hook.
- **Season competitions** — Season 2, Season 3 (team-based), Einundzwanzig challenge.
- **Dead in-app wallet UI** — the unreachable `Wallet` stack screen + route (`AppNavigator:238`) and `WalletScreen`. Nothing navigates to it.

### Kept (do NOT touch)
- **Daily leaderboard pipeline** — `LeaderboardsScreen`, `LeaderboardsContent`, `StepCompetitionService`, `PendingSubmissionService`, `leaderboardCardGenerator`.
- **All reward/NWC machinery** — `NWCGatewayService`, `RewardDestinationService`, `RewardLightningAddressService`, `SupabaseRewardService`, and the `claim-reward` gateway operations (`pay_invoice`, `create_invoice`, `lookup_invoice`, `get_balance`, `register_donation`). **User decision 2026-06-08: keep the NWC stuff.** Rewards must keep working.
- **Workout tracking** — GPS tracking, HealthKit / Health Connect sync, background submission.
- **The Nostr social feed** — `SocialFeedService`, `SocialInteractionService`, `SocialFeedPost`, `WorkoutPostCard`.

### Changed
- **Posting** collapses from 5 entry points + 6 card templates to **one styled card via one share button**. The other 5 templates and the picker are *hidden, not deleted* (kept dormant for later).
- **Reward destination** decouples from team membership and becomes an explicit **"Me ↔ ALS Network"** toggle; no address set → defaults to ALS Network (Running Bitcoin Primal lightning address). Only ALS for now; Chimes/HRF deferred behind the same mechanism.

### Out of scope / deferred
- Multi-charity picker (Chimes, HRF) — design supports it later; only ALS ships now.
- Bringing back alternate card templates.
- Any No Burnout cross-brand automation (separate effort).

## 4. Phased Implementation

Each phase is a **separate commit** that leaves the app compiling (`npm run typecheck` clean) and the relevant `verify:*` scripts passing. Never batch phases.

### Phase 1 — Navigation reshape (low-risk, visible)
- Promote `LeaderboardsScreen` to a primary bottom tab.
- Strip `ClubsRow` + `EventsList` from `SocialScreen` → pure feed.
- Remove the `Compete` entry and `History` tab; surface reward history inside Dashboard/Settings.
- **Verify:** typecheck; app boots to 3 tabs.

### Phase 2 — Remove Teams / Clubs / chat
- Delete: `ClubPageScreen`, `ClubChatScreen`, `ClubsScreen`; `components/club/*`, `components/social/ClubsRow.tsx`; `ClubService`, `ClubMembershipService`, `ClubChatService`, `ClubChatAutoShare`, `ClubBannerStorageService`, `ClubWalletService`; `services/team/*`, `captainDetectionService`; `store/teamStore.ts`; `useClubChat`.
- Remove `ClubPage` / `ClubChat` routes.
- Remove the auto-share-to-club hook from the workout-finish flow.
- **Verify:** typecheck after each cluster of deletions; resolve cascading imports.

### Phase 3 — Remove custom events + seasons (keep daily leaderboards)
- Delete event-creation modals, `CaptainEventStore`, `RunstrEventPublishService`, `RunstrAutoPayoutService`, `useRunstrEventCreation`; Season 2/3 screens + services; Einundzwanzig.
- Keep the daily leaderboard pipeline untouched.
- **Verify:** `verify:competition-leaderboard-pipeline`, `verify:cycling-daily-leaderboards`, typecheck.

### Phase 4 — Remove dead Wallet UI (keep NWC)
- Delete `WalletScreen` + the `Wallet` route only. **Keep all NWC/reward services.**
- Consolidate the former `History`/`Rewards` surfaces into one read-only rewards view (history + lightning address + charity toggle).
- **Verify:** `verify:reward-history`, typecheck.

### Phase 5 — One posting style
- Choose the single best workout card template; route all shares through it.
- Hide the template picker and the extra share entry points (`SocialShareModal`, the picker in `EnhancedSocialShareModal`). Keep `PostComposerModal` for plain text.
- Card-rendering code stays but only one path is reachable.
- **Verify:** new script `verify-single-post-path.ts`; manual share smoke test.

### Phase 6 — Reward toggle (ALS)
- Decouple `RewardDestinationService` from team membership; drive it from an explicit toggle value.
- Trim `charities.ts` to ALS Network (Running Bitcoin Primal address). Default-to-ALS when no user address.
- Add the **"Me ↔ ALS Network"** toggle to Settings/Rewards.
- **Verify:** `verify:reward-destination-routing`, `verify:reward-destination-background-sync`, new `verify-charity-toggle.ts`.

### Phase 7 — Verify + new test scripts
- Run **all** `verify:*` scripts; fix anything the deletions broke (this is the "run all the tests" pass).
- Write new scripts for previously-untested gaps:
  - `verify-single-post-path.ts` — one and only one publish path reaches Nostr.
  - `verify-charity-toggle.ts` — toggle + no-address default both route to ALS.
  - `verify-three-tab-navigation.ts` — exactly 3 tabs, correct screens, no dangling routes.
  - `verify-daily-leaderboard-intact.ts` — leaderboard pipeline still submits and ranks.
- **Verify:** all green; report a before/after scorecard.

### Phase 8 — Website handoff
- Write the 5-paragraph content brief describing the simplified app + No Burnout consolidation framing, for the RUNSTR/No Burnout website to ingest.

## 5. Reward Routing Design

- Storage: reuse `@runstr:reward_lightning_address` (user) and a simplified destination flag (replace `@runstr:selected_team_id` semantics).
- Resolution order: explicit toggle = "Me" and address present → pay user; toggle = "ALS" → pay ALS; **no address → ALS** (default).
- ALS destination: Running Bitcoin Primal lightning address (already used previously).
- The zapper / `claim-reward` gateway is unchanged; only the *destination resolution* simplifies.

## 6. Posting Design

- Single share button on the workout summary → one styled card → publish (kind 1 with card image + stats; workout itself remains kind 1301 to Supabase, never to relays).
- Picker and alternate templates hidden behind a feature flag / commented entry, not deleted.

## 7. Testing Strategy

The real test suite here is the `scripts/verify/` library (Jest footprint is intentionally thin). After every phase: `npm run typecheck` + the phase's named `verify:*` scripts. Phase 7 adds 4 new scripts covering the post-simplification invariants that were never tested before.

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Deletions cascade into broken imports across feed/profile/rewards | typecheck + verify after **every** phase; phases as separate revertible commits |
| `ActivityTrackerScreen` flagged dead in memory but mapped as the live workout-finish screen | **Verify reachability before touching it** (grep consumers, trace to nav root); do not delete on memory alone |
| Removing teams breaks reward routing (currently team-membership-driven) | Phase 6 decouples routing from teams; sequence Phase 6 right after Phase 2's team cuts land |
| Accidentally removing NWC / reward gateway | Explicit "keep NWC" boundary in §3; Phase 4 touches only the dead `Wallet` UI |
| Hidden card templates rot | Keep them behind a single flag, documented, so revival is one toggle |

## 9. Decisions Log
- 2026-06-08: Charity = ALS only for now; no-address defaults to ALS. (User)
- 2026-06-08: One styled card; hide the other 5, don't delete. (User)
- 2026-06-08: Cut teams + team chat entirely. (User)
- 2026-06-08: No live in-app wallet; remove only dead Wallet UI. Keep all NWC. (User)
