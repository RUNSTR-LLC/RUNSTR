# Captain "Pay Winners" from NWC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a captain finalize an ended ranked event and pay the winners from their own on-device NWC wallet, using the existing fixed preset pool and 50/30/20 split.

**Architecture:** Extract the existing prize-split math into a pure, unit-tested module; fix the edge function so each finisher's reward address reaches the app; add a captain-facing "Pay Winners" section to the live event detail screen with a pre-pay preview, confirm step, idempotency, and an NWC-connected guard. Payments go through the existing on-device `NWCWalletService` — the NWC string never leaves the device.

**Tech Stack:** React Native + TypeScript (Expo), jest (jest-expo preset), Supabase Edge Functions (Deno), NDK NWC.

## Global Constraints

- **NWC stays on-device** — never send the NWC connection string to Supabase, an edge function, or any RUNSTR backend. Use the client-side `NWCWalletService` only. Do NOT use the legacy `claim-reward` / `process-donations` / `NWCGatewayService` server path.
- **Terminology** — code/comments may use "sats"; user-facing copy should prefer "rewards" where natural, but existing event UI already says "sats prize pool" — match the surrounding code's existing strings, don't introduce new user-facing "Bitcoin/Lightning/Nostr".
- **500-line file limit** — keep new/modified files under 500 lines.
- **NDK exclusively** — no nostr-tools.
- **Verification protocol** — `npm run typecheck` must pass; pure logic gets jest tests; UI/edge changes get a diagnostic script + manual simulator check.
- **Reward amounts unchanged** — fixed preset pool, fixed 50/30/20 top-3 split (or equal split for `all_participants`). Do NOT add custom-amount UI.
- **Scope** — do NOT touch the existing random-lottery finalization section; add a parallel section for non-random prize-pool events. No captain-earning flywheel.
- **Environment note** — git is currently blocked by an unaccepted Xcode license (`sudo xcodebuild -license accept`); resolve before the first commit.

---

### Task 1: Pure payout-math module with unit tests

Extract the split math out of `EventFinalizationService` into a pure module with no React Native imports, so it is unit-testable, and add two new pure helpers (`partitionRecipients`, `filterAlreadyPaid`) for the preview and idempotency.

**Files:**
- Create: `src/services/events/payoutMath.ts`
- Create: `src/services/events/__tests__/payoutMath.test.ts`
- Modify: `src/services/events/EventFinalizationService.ts` (replace inline `Finisher`/`PayoutRecipient` interfaces and `calculateSplits` body with imports + delegation)

**Interfaces:**
- Produces:
  - `interface Finisher { npub: string; totalDistanceKm: number; name?: string; lightningAddress?: string }`
  - `interface PayoutRecipient { npub: string; name?: string; amount_sats: number; address: string; success: boolean; error?: string }`
  - `function calculateSplits(finishers: Finisher[], prizePoolSats: number, distribution: 'top3' | 'all_participants'): PayoutRecipient[]`
  - `function partitionRecipients(recipients: PayoutRecipient[]): { payable: PayoutRecipient[]; unpayable: PayoutRecipient[] }`
  - `function filterAlreadyPaid(recipients: PayoutRecipient[], existingResults?: PayoutRecipient[]): PayoutRecipient[]`
- `EventFinalizationService` re-exports `Finisher` and `PayoutRecipient` (existing consumers, e.g. `DynamicEventDetailScreen`, import `PayoutRecipient` from it — keep that path working).

- [ ] **Step 1: Write the failing tests**

Create `src/services/events/__tests__/payoutMath.test.ts`:

