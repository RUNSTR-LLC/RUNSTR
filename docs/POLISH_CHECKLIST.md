# RUNSTR Polish & Stability Checklist

A reusable rubric for "is this app finished and trustworthy to a real user?" Run it before every release. It captures the things that make an app feel **stable, honest, and complete** — separate from feature work.

**How to use:** walk each section, mark every item, and turn every ⚠️/❌ into either a fix or a logged issue. The "RUNSTR status" notes are a point-in-time snapshot (as of v1.9.9, 2026-06-27) — re-verify against current code, don't trust them blindly.

**Legend:** ✅ solid · ⚠️ partial / known gap · ❌ missing · — not applicable

---

## 1. Stability & crash safety
The app should never white-screen, and one screen's failure should never take down the rest.

- [ ] Each tab/stacked screen is wrapped in its own error boundary (a render crash degrades one surface, not the whole app) — ⚠️ `ScreenErrorBoundary` exists (`App.tsx:130`) but only the GPS tracker uses it; everything else relies on the single root boundary.
- [ ] No unhandled promise rejections on startup — ✅ cold start is fully try/caught; render never blocks on NDK.
- [ ] External data (Nostr/Supabase rows) is null-guarded before render — ⚠️ mostly; feed keys hardened in 1.9.9, spot-check new surfaces.
- [ ] App survives relay/network unavailability without a blank screen — ✅ render never waits on relays.
- [ ] Listeners / subscriptions / intervals are torn down (no leaks) — ⚠️ iOS HealthKit module-load observer can't be removed (mitigated by a pref guard in 1.9.9).
- [ ] No re-entrancy on session-critical operations (stop, save, submit) — ⚠️ `stopTracking` is re-entrant on double-tap (documented).

## 2. Data integrity
Never lose, duplicate, or mis-stamp a user's data.

