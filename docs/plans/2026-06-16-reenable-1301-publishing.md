# Plan: Re-enable Publishing Workouts as Kind 1301 to Nostr

**Date:** 2026-06-16
**Status:** Phase 1 (1a + 1b) COMPLETE — pending commit

## Implementation status (2026-06-17)
**Phase 1a — core publish (done + verified):**
- ✅ `publishWorkout1301()` in `workoutPublishingService.ts` (workout-only, strips lightning/reward_destination/wot_score/charity/challenge/club, keeps `client:RUNSTR`, non-blocking, signer-gated).
- ✅ Verified against live relays via `scripts/verify/verify-1301-publish.ts` (publish + round-trip + format + no-leak all pass).

**Phase 1b — UX wiring (done, typecheck clean):**
- ✅ `NostrPostingPreferencesService` — auto-post toggle (default **off**) + format pref (default **kind1**).
- ✅ `postWorkout()` orchestration in the service: format-aware (kind1 → `postWorkoutToSocial`; kind1301 → `publishWorkout1301` + `dualWriteWorkoutFeed`).
- ✅ `dualWriteWorkoutFeed()` — inserts a fitness-hashtag `social_feed` row (no image); the in-app feed renders the native `WorkoutPostCard` from Supabase data via `useMatchedWorkout`.
- ✅ `WorkoutSummaryModal`: manual Post handler honors the format; new **auto-post effect** (independent of auto-compete, non-blocking, signer-gated).
- ✅ `WorkoutHistoryScreen`: manual Post handler honors the format.
- ✅ `NostrPostingSection` settings UI ("Sharing" accordion) wired into `SettingsScreen`.