```ts
import {
  calculateSplits,
  partitionRecipients,
  filterAlreadyPaid,
  Finisher,
  PayoutRecipient,
} from '../payoutMath';

const f = (npub: string, km: number, addr?: string): Finisher => ({
  npub,
  totalDistanceKm: km,
  name: npub,
  lightningAddress: addr,
});

describe('calculateSplits', () => {
  it('splits top3 50/30/20 and sums exactly to the pool', () => {
    const r = calculateSplits(
      [f('a', 30, 'a@x.com'), f('b', 20, 'b@x.com'), f('c', 10, 'c@x.com')],
      1000,
      'top3',
    );
    expect(r.map(x => x.amount_sats)).toEqual([500, 300, 200]);
    expect(r.reduce((s, x) => s + x.amount_sats, 0)).toBe(1000);
    expect(r.map(x => x.npub)).toEqual(['a', 'b', 'c']); // ranked by distance desc
  });

  it('gives 100% to the only finisher in top3 mode', () => {
    const r = calculateSplits([f('a', 5, 'a@x.com')], 1000, 'top3');
    expect(r).toHaveLength(1);
    expect(r[0].amount_sats).toBe(1000);
  });

  it('uses 60/40 for exactly two finishers', () => {
    const r = calculateSplits([f('a', 9, 'a@x.com'), f('b', 4, 'b@x.com')], 1000, 'top3');
    expect(r.map(x => x.amount_sats)).toEqual([600, 400]);
  });

  it('splits equally among all participants, remainder to first', () => {
    const r = calculateSplits([f('a', 9), f('b', 8), f('c', 7)], 1000, 'all_participants');
    expect(r.map(x => x.amount_sats)).toEqual([334, 333, 333]);
    expect(r.reduce((s, x) => s + x.amount_sats, 0)).toBe(1000);
  });

  it('returns [] for empty finishers or non-positive pool', () => {
    expect(calculateSplits([], 1000, 'top3')).toEqual([]);
    expect(calculateSplits([f('a', 1, 'a@x.com')], 0, 'top3')).toEqual([]);
  });

  it('passes through missing address as empty string', () => {
    const r = calculateSplits([f('a', 1)], 1000, 'top3');
    expect(r[0].address).toBe('');
  });
});

describe('partitionRecipients', () => {
  it('separates recipients with no address or zero amount as unpayable', () => {
    const recips: PayoutRecipient[] = [
      { npub: 'a', amount_sats: 500, address: 'a@x.com', success: false },
      { npub: 'b', amount_sats: 300, address: '', success: false },
      { npub: 'c', amount_sats: 0, address: 'c@x.com', success: false },
    ];
    const { payable, unpayable } = partitionRecipients(recips);
    expect(payable.map(r => r.npub)).toEqual(['a']);
    expect(unpayable.map(r => r.npub)).toEqual(['b', 'c']);
  });
});

describe('filterAlreadyPaid', () => {
  const recips: PayoutRecipient[] = [
    { npub: 'a', amount_sats: 500, address: 'a@x.com', success: false },
    { npub: 'b', amount_sats: 300, address: 'b@x.com', success: false },
  ];

  it('returns all when there are no prior results', () => {
    expect(filterAlreadyPaid(recips, undefined)).toHaveLength(2);
    expect(filterAlreadyPaid(recips, [])).toHaveLength(2);
  });

  it('drops recipients already paid successfully, keeps prior failures', () => {
    const prior: PayoutRecipient[] = [
      { npub: 'a', amount_sats: 500, address: 'a@x.com', success: true },
      { npub: 'b', amount_sats: 300, address: 'b@x.com', success: false, error: 'timeout' },
    ];
    const out = filterAlreadyPaid(recips, prior);
    expect(out.map(r => r.npub)).toEqual(['b']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/services/events/__tests__/payoutMath.test.ts`
Expected: FAIL — cannot find module `../payoutMath`.

- [ ] **Step 3: Create the pure module**

Create `src/services/events/payoutMath.ts`:

```ts
/**
 * Pure payout math for event prize pools. No React Native / NWC imports —
 * keep this module side-effect free so it stays unit-testable.
 */

export interface Finisher {
  npub: string;
  totalDistanceKm: number;
  name?: string;
  lightningAddress?: string;
}

export interface PayoutRecipient {
  npub: string;
  name?: string;
  amount_sats: number;
  address: string;
  success: boolean;
  error?: string;
}

/** Calculate prize splits. top3 = 50/30/20 (adjusts for fewer); all_participants = equal, remainder to first. */
export function calculateSplits(
  finishers: Finisher[],
  prizePoolSats: number,
  distribution: 'top3' | 'all_participants',
): PayoutRecipient[] {
  if (finishers.length === 0 || prizePoolSats <= 0) return [];

  if (distribution === 'all_participants') {
    const perPerson = Math.floor(prizePoolSats / finishers.length);
    const remainder = prizePoolSats - perPerson * finishers.length;
    return finishers.map((f, i) => ({
      npub: f.npub,
      name: f.name,
      amount_sats: perPerson + (i === 0 ? remainder : 0),
      address: f.lightningAddress || '',
      success: false,
      error: undefined,
    }));
  }

  const ranked = [...finishers].sort((a, b) => b.totalDistanceKm - a.totalDistanceKm);
  const top = ranked.slice(0, 3);

  let percentages: number[];
  if (top.length === 1) percentages = [100];
  else if (top.length === 2) percentages = [60, 40];
  else percentages = [50, 30, 20];

  let allocated = 0;
  return top.map((f, i) => {
    const isLast = i === top.length - 1;
    const amount = isLast
      ? prizePoolSats - allocated
      : Math.floor((prizePoolSats * percentages[i]) / 100);
    allocated += amount;
    return {
      npub: f.npub,
      name: f.name,
      amount_sats: amount,
      address: f.lightningAddress || '',
      success: false,
      error: undefined,
    };
  });
}

/** Split recipients into those we can pay (address + positive amount) and those we cannot. */
export function partitionRecipients(recipients: PayoutRecipient[]): {
  payable: PayoutRecipient[];
  unpayable: PayoutRecipient[];
} {
  const payable: PayoutRecipient[] = [];
  const unpayable: PayoutRecipient[] = [];
  for (const r of recipients) {
    if (r.address && r.amount_sats > 0) payable.push(r);
    else unpayable.push(r);
  }
  return { payable, unpayable };
}

/** Drop recipients already paid successfully in a prior run; keep prior failures so they retry. */
export function filterAlreadyPaid(
  recipients: PayoutRecipient[],
  existingResults?: PayoutRecipient[],
): PayoutRecipient[] {
  if (!existingResults || existingResults.length === 0) return recipients;
  const paid = new Set(existingResults.filter(r => r.success).map(r => r.npub));
  return recipients.filter(r => !paid.has(r.npub));
}
```

- [ ] **Step 4: Delegate from EventFinalizationService**

In `src/services/events/EventFinalizationService.ts`:

Remove the inline `Finisher` and `PayoutRecipient` interface declarations (currently lines ~20-34) and re-export them from `payoutMath`. At the top of the file, after the existing imports, add:

```ts
import {
  Finisher,
  PayoutRecipient,
  calculateSplits as calculateSplitsPure,
} from './payoutMath';

export type { Finisher, PayoutRecipient };
```

Replace the body of the existing `calculateSplits` method so it delegates:

```ts
  calculateSplits(
    finishers: Finisher[],
    prizePoolSats: number,
    distribution: 'top3' | 'all_participants',
  ): PayoutRecipient[] {
    return calculateSplitsPure(finishers, prizePoolSats, distribution);
  }
```

Leave `FinalizationResult`, `finalizeEvent`, `executePayout`, `getFinishers`, and `selectRandomWinner` unchanged (they now reference the imported types).

- [ ] **Step 5: Run tests + typecheck to verify they pass**

Run: `npx jest src/services/events/__tests__/payoutMath.test.ts`
Expected: PASS (all tests green).

Run: `npm run typecheck`
Expected: No NEW errors referencing `payoutMath.ts` or `EventFinalizationService.ts` (the repo has ~199 pre-existing errors; compare against baseline — none should be newly introduced in these two files).

- [ ] **Step 6: Commit**

