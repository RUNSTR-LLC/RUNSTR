# Post-Workout Flow Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three root-cause bugs that broke Supabase workout submission, PPQ.AI rewards, and Kind 1 Nostr posting after a GPS workout.

**Architecture:** Each fix targets a specific root cause identified during investigation. No band-aids — we fix the actual failure points: (1) unprotected async calls inside `submitWorkoutSimple` body construction, (2) missing relay connection wait before `publish()`, (3) image upload auth signing without timeout protection for Amber users. We also add diagnostic logging to the silent early returns so failures are never invisible again.

**Tech Stack:** React Native, TypeScript, NDK, Supabase Edge Functions

---

### Task 1: Add timeout protection to `getClubLightningAddress()` and `buildRewardTags()`

**Root Cause:** `getClubLightningAddress()` (rewardTags.ts:154-168) calls `UserTeamService.getTeamById()` which makes a Supabase query with NO timeout. This runs INSIDE `JSON.stringify()` body construction at SupabaseCompetitionService.ts:434-435 — BEFORE the 10s AbortController timeout starts. If this query hangs, the entire submission hangs forever.

**Files:**
- Modify: `src/utils/rewardTags.ts:154-168`
- Modify: `src/utils/rewardTags.ts:31-137` (buildRewardTags)

**Step 1: Add timeout to `getClubLightningAddress()`**

In `src/utils/rewardTags.ts`, wrap the `UserTeamService.getTeamById()` call with a 5-second timeout:

```typescript
// rewardTags.ts:154-168 — REPLACE getClubLightningAddress()
export async function getClubLightningAddress(): Promise<string | null> {
  const clubId = await AsyncStorage.getItem('@runstr:club_id');
  if (!clubId) return null;

  if (!isSupabaseConfigured()) return null;

  try {
    // 5s timeout prevents hanging the entire workout submission
    const team = await Promise.race([
      UserTeamService.getTeamById(clubId),
      new Promise<null>((resolve) => setTimeout(() => {
        console.warn(`[getClubLightningAddress] Timed out fetching club ${clubId}`);
        resolve(null);
      }, 5000)),
    ]);
    return team?.lightning_address || null;
  } catch (err) {
    console.warn('[getClubLightningAddress] Failed to fetch club:', err);
    return null;
  }
}
```

**Step 2: Add timeout to `buildRewardTags()` community team fetch**

In `src/utils/rewardTags.ts`, wrap the `UserTeamService.getTeamById()` call at line 59 with the same pattern:

