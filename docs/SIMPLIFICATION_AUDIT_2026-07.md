# Simplification Audit — 2026-07-02 (pre-v2.0)

Five parallel deep-inspection agents traced every screen and service to a live navigation root (App.tsx → AuthenticatedStack / BottomTabNavigator, index.js background tasks, push-notification deep links). This document is the actionable inventory. Report-only; nothing was deleted.

**Baseline:** 605 files / ~188k lines in src/; 187 service files; 99 files over the 500-line limit; typecheck clean on v1.9.9.

**Headline:** ~17,700 lines across ~60 files are verified-dead and safe to delete now; another ~5,400 lines need a product decision. Combined ≈ 12% of src/. Within services alone, ~40 of 187 files (~22% of the service layer) are dead or vestigial.

---

## 1. Live screen map (authoritative)

- **Unauthenticated:** AppNavigator renders only `Login`. Its other ~19 registrations are shadow copies plus two ghosts (`Wallet`, `FitnessTestResults`) reachable nowhere.
- **Tabs:** Home → ProfileScreen (renders Running/Walking/Cycling/Hiking trackers inline) · Social → SocialScreen · Leaderboard → LeaderboardsScreen.
- **Live stack screens:** Settings (+Help/Contact/Privacy), WorkoutHistory, ProfileEdit, LevelDetail, Rewards, DynamicEventDetail, ClubPage, ClubChat, Comments.
- **Correction (2026-07-03):** AdvancedAnalyticsScreen is NOT reachable — WorkoutHistoryScreen passed `onNavigateToAnalytics` into WorkoutTabNavigator, which declared the prop but never rendered a caller. The dead handler/prop were removed; the screen joins the orphaned-registered list (with its FitnessTestResults crash path, now moot).
- **Gated/notification-only:** CompeteScreen → Season3Screen / EinundzwanzigDetailScreen — hidden by `FEATURES.customEvents=false`, still reachable via push deep links (ExpoNotificationProvider).
- **Registered but orphaned (nothing navigates):** SavedRoutes, HealthProfile, JournalHistory, StatsDetail, Experimental, Season2.

**Memory corrections:** LevelDetailScreen and AdvancedAnalyticsScreen are LIVE (previous audit called them dead). Music is LIVE (HeaderMusicControls → ExpandedMusicPlayer/PlaylistBrowser mounted in App.tsx). The wallet/zap stack is PARTIALLY live — see §4.

## 2. SAFE TO DELETE now (~17,700 lines, ~60 files)

Grouped; each verified zero live importers (or importers themselves dead; noted edits are trivial).

### Season 2 cluster (~3,300 ln)
- `services/season/Season2PayoutService.ts` (375), `hooks/useSeason2.ts` (700), `screens/season2/Season2Screen.tsx` (319) + deregister route, `components/season2/*` (ExplainerModal 293, CharityRankings 190, InfoCard 121, Banner 48, SignupSection 37, index 10)
- `Season2Service.ts` (1394): deletable only after Season3 decision (Season3Service imports it) — see §3.
- `components/season2/Season2Leaderboard.tsx` (389): also imported by gated EinundzwanzigDetailScreen — resolve with §3.

### Dead event/competition services (~3,050 ln)
`components/events/RunstrEventCreationModal.tsx` (943), `services/scoring/SatlantisEventScoringService.ts` (583), `services/events/RunstrEventPublishService.ts` (539), `services/events/RunstrAutoPayoutService.ts` (416), `services/challenge/EinundzwanzigPayoutService.ts` (337), `hooks/useRunstrEventCreation.ts` (235)

### Dead Nostr competition stack (~6,000 ln incl. services below)
`competition/competitionService.ts` (632), `competition/leagueDataBridge.ts` (669), `competition/leagueRankingService.ts` (627), `competition/Competition1301QueryService.ts` (718), `nostr/NostrCompetitionService.ts` (970), `nostr/NostrCompetitionParticipantService.ts` (563), `nostr/leaderboardCardGenerator.ts` (370), `integrations/nostrCompetitionBridge.ts` (523), `integrations/NostrCompetitionContextService.ts` (605), plus `hooks/useLeagueRankings.ts`, `components/team/CompactTeamCard.tsx`, `components/team/LeaderboardShareModal.tsx` (459).
Prerequisite one-liners: remove the unused hook in `useCachedData.ts`; remove the inert NostrCompetitionService reference in `CompetitionCacheService` (itself dead, see caches).

