# Workout Submission & Event Display Fixes - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 bugs: resilient workout submission (remove NDK signing), event timezone, participant profiles, and PPQ.AI verification.

**Architecture:** Remove NDK event signing from the workout->Supabase path since Nostr publishing is no longer used. Fix UTC date comparison for event end times. Pass profile data when joining competitions and submitting workouts. Create PPQ.AI end-to-end test script.

**Tech Stack:** React Native/TypeScript, Supabase Edge Functions, NDK, PPQ.AI API, Alby MCP

---

### Task 1: Remove NDK signing from workout submission flow

**Files:**
- Modify: `src/services/nostr/workoutPublishingService.ts:138-470`

**Context:** The `saveWorkoutToNostr` method currently creates an NDKEvent, signs it (lines 255-295), then submits to Supabase. Since we no longer publish to Nostr relays (confirmed line 425: "Nostr publishing has been removed"), the signing is vestigial and a failure point. If signing fails, Supabase submission is never reached and the workout is lost.

**Step 1: Refactor `saveWorkoutToNostr` to skip NDK event creation and signing**

Replace lines 148-295 (NDK initialization, signer setup, event creation, signing) with direct pubkey retrieval and tag building. The key changes:

1. Remove `GlobalNDKService.getInstance()` call (no longer needed for submission)
2. Get pubkey directly from AsyncStorage instead of through signer
3. Build tags using the existing `createNIP101eWorkoutTags` method (it doesn't need NDK)
4. Use `workout.id` as the event ID (no need for signed event hash)
5. Remove signing timeout, signing try/catch, and related imports

```typescript
// BEFORE (lines 148-295):
const ndk = await GlobalNDKService.getInstance();
// ... 140 lines of signer setup, NDK event creation, signing ...
// If any of this fails, Supabase submission never runs

// AFTER:
// Get pubkey directly from stored value (no signer needed)
let pubkey: string;
const storedPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
if (!storedPubkey) {
  throw new Error('No authentication found. Please log in again.');
}
pubkey = storedPubkey;

// ... keep team/charity lookup (lines 184-253) unchanged ...

// Build tags directly (createNIP101eWorkoutTags doesn't need NDK)
const tags = await this.createNIP101eWorkoutTags(
  workout, pubkey, selectedCharity,
  effectiveLightningAddress, rewardDestination
);
const content = this.generateWorkoutDescription(workout);
const createdAt = Math.floor(new Date(workout.startTime).getTime() / 1000);

// Go straight to Supabase submission (line 297+)
// Use workout.id as eventId
```

**Step 2: Update the Supabase submission to use workout.id**

At line 328, change:
```typescript
// BEFORE:
eventId: ndkEvent.id || workout.id,
// AFTER:
eventId: workout.id,
```

At line 335, change:
```typescript
// BEFORE:
tags: ndkEvent.tags,
// AFTER:
tags: tags,
```

**Step 3: Update the pending submission queue entries** (lines 358-411)

Replace `ndkEvent.id` references with `workout.id` and `ndkEvent.tags` with `tags`.

**Step 4: Update return value** (line 468)

```typescript
// BEFORE:
eventId: ndkEvent.id,
// AFTER:
eventId: workout.id,
```

**Step 5: Clean up unused imports**

Remove or reduce imports that are only needed for NDK event creation:
- `GlobalNDKService` (still needed by `postWorkoutToSocial`)
- `NDKEvent` (still needed by `postWorkoutToSocial`)
- `NDKPrivateKeySigner` (still needed by `postWorkoutToSocial`)
- `withTimeout`, `NOSTR_TIMEOUTS` (still needed by `postWorkoutToSocial`)

Keep all imports that `postWorkoutToSocial` still uses. Only remove if truly unused.

**Step 6: Update method signature**

The `privateKeyHexOrSigner` parameter is no longer needed for `saveWorkoutToNostr` since we don't sign. But changing the signature would break callers. Instead, keep the parameter but ignore it:

```typescript
// Keep the signature the same to avoid breaking callers
async saveWorkoutToNostr(
  workout: PublishableWorkout,
  privateKeyHexOrSigner: string | NDKSigner, // No longer used for signing
  userId: string
): Promise<WorkoutPublishResult> {
```

**Step 7: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS (no type errors)

**Step 8: Commit**

```bash
git add src/services/nostr/workoutPublishingService.ts
git commit -m "Fix: Remove NDK signing from workout submission - prevents lost workouts"
```

---

### Task 2: Fix event timezone bug (end-of-day handling)

**Files:**
- Modify: `src/hooks/useDynamicCompetitions.ts:18-25`
- Modify: `src/screens/events/DynamicEventDetailScreen.tsx:49-56`

**Context:** `deriveStatus()` compares `Date.now()` against `new Date(end_date)`. When `end_date` is `"2026-02-23T00:00:00+00:00"`, this means midnight UTC on Feb 23 = 6-7pm ET on Feb 22. Events appear "ended" before the day is over for US users.

**Step 1: Fix `deriveStatus` in `useDynamicCompetitions.ts` (line 18-25)**

```typescript
function deriveStatus(comp: Competition): CompetitionStatus {
  const now = Date.now();
  const start = new Date(comp.start_date).getTime();
  const endDate = new Date(comp.end_date);
  endDate.setUTCHours(23, 59, 59, 999); // Treat as end of that day
  const end = endDate.getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}
```

**Step 2: Fix `deriveStatus` in `DynamicEventDetailScreen.tsx` (line 49-56)**

Same change:
```typescript
function deriveStatus(comp: Competition): EventStatus {
  const now = Date.now();
  const start = new Date(comp.start_date).getTime();
  const endDate = new Date(comp.end_date);
  endDate.setUTCHours(23, 59, 59, 999); // Treat as end of that day
  const end = endDate.getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}
```

**Step 3: Also fix the leaderboard date range query**

In `SupabaseCompetitionService.getLeaderboard()` (line 664-665), the `endDate` used for `.lte('created_at', endDate)` should also be end-of-day. Check and fix if needed.

**Step 4: Run typecheck**

```bash
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/hooks/useDynamicCompetitions.ts src/screens/events/DynamicEventDetailScreen.tsx
git commit -m "Fix: Event timezone - treat end_date as end of day UTC"
```

---

### Task 3: Fix profile data on participants and submissions

**Files:**
- Modify: `src/hooks/useSupabaseLeaderboard.ts:693-696` (pass profile when joining)
- Modify: `src/screens/events/DynamicEventDetailScreen.tsx` (join with profile)
- Verify: `src/services/backend/SupabaseCompetitionService.ts:428-429` (profile_name/picture in submission payload)

**Context:** `joinCompetition()` accepts an optional `profile` parameter (line 141) but callers never pass it. Also, workout submissions have `profile_name: null` in the DB even though the code passes it (line 428-429). The `getCachedProfile()` method (line 690) may be returning empty if the profile cache key doesn't exist.

**Step 1: Pass profile when joining competition in `useSupabaseLeaderboard.ts`**

At lines 693-696, add profile data:

```typescript
// BEFORE:
const result = await SupabaseCompetitionService.joinCompetition(
  competitionId,
  npub
);

// AFTER:
// Fetch cached profile for participant display
let profile: { name?: string; picture?: string } | undefined;
try {
  const profilesJson = await AsyncStorage.getItem('@runstr:nostr_profiles');
  const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
  if (profilesJson && hexPubkey) {
    const profiles = JSON.parse(profilesJson);
    if (profiles[hexPubkey]) {
      profile = {
        name: profiles[hexPubkey].name || profiles[hexPubkey].displayName,
        picture: profiles[hexPubkey].picture,
      };
    }
  }
} catch { /* non-critical */ }

const result = await SupabaseCompetitionService.joinCompetition(
  competitionId,
  npub,
  profile
);
```

Note: Check if `AsyncStorage` is already imported in this file. If not, add the import.

**Step 2: Pass profile when joining from DynamicEventDetailScreen**

Find the join button handler in DynamicEventDetailScreen.tsx and pass profile data similarly.

**Step 3: Debug getCachedProfile() emptiness**

The `getCachedProfile()` reads from `@runstr:nostr_profiles` AsyncStorage key. This key is set by the NostrProfileService when profiles are fetched. If the user's profile hasn't been cached under their hex pubkey, it returns `{}`.

Check if the profile cache is populated. If not, add a fallback that reads from `@runstr:npub_profile` or similar keys used elsewhere.

**Step 4: Run typecheck**

```bash
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/hooks/useSupabaseLeaderboard.ts src/screens/events/DynamicEventDetailScreen.tsx
git commit -m "Fix: Pass profile data when joining competitions and submitting workouts"
```

---

### Task 4: PPQ.AI end-to-end verification script

**Files:**
- Create: `scripts/verify/verify-ppq-e2e.ts`

**Context:** The PPQ.AI API (`https://api.ppq.ai`) provides a `/topup/create/btc-lightning` endpoint that creates Lightning invoices. The Alby MCP tool can pay these invoices. This script tests the full flow.

**Step 1: Create the verification script**

```typescript
/**
 * PPQ.AI End-to-End Verification
 *
 * Tests: API key check → Create 50 sat invoice → Pay via Alby → Verify balance
 *
 * Usage: npx tsx scripts/verify/verify-ppq-e2e.ts
 * Requires: PPQ_API_KEY env var or --key flag
 */

const PPQ_API_BASE = 'https://api.ppq.ai';

async function main() {
  // 1. Get API key
  const apiKey = process.env.PPQ_API_KEY || process.argv[2];
  if (!apiKey) {
    console.error('Usage: PPQ_API_KEY=xxx npx tsx scripts/verify/verify-ppq-e2e.ts');
    console.error('  or: npx tsx scripts/verify/verify-ppq-e2e.ts <api-key>');
    process.exit(1);
  }
  console.log('PPQ API key:', apiKey.substring(0, 8) + '...');

  // 2. Check balance (before)
  console.log('\n--- Step 1: Check current balance ---');
  const balRes = await fetch(`${PPQ_API_BASE}/credits/balance`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!balRes.ok) {
    console.error('Balance check failed:', balRes.status, await balRes.text());
    process.exit(1);
  }
  const balData = await balRes.json();
  console.log('Current balance:', JSON.stringify(balData));

  // 3. Create 50 sat topup invoice
  console.log('\n--- Step 2: Create 50 sat topup invoice ---');
  const invRes = await fetch(`${PPQ_API_BASE}/topup/create/btc-lightning`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ amount: 50, currency: 'SATS' }),
  });
  if (!invRes.ok) {
    console.error('Invoice creation failed:', invRes.status, await invRes.text());
    process.exit(1);
  }
  const invData = await invRes.json();
  console.log('Invoice created!');
  console.log('  bolt11:', invData.bolt11?.substring(0, 60) + '...');
  console.log('  invoice_id:', invData.invoice_id);
  console.log('  expires_at:', invData.expires_at);
  console.log('\n📋 FULL BOLT11 (copy for Alby payment):');
  console.log(invData.bolt11);

  // 4. Wait for payment
  console.log('\n--- Step 3: Pay this invoice using Alby MCP ---');
  console.log('Run: mcp__alby__pay_invoice({ invoice: "<bolt11>" })');
  console.log('Or pay from any Lightning wallet.');
  console.log('\nAfter paying, check balance:');
  console.log(`curl -H "Authorization: Bearer ${apiKey}" ${PPQ_API_BASE}/credits/balance`);
}

main().catch(console.error);
```

**Step 2: Test the script**

```bash
# Get the PPQ API key from the device's AsyncStorage or from the user
npx tsx scripts/verify/verify-ppq-e2e.ts <ppq-api-key>
```

**Step 3: Use Alby MCP to pay the invoice**

After the script prints the bolt11, use `mcp__alby__pay_invoice` to pay it, then check balance.

**Step 4: Commit**

```bash
git add scripts/verify/verify-ppq-e2e.ts
git commit -m "Chore: Add PPQ.AI end-to-end verification script"
```

---

## Execution Order

Tasks are independent and can be parallelized:
- **Task 1** (workout submission) - highest priority, prevents data loss
- **Task 2** (timezone) - quick fix, independent
- **Task 3** (profiles) - medium, independent
- **Task 4** (PPQ script) - can run in parallel with others