```typescript
// rewardTags.ts:57-63 — REPLACE the try block
    if (isSupabaseConfigured()) {
      try {
        team = await Promise.race([
          UserTeamService.getTeamById(uuid),
          new Promise<null>((resolve) => setTimeout(() => {
            console.warn(`[buildRewardTags] Timed out fetching community team '${uuid}'`);
            resolve(null);
          }, 5000)),
        ]);
      } catch (err) {
        console.warn(`[buildRewardTags] Failed to fetch community team '${uuid}':`, err);
      }
    }
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```
Fix: Add 5s timeout to club/team Supabase queries in reward tag building
```

---

### Task 2: Add diagnostic logging to silent early returns in `autoSubmitToSupabase()`

**Root Cause:** Three silent `return` statements at LocalWorkoutStorageService.ts:607-611 drop workouts with zero logging. Impossible to diagnose failures after the fact.

**Files:**
- Modify: `src/services/fitness/LocalWorkoutStorageService.ts:605-612`

**Step 1: Replace silent returns with logged returns**

```typescript
// LocalWorkoutStorageService.ts:605-612 — REPLACE the guards
private async autoSubmitToSupabase(workout: LocalWorkout): Promise<void> {
  const CARDIO_TYPES: string[] = ['running', 'walking', 'cycling', 'hiking'];
  if (!CARDIO_TYPES.includes(workout.type)) {
    console.log(`[LocalWorkoutStorage] Skipping Supabase submit: type '${workout.type}' is not cardio`);
    return;
  }
  if (!workout.distance || workout.distance <= 0) {
    console.warn(`[LocalWorkoutStorage] Skipping Supabase submit: distance is ${workout.distance} for ${workout.type} workout ${workout.id}`);
    return;
  }

  const npub = await AsyncStorage.getItem('@runstr:npub');
  if (!npub) {
    console.warn('[LocalWorkoutStorage] Skipping Supabase submit: no npub in AsyncStorage');
    return;
  }
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
Fix: Add diagnostic logging to silent early returns in autoSubmitToSupabase
```

---

### Task 3: Move async calls out of `JSON.stringify()` body in `submitWorkoutSimple()`

**Root Cause:** Lines 434-435 of SupabaseCompetitionService.ts have `await` calls INSIDE `JSON.stringify()` which execute BEFORE the AbortController timeout at line 400 can protect them. These calls are not covered by any timeout.

**Files:**
- Modify: `src/services/backend/SupabaseCompetitionService.ts:398-448`

**Step 1: Hoist async calls before the fetch and wrap with timeout**

Move the `club_id` and `club_lightning_address` lookups to before the `AbortController`, and wrap them with a 5s timeout:

```typescript
// SupabaseCompetitionService.ts — BEFORE line 398 (before AbortController), add:
    // Resolve club data BEFORE starting the fetch timeout
    // These were previously inside JSON.stringify body where they bypassed the AbortController
    let clubId: string | null = null;
    let clubLightningAddress: string | null = null;
    try {
      clubId = await AsyncStorage.getItem('@runstr:club_id') || null;
      clubLightningAddress = await getClubLightningAddress();
    } catch (clubErr) {
      console.warn('[SupabaseCompetitionService] Club data lookup failed (non-blocking):', clubErr);
    }

    // CRASH FIX: Add timeout to prevent indefinite hang on network issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
```

Then in the JSON body, replace lines 434-435 with the pre-resolved values:

```typescript
            // Club association (separate from charity/team)
            club_id: clubId,
            club_lightning_address: clubLightningAddress,
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
Fix: Hoist async club lookups out of JSON.stringify body in submitWorkoutSimple
```

---

### Task 4: Restore `waitForMinimumConnection()` before `ndkEvent.publish()` and check relay count

**Root Cause:** `waitForMinimumConnection()` was removed in commit 3f84367 (Oct 2025). `GlobalNDKService.getInstance()` returns immediately with 0 connected relays (connection deferred via setTimeout). `ndkEvent.publish()` fires against 0 relays and silently "succeeds." The method exists on GlobalNDKService but is never called in the social post flow.

**Files:**
- Modify: `src/services/nostr/workoutPublishingService.ts:560-575`

**Step 1: Add relay wait and publish result check**

Replace lines 560-575 with:

```typescript
      // Sign and publish WITH TIMEOUT PROTECTION
      // Use longer timeout for Amber (external signer needs user approval)
      const isAmberSigner = signer.constructor.name === 'AmberNDKSigner' ||
                            (signer as any).AMBER_TIMEOUT_MS !== undefined;
      const signTimeout = isAmberSigner ? NOSTR_TIMEOUTS.SIGN_AMBER : NOSTR_TIMEOUTS.SIGN;

      await withTimeout(
        ndkEvent.sign(signer),
        signTimeout,
        'Social post signing'
      );

      // Ensure at least 1 relay is connected before publishing
      // This was removed in commit 3f84367 and caused silent zero-relay publishes
      const relaysReady = await GlobalNDKService.waitForMinimumConnection(1, 5000);
      if (!relaysReady) {
        console.warn('[WorkoutPublishing] No relays connected — attempting publish anyway');
      }

      const publishResult = await withTimeout(
        ndkEvent.publish(),
        NOSTR_TIMEOUTS.PUBLISH,
        'Social post publishing'
      );

      // Check that at least one relay accepted the event
      const relayCount = publishResult?.size ?? 0;
      if (relayCount === 0) {
        throw new Error('Published to 0 relays — no relay connections available');
      }
      console.log(`📡 Published to ${relayCount} relay(s)`);
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
Fix: Restore waitForMinimumConnection before publish and check relay count
```

---

### Task 5: Add timeout protection to NIP-98/Blossom auth signing in ImageUploadService

**Root Cause:** `ImageUploadService` calls `authEvent.sign(signer)` (lines 265, 299) with no timeout wrapper. For Amber users, each sign launches an intent to the Amber app with a 60s internal timeout. The image upload itself has a 15s AbortController, but signing happens BEFORE the upload fetch — so the 15s timer ticks down during signing. Additionally, `Promise.any()` races 3 hosts, each needing a separate Amber approval prompt, creating competing Amber dialogs.

**Files:**
- Modify: `src/services/media/ImageUploadService.ts:247-310`
- Modify: `src/services/media/ImageUploadService.ts:60-65`

**Step 1: Import withTimeout**

Add to top of `ImageUploadService.ts`:

```typescript
import { withTimeout } from '../../utils/nostrTimeout';
```

**Step 2: Wrap auth event signing with timeout**

In `createNIP98AuthEvent()` (line 265), wrap sign with 15s timeout:

```typescript
    // Timeout protects against Amber signer hangs (60s internal timeout)
    await withTimeout(
      authEvent.sign(signer),
      15000,
      'NIP-98 auth signing'
    );
```

In `createBlossomAuthEvent()` (line 299), same pattern:

```typescript
    await withTimeout(
      authEvent.sign(signer),
      15000,
      'Blossom auth signing'
    );
```

**Step 3: Serialize image uploads for Amber signers**

In `uploadImage()` (lines 60-65), detect Amber signer and serialize uploads instead of racing them. For non-Amber signers, keep the existing race. Replace:

```typescript
    console.log('🏁 Racing image upload to multiple hosts...');

    // Detect Amber signer — Amber can only process one signing dialog at a time
    // Racing 3 hosts creates 3 competing Amber prompts, causing timeouts
    const isAmberSigner = (signer as any)?.AMBER_TIMEOUT_MS !== undefined;

    if (isAmberSigner) {
      // Serialize: try hosts one at a time to avoid competing Amber dialogs
      console.log('🔐 Amber signer detected — serializing uploads to avoid competing prompts');
      const hosts = [
        () => this.uploadToNostrBuild(imageUri, filename, signer!),
        ...BLOSSOM_SERVERS.map((server) =>
          () => this.uploadToBlossom(server, imageUri, filename, signer!)
        ),
      ];
      for (const tryHost of hosts) {
        try {
          const result = await tryHost();
          if (result.success) {
            console.log(`✅ Upload succeeded via: ${result.host}`);
            return result;
          }
        } catch (err) {
          console.warn('⚠️ Host failed, trying next...', err instanceof Error ? err.message : err);
        }
      }
      return { success: false, error: 'All image hosts failed — please try again' };
    }

    // Non-Amber: race all hosts in parallel (fastest wins)
    const uploadPromises: Promise<ImageUploadResult>[] = [
      this.uploadToNostrBuild(imageUri, filename, signer!),
      ...BLOSSOM_SERVERS.map((server) =>
        this.uploadToBlossom(server, imageUri, filename, signer!)
      ),
    ];

    try {
      const result = await Promise.any(uploadPromises);
      console.log(`✅ Upload won by: ${result.host}`);
      return result;
    } catch (aggregateError) {
      console.error('❌ All image hosts failed:', aggregateError);
      return {
        success: false,
        error: 'All image hosts failed - please try again',
      };
    }
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```
Fix: Add timeout to image upload auth signing and serialize for Amber signers
```

---

### Task 6: Verify all fixes with typecheck

**Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors

**Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors

**Step 3: Final commit if any adjustments needed**

---

## Summary of Changes

| File | Change | Root Cause Fixed |
|------|--------|------------------|
| `src/utils/rewardTags.ts` | 5s timeout on `getClubLightningAddress()` and community team fetch | Supabase query hang blocking submission |
| `src/services/fitness/LocalWorkoutStorageService.ts` | Diagnostic logging on silent early returns | Invisible submission failures |
| `src/services/backend/SupabaseCompetitionService.ts` | Hoist async calls out of JSON.stringify body | Async calls bypassing AbortController timeout |
| `src/services/nostr/workoutPublishingService.ts` | Restore `waitForMinimumConnection()` + check relay count | Silent zero-relay publish |
| `src/services/media/ImageUploadService.ts` | Timeout on auth signing + serialize for Amber | Competing Amber prompts + unprotected signing |