**Decisions locked:** auto-post default off, format default kind1; **no** `sync-nostr-workouts` edit (backend doesn't reward 1301; `source='app'` filter protects rewards; Supabase save is always-on via `LocalWorkoutStorageService.saveGPSWorkout`).

**Note:** Background HealthKit/Health Connect auto-submits stay Supabase-only (no signer/UI). Auto-post fires from the foreground summary path only.
**Owner decision required on the 3 open questions in §7 before implementation.**

## 1. Goal

Resume publishing completed workouts as Nostr **kind 1301** events to relays, so RUNSTR workouts are visible to the wider Nostr fitness ecosystem (and re-importable). This reverses the current "Supabase-only" stance for 1301 — but **additively and safely**, without reintroducing the lost-workout bug that caused publishing to be removed.

## 1b. CRITICAL backend context (verified 2026-06-16) — the duplication trap

The backend was **originally designed to ingest kind 1301 from Nostr**:
- `supabase/functions/sync-nostr-workouts/index.ts` (cron, every 2 min) queries relays for **kind 1301** events from `competition_participants` and inserts them into `workout_submissions` (`source:'nostr_scan'`). Dedup is by **`event_id` (Nostr event hash), `UNIQUE` on the table** (migration 103).
- Intended pipe: app publishes 1301 → `sync-nostr-workouts` ingests → app reads Supabase → zapper pays from Supabase.
- When 1301 publishing was removed (`208e1725`), the app switched to **direct Supabase submit** (`submitWorkoutSimple`), writing a *synthetic* `event_id`. `sync-nostr-workouts` still runs but the app no longer feeds it.

**The in-app feed is separate:** `SocialFeedService.fetchFeed()` reads the Supabase **`social_feed`** table, populated by `index-social-feed` (cron) scraping **kind 1** fitness-hashtag posts off relays + RUNSTR users' own kind-1 dual-writes. This is why kind 1 is in the feed and 1301 is nowhere.

**THE TRAP:** if we re-enable 1301 publishing while keeping direct submit, the published 1301 has a *real* event hash ≠ the synthetic `event_id` of the direct-submit row, so `sync-nostr-workouts` ingests it as a **duplicate `workout_submissions` row** → duplicate history/leaderboard entry → **possible double reward** for competition participants. This is the primary "messes up histories" risk and MUST be neutralized (see §4.5).

## 2. Current state (verified)

- **Format/builder: intact and correct.** `createNIP101eWorkoutTags()` (`src/services/nostr/workoutPublishingService.ts:704`) produces a spec-correct 1301 tag array (lowercase verbs, `['distance','5.20','km']`, HH:MM:SS). Called on every save today — but only to feed Supabase.
- **Content builder: present but unused.** `generateWorkoutDescription()` (`:1106`) — was the 1301 `content` body; currently called by nothing.
- **Publishing: deleted, not flagged.** `saveWorkoutToNostr()` (`:140`) still *named* like it publishes and logs `"Publishing workout … as kind 1301 event"` (`:147`), but contains **no `NDKEvent` and no `.publish()`** — it writes to Supabase via `SupabaseCompetitionService.submitWorkoutSimple()` (`:277`). Signing + publish were removed across commits, last being `208e1725` (2026-02-22, *"Remove NDK signing from workout submission – prevents lost workouts"*).
- **Reading 1301 from relays: fully live.** `Nuclear1301Service`, `Competition1301QueryService`, `Nostr1301ImportService` all subscribe to `kinds:[1301]` via `GlobalNDKService`. The relay infra, filters, and parsing are proven — **only the write side is gone.**
- **The signer already reaches the publish function.** Both live callers (`WorkoutSummaryModal.tsx:293`, `WalkingTrackerScreen.tsx`) fetch a signer via `UnifiedSigningService.getInstance().getSigner()` and pass it into `saveWorkoutToNostr` — which currently ignores it.

## 3. Why it was removed (the constraint we must honor)

Publishing was synchronous and could block/fail the workout save, losing workouts when relays were slow or the signer wasn't ready. **Supabase must remain the single source of truth.** The 1301 publish must be:
1. **Additive** — happens *after* the Supabase write succeeds.
2. **Non-blocking** — fire-and-forget; never awaited before returning success; failure never surfaces as a save failure.
3. **Signer-gated** — skipped entirely when no signer is available.

## 4. Design

### 4.1 New method (don't overload `saveWorkoutToNostr`)
Add `private async publishWorkout1301(workout, signer, npub): Promise<string | null>` to `WorkoutPublishingService`. It mirrors the publish pattern already proven in `postWorkoutToSocial` (`:554-600`):
- `const ndkEvent = new NDKEvent(ndk)`
- `ndkEvent.kind = 1301`
- `ndkEvent.created_at = Math.floor(new Date(workout.startTime).getTime() / 1000)`
- `ndkEvent.tags = await this.createNIP101eWorkoutTags(workout, ...)` — **reused, with sensitive tags stripped (see §7 Q1)**
- `ndkEvent.content = this.generateWorkoutDescription(workout)` — rewire the existing builder (plain text, per spec)
- Amber-aware sign with `NOSTR_TIMEOUTS.SIGN_AMBER` timeout (detection pattern at `:572-574`)
- `await GlobalNDKService.waitForMinimumConnection(1, …)` then `ndkEvent.publish()` with `withTimeout`
- Returns the event id on success, `null` on any failure (never throws).

### 4.2 Call site
Inside `saveWorkoutToNostr`, **after** `submitWorkoutSimple()` resolves successfully:
```
if (signer) {
  this.publishWorkout1301(workout, signer, npub)
    .then(eventId => { if (eventId) LocalWorkoutStorageService.markAsSynced(workout.id, eventId); })
    .catch(() => {/* swallow — Supabase is source of truth */});
}
```
Fire-and-forget. No `await`. Supabase path is unchanged.

### 4.3 Dedupe / idempotency
- `d` tag = `workout.id` → kind 1301 is addressable/replaceable, so re-publishing replaces rather than duplicates.
- **Before** publishing, check `workout.nostrEventId` (already tracked by `LocalWorkoutStorageService` / `WorkoutStatusTracker`). If set, skip — prevents re-publish every time `WorkoutSummaryModal` reopens.

### 4.4 Scope (v1)
Publish only where a signer is present in the foreground save path (GPS trackers + the Walking daily-steps path). **Background HealthKit/Health Connect auto-submit stays Supabase-only** (no signer/UI in background). A later phase can add a "publish my synced workouts" action.

### 4.5 Duplication guard (REQUIRED — neutralizes the §1b trap)
Direct Supabase submit remains the **source of truth**; the 1301 publish is purely for relay/Amethyst visibility. To stop `sync-nostr-workouts` from re-ingesting our own 1301 as a duplicate `workout_submissions` row:
- Tag every RUNSTR-published 1301 with `["client","RUNSTR"]`.
- **Modify `supabase/functions/sync-nostr-workouts/index.ts` to skip events carrying `client:RUNSTR`** — those workouts are already in the DB via direct submit. Non-RUNSTR 1301s (Amethyst/other apps) continue to be ingested as before.
- This is the make-or-break change: without it, enabling publishing duplicates histories and can double-pay rewards.

Anonymous/keyless users: unaffected — they never publish 1301 (signer-gated) and their workouts still reach Supabase via direct submit.

## 4b. Revised architecture (two phases)

**Phase 1 — posting works, histories safe:**
1. Direct Supabase submit unchanged (source of truth; anonymous users keep working).
2. Settings toggle "Auto-publish workouts to Nostr (kind 1301)".
3. Toggle on → publish workout-only 1301 (no lightning, `client:RUNSTR`), non-blocking, signer-gated, after the Supabase write.
4. `sync-nostr-workouts` skips `client:RUNSTR` events (§4.5).
5. Remove automatic kind 1 from the save flow.

**Phase 2 — the feed:**
6. Make the workout appear in the in-app feed: dual-write a workout row to `social_feed` on publish (instant, relay-independent). Amethyst renders the 1301 natively; non-Amethyst clients show nothing (those users see it in-app).
7. Keep manual kind 1 posting available **only from workout history** for all-client visibility.

## 5. Files touched

| File | Change |
|------|--------|
| `src/services/nostr/workoutPublishingService.ts` | Add `publishWorkout1301()`; call it (non-blocking) in `saveWorkoutToNostr`; rewire `generateWorkoutDescription()`; strip sensitive tags for the public event |
| `src/services/fitness/LocalWorkoutStorageService.ts` | Confirm/extend `markAsSynced(id, eventId)` stores `nostrEventId` (likely already exists) |
| `CLAUDE.md` | Update the kind 1301 row (no longer "Local only — NEVER published") |
| `docs/KIND_1301_SPEC.md` | Note publishing is live again; document which tags are public |
| `workoutPublishingService.ts` header (`:1-13`) | Update the "Nostr publishing removed" comment so the next reader doesn't re-delete it as vestigial |

Estimated ~30–50 lines of real logic + doc updates.

## 6. Verification

1. `npm run typecheck`.
2. `scripts/verify/verify-1301-publish-format.ts` — build the event from a sample workout, assert tag shapes against `KIND_1301_SPEC.md` (kind=1301, lowercase verb, distance triple, HH:MM:SS duration, plain-text content, no sensitive tags).
3. On device: complete a GPS run → confirm Supabase submit still succeeds → query a relay (`relay.damus.io`) for the user's pubkey kind 1301 and confirm the event arrives with correct tags.
4. Anonymous (keyless) user: complete a run → Supabase submit succeeds, **no publish attempted**, no error.
5. Re-open the summary for an already-published workout → no duplicate publish.

## 7. Decisions (confirmed 2026-06-16)

**Q1 — Privacy: which tags go in the public event? → CONFIRMED: strip sensitive tags.**
Publish **workout data only**. Strip `lightning` (the user's lightning address), `reward_destination`, and `wot_score` from the public 1301. Those are read by the zapper from *Supabase*, never from Nostr, so they are not needed on relays — and publishing the lightning address publicly contradicts the app's privacy direction.

**Q2 — Automatic vs. user-controlled? → CONFIRMED: Settings toggle.**
Add an **"Auto-publish workouts to Nostr (kind 1301)" toggle in Settings**. When on, foreground saves publish a 1301 (subject to §7.1 mutual-exclusivity). Default value TBD (recommend **off** initially so existing users aren't surprised; revisit).

**Q3 — Scope:** v1 = foreground GPS + daily-steps saves only (signer present). Synced HealthKit/Health Connect background auto-submits stay Supabase-only.

### 7.1 Double-post handling (kind 1 vs kind 1301)
Amethyst now renders kind 1301 events socially in the timeline. RUNSTR also publishes kind 1 (the branded "Share" card). To avoid a user seeing **two** cards for one workout, enforce **one workout → one post per surface**:
- User taps **Share** (kind 1 card) → **skip** auto-1301 for that workout.
- User does **not** share + toggle **on** → publish **1301 only**.
- Toggle **off** → current behavior (kind 1 only, on explicit share).
Track per-workout whether it was socially shared (kind 1) so auto-1301 skips it. Long-term option (not v1): make the kind 1 *quote/reference* the 1301 (`q`/naddr) so 1301 is the canonical object and smart clients collapse them.

### 7.2 Attribution
Add a `["client", "RUNSTR"]` tag (NIP-89) to every published 1301 so it's credited to RUNSTR when rendered in Amethyst and other clients — free discovery/top-of-funnel.

## 7b. Strategy: how 1301 gets *used* (beyond publishing)

Publishing alone writes into the void. The value is closing the loop. Ranked roadmap (separate features, not part of this publish PR):
1. **Inbound Nostr-wide workout feed** in RUNSTR (read others' 1301 via the live `Nuclear1301Service`). Highest leverage — creates the publish→appear-in-feeds flywheel, zero backend cost.
2. **Open/global leaderboards & events** sourced from 1301 across the whole network, extending the Events pillar beyond Supabase users.
3. **Portable history / cross-app backup** (already have `Nostr1301ImportService`); also the interop layer for future HealthNote Labs apps.
4. **Discovery/growth** via the `client` tag attribution (see §7.2).

**Direction:** ship publishing (mutual-exclusivity + `client` tag) now; make #1 the next feature.

## 8. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Reintroduce lost-workout bug | Publish is strictly after Supabase write, non-blocking, never throws into the save path |
| Duplicate events on modal reopen | `d`=workout.id (replaceable) + skip when `nostrEventId` already set |
| Leak user lightning address publicly | Strip sensitive tags (Q1) |
| Keyless anonymous users error | Signer-gated; skip publish, Supabase-only |
| Amber round-trip hangs UI | Fire-and-forget with `SIGN_AMBER` timeout; never blocks save or UI |
| Next dev re-deletes as "vestigial" | Update file header + CLAUDE.md + spec |

## 9. Rollback
Single guarded call site. If issues arise, remove the `if (signer) this.publishWorkout1301(...)` block — Supabase path is untouched, so workouts keep saving normally.