### WalletScreen cluster (~1,900 ln)
`screens/WalletScreen.tsx` (263; move `type WalletData` out of NavigationDataContext import first), `components/wallet/{SendBitcoinForm 394, ReceiveBitcoinForm 364, WalletBalanceCard 233, WalletActivityList 219, AutoWithdrawSection 172, EarningsSummary 143, WalletConnectionError 123}`.
**KEEP (live via RewardsScreen/Settings):** ReceiveModal, SendModal, WalletConfigModal, HistoryModal, NWCQRConfirmationModal, LightningAddressSetupModal, ExternalZapModal, NWCWalletService, NWCStorageService.

### Dead zap/team/reward UI (~4,550 ln)
`components/event/EventPaymentModal.tsx` (646), `components/team/CharitySection.tsx` (475), `components/wallet/CoinOSAccountSetupModal.tsx` (475), `components/rewards/PersonalImpactSection.tsx` (388), `components/ui/ZapModal.tsx` (356 — zero importers; grep hits were substrings of other zap modals), `components/team/SimpleLeagueDisplay.tsx` (326), `components/profile/PersonalWalletSection.tsx` (297), `components/team/CommunityTeamsSection.tsx` (284), `components/team/TeamGoalProgressCard.tsx` (181), `components/club/ClubRewardsPoolCard.tsx` (159), `components/team/TeamHeader.tsx` (150), `components/analytics/HealthSnapshotCard.tsx` (200), `components/settings/AgentSkillSetupModal.tsx`, `components/rewards/{ImpactHeroCard, EarningsCard*, ClubEarningsCard, RewardBreakdownCard}` (*verify EarningsCard — one agent saw a live Rewards navigation from it), `components/ui/NostrConnectionStatus.tsx`.

### Dead screens (~3,040 ln)
`screens/ClubsScreen.tsx` (551), `screens/activity/ActivityTrackerScreen.tsx` (509), `screens/activity/ManualWorkoutScreen.tsx` (427), `screens/activity/StepsDisplayScreen.tsx` (403), `screens/HealthProfileScreen.tsx` (367 + deregister), `screens/RewardHistoryScreen.tsx` (341) + `screens/rewardLabel.ts` (66), `screens/activity/JournalTrackerScreen.tsx` (139), `screens/activity/HabitTrackerScreen.tsx` (34), `screens/FitnessTestResultsScreen.tsx` (630 — also fix/remove the navigate at AdvancedAnalyticsScreen:225, see Bugs).

### Dead music files (~2,060 ln — the REST of music is live)
`components/music/WavlakeZapButton.tsx` (426) + `services/music/WavlakeZapService.ts` (237), `AddToPlaylistSheet.tsx` (389), `CreatePlaylistModal.tsx` (314), `hooks/useWavlakePlayer.ts` (232), `MiniMusicPlayer.tsx` (231), `ProfileMusicBar.tsx` (228)

### Dead caches (~1,320 ln)
`cache/FrozenEventStore.ts` (276), `cache/CompetitionCacheService.ts` (348), `cache/CacheInvalidator.ts` (361), `cache/WorkoutCacheService.ts` (338 — write-only; nothing reads its key). Small edits in NostrPrefetchService/authService/NostrInitializationService.

### Dead fitness/team/notification/infra services (~3,000 ln)
`fitness/FitnessTestService.ts` (423), `fitness/CalorieEstimationService.ts` (236), `fitness/WorkoutEventStore.ts` (717), `team/captainDetectionService.ts` (87), `utils/joinRequestPublisher.ts`, `notifications/TeamJoinNotificationHandler.ts`, `notifications/EventJoinNotificationHandler.ts`, root `notificationService.ts` (269) + `notificationDemoService.ts` (191) + `LocalNotificationTrigger`, `event/CaptainEventStore.ts` (209), `event/EventParticipationStore.ts` (176), `event/QREventService.ts` (243), `social/SocialInteractionService.ts` (169), `season/Season1Service.ts` (232 + remove never-called `prefetchSeason1()`), `initialization/AppInitializationService.ts` (222 — dead twin of live `core/AppInitializationService`; keep `initialization/AppPermissionService`), `hooks/useNavigationData.ts` (318 — dead twin of the live context), `components/ui/SplashScreen.tsx` (250 — App.tsx uses expo-splash-screen; contains a "Connecting to Nostr relays..." string that never renders), stale `team/README.md` + `backend/README.md`.