- [ ] No data loss across backgrounding, JS reload, or crash — ⚠️ an in-progress GPS session can be lost if iOS evicts the JS context mid-run (`App.tsx:1090` zombie cleanup; documented, not yet fixed).
- [ ] Writes are idempotent / no double-submit — ✅ server time-overlap + `event_id` dedup; ⚠️ `stopTracking` re-entrancy can double-save locally.
- [ ] Timestamps and timezones are correct (workout day, leaderboard day, post day) — ⚠️ `leaderboard_date` uses submission time not workout time; posted workout can show wrong day (issue #429).
- [ ] Cache invalidation is correct (no stale reads after a write) — ✅ cache-first with explicit invalidation.
- [ ] Money/reward surfaces show confirmed truth, never optimistic guesses — ✅ as of 1.9.9 (reward toast reads `reward_payments`; premature banner removed).

## 3. Performance
No jank, fast start, no wasted work.

- [ ] Long lists are virtualized; no unbounded `.map` of heavy rows — ⚠️ workout history renders a whole month's cards un-virtualized.
- [ ] Cold start does no heavy work on the critical path — ✅.
- [ ] No expensive work per render (queries, `console.log`, recompute) — ⚠️ `StatsCard` fires ~11 queries on mount/refresh (and hits a dead table); some per-render logs remain.
- [ ] Remote images are cached (e.g. FastImage) — ⚠️ feed/avatars use stock `<Image>`.
- [ ] Aggressive caching eliminates avoidable loading states — ✅ cache-first throughout.

## 4. Loading / empty / error states
Every async surface needs all three, and they must be distinguishable.

- [ ] Every data screen shows a loading state before first data — ⚠️ Rewards screen pops content in with no skeleton.
- [ ] Empty lists show a friendly "nothing here yet," not a blank area — ⚠️ events area is blank when empty; club events have no member-facing empty state.
- [ ] **Failure is distinct from empty**, with a retry affordance — ❌ Social feed, Leaderboards/events, and Club chat all collapse a fetch failure into the empty state ("be the first / say hello") with no retry cue. **Highest perceived-stability gap.**
- [ ] No flash-of-wrong-content on mount — ⚠️ minor flashes (rewards team picker, profile earnings badge, chat name fallback).

## 5. Navigation
Every route resolves; no dead-ends.

- [ ] Every `navigate('X')` target is registered in the live navigator — ⚠️ `FitnessTestResults` navigate may hit an unregistered route (verify reachability — memory flags `AdvancedAnalyticsScreen` as dead); reward-notification tap targets a mis-nested `Rewards` route and silently no-ops.
- [ ] Sensible back behavior; no trapped screens — ✅ `canGoBack() ? goBack() : Home` fallback.
- [ ] Deep links and notification taps land on the right screen — ⚠️ reward-earned tap (see above).

## 6. Async interactions
Buttons and gestures behave under fast taps and failures.

- [ ] Action buttons are disabled / guarded while in-flight (no double-submit) — ⚠️ club join double-tap gap; chat moderation buttons unguarded. ✅ send button, like/zap are the model pattern.
- [ ] Failures give the user feedback, never silent — ❌ chat send/moderation failures are silent.
- [ ] Optimistic updates reconcile (revert) on failure — ⚠️ a failed `recordZap` leaves the count inflated.

## 7. Visual consistency & brand
Looks intentional and on-brand on every screen.

- [ ] Strict palette (RUNSTR: black/orange), no off-brand colors on reachable screens — ✅.
- [ ] Consistent spacing, typography, and header alignment across tabs — ✅ (tab header alignment fixed).
- [ ] Restrained feedback (no emoji spam, no confetti); celebrations subtle — ✅.
- [ ] Notification/reward copy is truthful (no premature "earned/sent") — ✅ as of 1.9.9.

## 8. Onboarding & first run
A brand-new user lands somewhere sensible and isn't set up to lose access.

- [ ] New user lands on a usable screen — ✅ Dashboard.
- [ ] Account/key (password) backup is surfaced before it can be lost — ❌ new "Start" users are never prompted to back up their generated key; reinstall = unrecoverable. **High-value safety gap.**
- [ ] The reward destination (lightning address) is discoverable and editable — ✅ full chain verified.
- [ ] Login handles bad/edge input gracefully — ⚠️ valid-nsec login hard-fails if the profile can't be fetched (relay timeout / no kind-0). **Real lockout bug.**

## 9. Offline & network resilience
Works on a flaky connection; recovers cleanly.

- [ ] Graceful offline with queue + retry — ✅ `PendingSubmissionService`.
- [ ] Reconnection without hang or crash — ✅ NDK backoff + circuit breaker.
- [ ] No infinite spinners on failure (timeouts everywhere) — ⚠️ a few screens can strand a spinner on a child early-return.

## 10. Background & lifecycle
Survives backgrounding, resume, and OS reaping.

- [ ] Background sync works **and can be fully disabled** — ✅ as of 1.9.9 (off-means-off guard + wider iOS catch-up window).
- [ ] In-progress sessions survive backgrounding / resume / eviction — ⚠️ GPS session loss on JS eviction (documented; recovery only within a 15-min window).
- [ ] Background tasks don't double-run or leak — ✅ sync mutex; ⚠️ observer listener (see §1).

## 11. Permissions
Requested with context; denial handled.

- [ ] Permissions requested at a sensible moment, with rationale — ✅.
- [ ] Denial is a graceful no-op, never a crash or retry-loop — ✅ (location, HealthKit, notifications).

## 12. Content correctness
The numbers and words are right.

- [ ] Units consistent and correct (mi/km, pace vs speed) — ✅.
- [ ] Dates reflect the actual event, in local time — ⚠️ post wrong-day (issue #429); leaderboard day (§2).
- [ ] No nonsensical values on edge data — ⚠️ pace can render absurdly on a near-zero-distance GPS glitch.
- [ ] Copy is consistent for the target audience — ✅ (leaning into Nostr/Bitcoin-native language by design).

## 13. Accessibility
Usable by more people.

- [ ] Tap targets ≥ ~44pt / generous hitSlop — ⚠️ partial.
- [ ] Sufficient contrast — ✅ (orange on black).
- [ ] Dynamic type / screen-reader labels on key controls — ❌ not yet audited.

## 14. Release hygiene
The build is clean and traceable.

- [ ] Version synced across `package.json`, `app.json`, `Info.plist`, `build.gradle` — ✅ (1.9.9 / 199).
- [ ] Changelog updated with user-facing notes — ✅.
- [ ] No dead code or debug artifacts shipped — ⚠️ orphaned `RewardBoltToast.tsx`; some `console.log` spam.
- [ ] `npm run typecheck` clean — ✅.
- [ ] Patches re-applied after install (`npx patch-package`) and pods installed — ⚠️ manual step, easy to forget (no postinstall hook).

---

### Scoring snapshot (v1.9.9)
Strongest areas: offline resilience, permissions, brand consistency, reward honesty, release hygiene.
Weakest areas (best polish ROI next): **§4 failure-vs-empty states**, **§1 per-screen error boundaries**, **§8 onboarding key-backup + nsec login lockout**, **§2 timestamp correctness**, **§10 GPS session survival** (high value but high risk — needs real-device verification).