```bash
git add src/services/events/payoutMath.ts src/services/events/__tests__/payoutMath.test.ts src/services/events/EventFinalizationService.ts
git commit -m "Refactor: Extract pure payout math (splits, partition, idempotency) with tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Edge-function address passthrough + migration-167 diagnostic

The `get_competition_finishers` RPC (migration `167_finishers_with_lightning.sql`) already returns `lightning_address`, but the edge function drops it. Pass it through, and add a diagnostic that proves the RPC/migration is live in the target environment.

**Files:**
- Modify: `supabase/functions/finalize-ticketed-event/index.ts` (the `handleGetFinishers` result mapping)
- Create: `scripts/diagnostics/check-finisher-address.ts`

**Interfaces:**
- Consumes: the RPC row shape `{ npub, total_distance_meters, workout_count, lightning_address }`.
- Produces: edge `get_finishers` response items now include `lightningAddress: string | null`, which `EventFinalizationService.getFinishers` maps to `Finisher.lightningAddress`.

- [ ] **Step 1: Add the passthrough**

In `supabase/functions/finalize-ticketed-event/index.ts`, find the `handleGetFinishers` result mapping (the `(submissions || []).map(...)` block) and add the `lightningAddress` field plus the field in the destructured row type:

```ts
  const finishers = (submissions || []).map(
    (s: {
      npub: string;
      total_distance_meters: number;
      workout_count: number;
      lightning_address: string | null;
    }) => ({
      npub: s.npub,
      totalDistanceKm: s.total_distance_meters / 1000,
      workoutCount: s.workout_count,
      name:
        participants.find(
          (p: { npub: string; name: string | null }) => p.npub === s.npub,
        )?.name || null,
      lightningAddress: s.lightning_address || null,
    }),
  )
```

- [ ] **Step 2: Write the diagnostic script**

Create `scripts/diagnostics/check-finisher-address.ts`:

```ts
/**
 * Diagnostic: confirm migration 167 is live — get_competition_finishers must
 * return a `lightning_address` column. Usage:
 *   npx tsx scripts/diagnostics/check-finisher-address.ts <competition_id>
 */
import { supabase } from '../../src/utils/supabase';

async function main() {
  const competitionId = process.argv[2];
  if (!competitionId) {
    console.error('Usage: npx tsx scripts/diagnostics/check-finisher-address.ts <competition_id>');
    process.exit(1);
  }

  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('start_date, end_date')
    .eq('id', competitionId)
    .single();
  if (compErr || !comp) {
    console.error('Competition not found:', compErr?.message);
    process.exit(1);
  }

  const { data: parts } = await supabase
    .from('competition_participants')
    .select('npub')
    .eq('competition_id', competitionId);
  const npubs = (parts || []).map((p: { npub: string }) => p.npub);

  const { data, error } = await supabase.rpc('get_competition_finishers', {
    p_competition_id: competitionId,
    p_npubs: npubs,
    p_start_date: comp.start_date,
    p_end_date: comp.end_date,
    p_qualifying_distance_meters: 0,
  });

  if (error) {
    console.error('RPC error (migration 167 may not be deployed):', error.message);
    process.exit(1);
  }

  const rows = (data || []) as Array<Record<string, unknown>>;
  console.log(`Finishers returned: ${rows.length}`);
  if (rows.length > 0) {
    const hasColumn = 'lightning_address' in rows[0];
    console.log(`Has lightning_address column: ${hasColumn}`);
    rows.forEach((r) =>
      console.log(`  ${String(r.npub).slice(0, 12)}… -> ${r.lightning_address ?? '(none)'}`),
    );
    if (!hasColumn) process.exit(1);
  } else {
    console.log('No finishers (cannot confirm column from data — re-run on an event with finishers).');
  }
}