## 3. Product decisions needed before deleting (~5,400 ln)

1. **Compete/Season3/Einundzwanzig cluster (~2,600 ln):** hidden by `customEvents=false` but reachable via push deep links. Has hide-not-delete expired? Deleting requires updating ExpoNotificationProvider and pulls Season2Service (1,394) with it.
2. **Orphaned registered screens:** SavedRoutesScreen (552), JournalHistoryScreen (124), StatsDetailScreen (106), `Experimental` alias — dead unless a navigate is intended.
3. **teamMembershipService (416) + LocalTeamMembershipService (281) + captainCache (~140):** dead-in-effect (data sinks orphaned; reads return null/[]); needs a small refactor of 3 read sites.
4. **workoutMergeService (1,173):** vestigial — its output feeds only the write-only WorkoutCacheService; the visible list uses `utils/unifiedWorkoutMerge.ts`. Contains a WRONG HealthKit type map (trap). Delete after WorkoutCacheService; move `UnifiedWorkout` type to src/types.
5. **DailyRewardService (891):** runs on every save but only surviving observable behavior is the pledge-progress toast (~40 ln). Extract the toast, delete the rest.
6. **Legacy raw-WebSocket relay stack (~1,900 ln):** NostrRelayManager + NostrWebSocketConnection + NostrProtocolHandler + NostrSubscriptionManager kept alive solely by NostrProfilePublisher (profile edits publish through it, bypassing GlobalNDK). Migrate NostrProfilePublisher to NDK, then delete all four.
7. **LeaderboardBaselineService (404):** live — fetches Season-2 baseline at every startup; also uses nostr-tools. Confirm the daily leaderboard doesn't need it, then remove.

## 4. NOT dead — despite appearances (do not delete)

- **NWCWalletService/NWCStorageService** — captain payouts (EventFinalizationService) + PPQ top-up.
- **Zap chain:** SocialInteractionRow, ZappableUserRow → NWCLightningButton → EnhancedZapModal → useNutzap → PaymentRouter → LightningZapService. Comments claim "DISABLED"/deprecated — the comments lie.
- **NWCGatewayService** — `@deprecated` header lies; live via DonationTrackingService ← ExternalZapModal (RewardsScreen).
- **CoinOSAccountService** — one legacy migration call at startup.
- **AutoJoinService** — dynamic-imported only (static grep miscalls it dead).
- **Music** (WavlakeService, MusicPlayerService, Blossom*, PlaylistBrowser, ExpandedMusicPlayer).
- The Supabase canonical layer: SupabaseCompetitionService, DailyLeaderboardService, Club* services, WorkoutFeedService/SocialFeedService, SupabaseRewardService (+polling), RewardLightningAddressService/RewardDestinationService (zapper inputs).

## 5. Bugs found (fix before v2.0)

1. **Broken navigation (downgraded 2026-07-03):** `AdvancedAnalyticsScreen.tsx:225` navigates to unregistered `FitnessTestResults` — but AdvancedAnalytics itself turned out to be unreachable (see §1 correction), so this is dead-code-in-dead-code, not a live crash. Entry-point remnants removed from WorkoutHistoryScreen/WorkoutTabNavigator.
2. **Cycling duration bug:** `CyclingTrackerScreen` `showWorkoutSummary` (~634–647) saves `elapsedTime` state instead of `session.duration` — same pause/resume divergence WalkingTrackerScreen already fixed (comment at Walking:783).
3. **Duplicate step rows:** three writers submit daily-steps with two different eventId formats (`steps_YYYY-MM-DD_npub12` vs `steps_${npub}_${dateStr}`) → up to two rows/user/day in `workout_submissions`; leaderboard only looks right because buildStepsLeaderboard dedupes by npub/max. Unify scheme + submit function.
4. **Season-2 startup fetch:** LeaderboardBaselineService.fetchBaseline() runs every launch for a finished season.
5. **Silent success semantics:** `workoutPublishingService.saveWorkoutToNostr` returns `success:true` when Supabase submit failed (queued) — acceptable — but out-of-bounds metrics **silently skip submission with no toast/queue** → workout invisibly reward-ineligible.
6. **healthKit vs healthConnect submitter drift:** HealthConnect lacks metric validation; HealthKit lacks flagged-vs-transient failure distinction.
7. **Doc-vs-code:** 1301 auto-post defaults OFF (`NostrPostingPreferencesService.ts:30-40`) while CLAUDE.md/positioning say "publish by default". Flip the default or fix the docs.
8. **Kind-1 shares publish team/charity tags** (createSocialPostTags) — the 1301 allowlist doesn't cover the kind-1 path.
9. **Terminology firewall breaches on live surfaces:** DefaultZapAmountSetting, EnhancedZapModal/ExternalZapModal, RewardEarnedModal ("sats queued"), DynamicEventDetailScreen payout strings, ZapsBottomSheet, NostrPostingSection ("Nostr app"), ContactSupport "Bitcoin & Payments", WalletConfigModal "Bitcoin features", LoginScreen "Amber Nostr". Product decision: v2.0 positioning may deliberately relax some zap surfaces — decide, then sweep.
10. **Zombie stores:** `teamStore` (319 ln, zero consumers, all stubs) delete; `walletStore` (all methods disabled, but live importers incl. AppNavigator's no-op createWallet flow) untangle.
11. **`new NDK()` violation:** WoTService.ts:66 creates its own NDK for the Brainstorm relay (live via Settings/WorkoutSummaryModal). nostr-tools imported in ~16 live files (mostly nip19 utils) incl. a hidden `require('nostr-tools')` at workoutMergeService.ts:811.
12. **Dead feature flags:** `seasons`, `ENABLE_DAILY_REWARDS`, `ENABLE_CHARITY_ZAPS`, `ENABLE_EVENT_TICKETS`, `isFeatureEnabled()` are read by nothing.

## 6. Structural debt (post-v2.0 refactors — do NOT do pre-release)

- **Tracker screens:** Running(1337)/Walking(1335)/Cycling(1101)/Hiking(607) are ~55–65% copy-paste (~2,100–2,400 duplicated lines). Safe pre-2.0: extract leaf hooks (nav guard, profile load, formatElapsedTime ×4 byte-identical, TrackerModals, summary saver) ≈ −1,000 lines. Risky (defer): timer-architecture unification onto SimpleDurationTracker, BaseTrackerScreen.
- **God services:** LocalWorkoutStorageService (1,558 ln / 34 importers / real runtime cycle with AutoBackupService↔BackupService), workoutPublishingService (1,789/14), SupabaseCompetitionService (1,497/15). Split behind facades post-2.0; the "duplication" inside encodes shipped bug fixes (timezone dates, dedup rounding, GPS options) — verbatim moves only, with verify scripts.
- **App.tsx (1,201 ln, 51 imports):** extract `navigation/AuthenticatedNavigator.tsx` (~410) + startup/deep-link/foreground hooks → ~350. Mechanical but highest blast radius; isolated commits + full simulator erase+reinstall.
- **workoutCardGenerator (2,183):** split into per-style templates under `nostr/cards/`; delete fitness-test card (dead consumer) and no-caller batch APIs.
- **~45 duplicate formatter definitions** (formatDuration ×15 with minutes-vs-seconds semantic drift, formatDistance ×11, formatPace ×6 with 3 signatures) → consolidate into utils/workoutFormatters.
- **Leave alone entirely:** SimpleRunTracker's watchdog/auto-recovery/ingest path (highest regression cost in the app), getLeaderboard internals, DynamicEventDetailScreen pay-winners flow.

## 7. Suggested execution order

1. Commit the in-flight walk-mislabel fix (already verified by scripts/verify/verify-walk-mislabel-correction.ts).
2. Bug fixes from §5 (items 1–5 are small and user-visible-risk).
3. Deletion passes from §2, one group per commit, `npm run typecheck` + verify script per pass.
4. Product decisions from §3, then their deletions.
5. Terminology sweep once the product decision on zap surfaces is made.
6. §6 refactors only after v2.0 ships.