main();
```

- [ ] **Step 3: Verify the RPC/migration in the target environment**

Run (substitute a real ended competition id with finishers):
`npx tsx scripts/diagnostics/check-finisher-address.ts <competition_id>`
Expected: prints `Has lightning_address column: true` and one address per finisher.
If it errors or the column is missing, **deploy migration 167 before continuing** (the edge change is inert without it).

- [ ] **Step 4: Deploy the edge function (target environment)**

Run: `npx supabase functions deploy finalize-ticketed-event`
Expected: deploy succeeds. (If the team deploys via CI/dashboard instead, follow that path — note it in the commit.)

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/finalize-ticketed-event/index.ts scripts/diagnostics/check-finisher-address.ts
git commit -m "Fix: Pass finisher lightning address through finalize-ticketed-event

The get_competition_finishers RPC (migration 167) already resolves each
finisher's reward address; the edge function was dropping it, causing all
event payouts to fail with 'No rewards address'. Adds a diagnostic to
confirm migration 167 is deployed.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Captain "Pay Winners" UI for ranked prize-pool events

Add a finalization section to the live event detail screen for non-random prize-pool events. Leave the existing random-lottery section untouched. The flow: guard NWC connected → fetch finishers → split → drop already-paid → partition payable/unpayable → confirm dialog → pay via on-device NWC → persist merged results.

**Files:**
- Modify: `src/screens/events/DynamicEventDetailScreen.tsx`

**Interfaces:**
- Consumes: `calculateSplits`, `executePayout`, `finalizeEvent` from `EventFinalizationService`; `partitionRecipients`, `filterAlreadyPaid`, `PayoutRecipient` from `payoutMath`; `NWCStorageService.hasNWC()`; `NWCWalletService.getBalance()`.
- Produces: a captain-triggered payout that writes `config.payout_results` (array of `PayoutRecipient`) back to the competition via the existing `manage-competition` `update` action.

- [ ] **Step 1: Add imports and helper state**

At the top of `src/screens/events/DynamicEventDetailScreen.tsx`, add imports (place near the existing `EventFinalizationService` import):

```ts
import { partitionRecipients, filterAlreadyPaid } from '../../services/events/payoutMath';
import NWCStorageService from '../../services/wallet/NWCStorageService';
import NWCWalletService from '../../services/wallet/NWCWalletService';
```

(If `NWCWalletService` / `NWCStorageService` use named exports in this repo, match their existing export style — check the top of `src/services/wallet/NWCWalletService.ts`; it exports a singleton instance as default.)

- [ ] **Step 2: Add the `handlePayWinners` handler**

Add this function next to the existing `handleFinalize` in the component body:

```ts
  const handlePayWinners = async () => {
    if (!competition?.config) return;

    // Guard: NWC wallet must be connected (string lives only on-device).
    const hasWallet = await NWCStorageService.hasNWC();
    if (!hasWallet) {
      Alert.alert(
        'Connect a wallet',
        'To pay winners you need to connect your wallet first. Open the Rewards screen and connect your wallet, then try again.',
      );
      return;
    }

    setIsFinalizing(true);
    try {
      const config = competition.config;
      const prizePoolSats = config.prize_pool_sats || competition.prize_pool_sats || 0;
      const distribution = config.prize_distribution || 'top3';

      const result = await EventFinalizationService.finalizeEvent(
        competition.id,
        (config.winner_selection as 'ranked' | 'random') || 'ranked',
        distribution === 'all_participants' ? 0 : (config.qualifying_distance_km || 0),
        prizePoolSats,
      );
      setFinalizationResult(result);

      if (prizePoolSats <= 0 || result.finishers.length === 0) {
        Alert.alert('No payouts', 'There are no qualifying finishers to pay.');
        return;
      }

      // Compute splits, drop anyone already paid, then separate payable vs unpayable.
      const allRecipients = EventFinalizationService.calculateSplits(
        result.finishers,
        prizePoolSats,
        distribution,
      );
      const notYetPaid = filterAlreadyPaid(allRecipients, config.payout_results);
      const { payable, unpayable } = partitionRecipients(notYetPaid);

      if (payable.length === 0) {
        Alert.alert(
          'Nothing to pay',
          unpayable.length > 0
            ? `${unpayable.length} winner(s) have no reward destination and can't be paid. Everyone else is already paid.`
            : 'All winners are already paid.',
        );
        return;
      }

      const total = payable.reduce((s, r) => s + r.amount_sats, 0);

      // Best-effort balance check (non-blocking if the wallet is slow/unreachable).
      let balanceWarning = '';
      try {
        const { balance, error } = await NWCWalletService.getBalance();
        if (!error && balance < total) {
          balanceWarning = `\n\nWarning: your wallet balance (${balance} sats) is less than ${total} sats — some payments may fail.`;
        }
      } catch {
        // ignore — proceed to confirm
      }

      const lines = payable
        .map(r => `• ${r.name || r.npub.slice(0, 12) + '…'}: ${r.amount_sats} sats`)
        .join('\n');
      const unpayableNote =
        unpayable.length > 0
          ? `\n\n${unpayable.length} winner(s) can't be paid (no reward destination) and will be skipped.`
          : '';

      Alert.alert(
        'Pay winners?',
        `Send ${total} sats from your wallet to ${payable.length} winner(s):\n\n${lines}${unpayableNote}${balanceWarning}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay',
            onPress: async () => {
              setIsPaying(true);
              try {
                const payoutResults = await EventFinalizationService.executePayout(payable);

                // Merge: prior successes + unpayable (marked) + this run's results.
                const priorSuccesses = (config.payout_results || []).filter(
                  (p: PayoutRecipient) => p.success,
                );
                const unpayableMarked: PayoutRecipient[] = unpayable.map(u => ({
                  ...u,
                  success: false,
                  error: 'No reward destination',
                }));
                const merged = [...priorSuccesses, ...payoutResults, ...unpayableMarked];

                setFinalizationResult(prev => (prev ? { ...prev, payoutResults: merged } : prev));

                try {
                  await callEdgeFunction('manage-competition', {
                    action: 'update',
                    competition_id: competition.id,
                    npub: (await AsyncStorage.getItem('@runstr:npub')) || '',
                    updates: { config: { ...config, payout_results: merged } },
                  });
                } catch (e) {
                  console.warn('[DynamicEventDetail] Failed to persist payout results:', e);
                }

                const successCount = payoutResults.filter(p => p.success).length;
                const failCount = payoutResults.filter(p => !p.success).length;
                const totalPaid = payoutResults
                  .filter(p => p.success)
                  .reduce((s, p) => s + p.amount_sats, 0);
                let summary = `Paid ${totalPaid} sats to ${successCount} winner${successCount !== 1 ? 's' : ''}.`;
                if (failCount > 0) summary += ` ${failCount} payment${failCount !== 1 ? 's' : ''} failed — re-run to retry.`;
                Alert.alert('Done', summary);
              } finally {
                setIsPaying(false);
              }
            },
          },
        ],
      );
    } finally {
      setIsFinalizing(false);
    }
  };
```

- [ ] **Step 3: Add the new finalization section to the JSX**

Immediately AFTER the existing random-lottery finalization block (the one gated on `winner_selection === 'random'`, ending at the `)}` near line 908), add a parallel section for non-random prize-pool events:

```tsx
        {/* Pay Winners (Creator Only, Ended, has prize pool, non-random) */}
        {isEventCreator &&
          status === 'ended' &&
          (competition?.config?.prize_pool_sats || 0) > 0 &&
          competition?.config?.winner_selection !== 'random' && (
            <View style={[styles.finalizationSection, { backgroundColor: theme.colors.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 12 }]}>
                Pay Winners
              </Text>
              <Text style={[styles.finalizationSubtitle, { color: theme.colors.textMuted, marginBottom: 12 }]}>
                {(competition.config.prize_pool_sats || 0).toLocaleString()} sats ·{' '}
                {competition.config.prize_distribution === 'all_participants'
                  ? 'split among all finishers'
                  : 'Top 3 (50/30/20)'}
              </Text>
              <TouchableOpacity
                style={[styles.finalizeButton, { backgroundColor: theme.colors.accent }]}
                onPress={handlePayWinners}
                disabled={isFinalizing || isPaying}
              >
                {isFinalizing || isPaying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.finalizeButtonText}>Pay Winners</Text>
                )}
              </TouchableOpacity>
              {isPaying && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>Sending prizes…</Text>
                </View>
              )}
            </View>
          )}
```

The existing "Payout Results" block (gated on `competition?.config?.payout_results`, near line 660) already renders results for both flows — no change needed there.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors in `DynamicEventDetailScreen.tsx` (compare to the ~199-error baseline). Confirm `callEdgeFunction`, `AsyncStorage`, `Alert`, `ActivityIndicator`, `TouchableOpacity`, and `theme` are already imported in this file (they are used by the existing handlers) — if any new symbol is missing, add the import.

- [ ] **Step 5: Manual verification (simulator)**

Per the simulator workflow (full erase + reinstall — no soft reboot):
1. As a captain, create a ranked event with a prize pool (e.g. 1000 sats, Top 3) via `SimpleEventCreationModal`.
2. Have ≥1 participant join and submit qualifying workouts (or use an existing ended event with finishers).
3. Connect an NWC wallet on the Rewards screen.
4. Open the event after it ends → confirm the **"Pay Winners"** section renders.
5. Tap **Pay Winners** → confirm the preview lists each winner + amount (and any unpayable winners), then confirm balance and pay.
6. Verify the **Payout Results** list shows successes; tap **Pay Winners** again → confirm it reports everyone already paid (idempotency).

- [ ] **Step 6: Commit**

```bash
git add src/screens/events/DynamicEventDetailScreen.tsx
git commit -m "Feature: Captain Pay Winners from NWC for ranked prize-pool events

Adds a finalization section for non-random prize-pool events: NWC-connected
guard, pre-pay preview with unpayable winners flagged, confirm step, balance
warning, and idempotent re-runs. Pays on-device via NWCWalletService.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests**

Run: `npx jest src/services/events/__tests__/payoutMath.test.ts`
Expected: PASS.

- [ ] **Step 2: Typecheck the whole project**

Run: `npm run typecheck`
Expected: no NEW errors beyond the known ~199 baseline.

- [ ] **Step 3: Confirm migration 167 + edge passthrough end-to-end**

Run: `npx tsx scripts/diagnostics/check-finisher-address.ts <ended_competition_id>`
Expected: `Has lightning_address column: true` with addresses listed.

- [ ] **Step 4: Confirm the NWC security invariant**

Run: `grep -rn "getNWCString\|nwc_string\|nostr+walletconnect" src/services/events src/screens/events`
Expected: NO matches — the event/payout code path never reads the raw NWC string directly; it only calls `NWCWalletService` methods. (The string is read solely inside `NWCWalletService`/`NWCStorageService`.)

- [ ] **Step 5: Final manual smoke test**

Repeat Task 3 Step 5 once more on a fresh erase+reinstall to confirm no regressions in the existing random-lottery section (create a random-winner event, end it, confirm "Draw Random Winner" still works).

---

## Self-Review

**Spec coverage:**
- Edge passthrough (Blocker 1) → Task 2. ✓
- Ranked-case finalization UI (Blocker 2) → Task 3. ✓
- Preview + confirm → Task 3 Step 2/3. ✓
- NWC-connected guard, balance check, idempotency → Task 3 (uses `filterAlreadyPaid` from Task 1). ✓
- Address resolution via migration 167 → Task 2 diagnostic. ✓
- NWC security (on-device only) → Global Constraints + Task 4 Step 4. ✓
- Amounts unchanged (50/30/20) → Task 1 tests assert exact splits. ✓
- Verification protocol (jest + typecheck + diagnostic + manual) → Tasks 1–4. ✓
- Out of scope (custom amounts, server payout, flywheel, club CoinOS) → not implemented. ✓

**Type consistency:** `Finisher` and `PayoutRecipient` are defined once in `payoutMath.ts` and re-exported from `EventFinalizationService`; `calculateSplits`, `partitionRecipients`, `filterAlreadyPaid` signatures match across Tasks 1 and 3. `getBalance()` returns `{ balance, error? }`; `payLightningAddress` returns `{ success, error? }` — used consistently.

**Placeholder scan:** No TBD/TODO; all code steps contain full code; commands have expected output.
