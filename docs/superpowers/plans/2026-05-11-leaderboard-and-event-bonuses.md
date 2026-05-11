# Leaderboard & Event Bonuses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the RUNSTR app render new bonus reward types (`daily_bonus`, `event_bonus`) in the History tab, and provision the Supabase schema the external `runstr-zapper` repo needs to write them.

**Architecture:** A new Supabase migration adds a `metadata JSONB` column to `reward_payments` and creates three new tables (`monthly_budget_state`, `daily_bonus_payouts`, `event_bonus_payouts`) used by the zapper for idempotency and budget tracking. The app's `RewardHistoryScreen` learns to render `daily_bonus` and `event_bonus` payments with leaderboard- or event-specific labels by reading `reward_type` and `metadata`. A verification script confirms the schema is correct and the label helper round-trips.

**Tech Stack:** TypeScript / React Native (Expo), Supabase Postgres, `npx tsx` for verification scripts.

**Spec:** `docs/superpowers/specs/2026-05-11-leaderboard-and-event-bonuses-design.md`
**Zapper handoff:** `docs/superpowers/specs/2026-05-11-zapper-bonuses-handoff.md`

---

## Scope

This plan covers ONLY the RUNSTR app repo. The zapper repo work (3 cron jobs, eligibility checks, push dispatch) is tracked separately via the handoff doc. The acceptance bar for this plan is: schema deployed, app correctly labels bonus rows when the zapper inserts them.

## File map

| File                                                         | Action  | Responsibility                                                                  |
|--------------------------------------------------------------|---------|---------------------------------------------------------------------------------|
| `supabase/migrations/179_bonus_rewards_schema.sql`           | Create  | Add `metadata` column to `reward_payments`; create 3 new tables with RLS.       |
| `src/services/rewards/SupabaseRewardService.ts`              | Modify  | Add `metadata` field to `PaymentRecord` interface.                              |
| `src/screens/rewardLabel.ts`                                 | Create  | Pure helper: `(reward_type, metadata) → { label, icon }`. Replaces inline logic. |
| `src/screens/RewardHistoryScreen.tsx`                        | Modify  | Import and use `rewardLabel`; remove inline `classifyReward`/`labelFor`/`iconFor`. |
| `scripts/verify/verify-bonus-rewards-schema.ts`              | Create  | Verifies schema exists, metadata round-trips, label helper renders all types.   |

---

## Task 1: Migration — schema additions

**Files:**
- Create: `supabase/migrations/179_bonus_rewards_schema.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/179_bonus_rewards_schema.sql` with this exact content:

```sql
-- Migration 179: Bonus rewards schema additions
-- Supports daily-leaderboard and captain-event bonus payouts written by runstr-zapper.
-- See docs/superpowers/specs/2026-05-11-leaderboard-and-event-bonuses-design.md.

-- =============================================
-- 1. Extend reward_payments with structured bonus context.
-- =============================================
ALTER TABLE reward_payments
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- =============================================
-- 2. monthly_budget_state: tracks the per-month rewards budget.
-- One row per UTC month. Zapper reads/writes via service role.
-- =============================================
CREATE TABLE IF NOT EXISTS monthly_budget_state (
  month            TEXT        PRIMARY KEY,                   -- 'YYYY-MM' UTC
  budget_total     INTEGER     NOT NULL,                       -- sats
  budget_spent     INTEGER     NOT NULL DEFAULT 0,             -- sats
  last_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE monthly_budget_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read budget state" ON monthly_budget_state;
CREATE POLICY "Anyone can read budget state" ON monthly_budget_state
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access on budget" ON monthly_budget_state;
CREATE POLICY "Service role full access on budget" ON monthly_budget_state
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 3. daily_bonus_payouts: idempotency for daily leaderboard payouts.
-- =============================================
CREATE TABLE IF NOT EXISTS daily_bonus_payouts (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_date         DATE         NOT NULL,
  leaderboard_id      TEXT         NOT NULL,                  -- '5k' | '10k' | 'half_marathon' | 'marathon' | 'steps'
  place               SMALLINT     NOT NULL CHECK (place BETWEEN 1 AND 3),
  recipient_pubkey    TEXT,
  amount_sats         INTEGER      NOT NULL,
  status              TEXT         NOT NULL,                  -- 'paid' | 'skipped_no_address' | 'skipped_budget'
  reward_payment_id   UUID         REFERENCES reward_payments(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (payout_date, leaderboard_id, place)
);

ALTER TABLE daily_bonus_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read daily bonus payouts" ON daily_bonus_payouts;
CREATE POLICY "Anyone can read daily bonus payouts" ON daily_bonus_payouts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access on daily payouts" ON daily_bonus_payouts;
CREATE POLICY "Service role full access on daily payouts" ON daily_bonus_payouts
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 4. event_bonus_payouts: idempotency for captain event payouts.
-- =============================================
CREATE TABLE IF NOT EXISTS event_bonus_payouts (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID         NOT NULL,
  place               SMALLINT     NOT NULL CHECK (place BETWEEN 1 AND 3),
  recipient_pubkey    TEXT,
  amount_sats         INTEGER      NOT NULL,
  status              TEXT         NOT NULL,                  -- 'paid' | 'skipped_no_address' | 'skipped_budget' | 'skipped_ineligible'
  ineligible_reason   TEXT,
  reward_payment_id   UUID         REFERENCES reward_payments(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, place)
);

ALTER TABLE event_bonus_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read event bonus payouts" ON event_bonus_payouts;
CREATE POLICY "Anyone can read event bonus payouts" ON event_bonus_payouts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access on event payouts" ON event_bonus_payouts;
CREATE POLICY "Service role full access on event payouts" ON event_bonus_payouts
  FOR ALL USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Apply the migration**

Apply via the user's preferred Supabase workflow. Do NOT use `supabase db reset` (per `feedback_never_db_reset.md` memory — production data was wiped this way once). Instead either:
- Run `supabase db push` from the project root, OR
- Open the Supabase SQL editor and paste the migration manually.

The user runs this. Do not run it yourself.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/179_bonus_rewards_schema.sql
git commit -m "Feature: bonus rewards schema (metadata column + 3 idempotency tables)"
```

---

## Task 2: Extend PaymentRecord with metadata

**Files:**
- Modify: `src/services/rewards/SupabaseRewardService.ts:24-37`

- [ ] **Step 1: Add metadata field to PaymentRecord**

In `src/services/rewards/SupabaseRewardService.ts`, replace the `PaymentRecord` interface (lines 24–37) with:

```typescript
export interface PaymentRecord {
  id: string;
  npub: string;
  lightning_address: string;
  amount_sats: number;
  reward_type: string;
  is_ein_bonus: boolean;
  charity_id: string | null;
  payment_hash: string | null;
  preimage: string | null;
  status: 'success' | 'pending' | 'failed';
  error_message: string | null;
  paid_at: string;
  metadata: Record<string, any> | null;
}
```

(`getPaymentHistory` uses `select('*')` so the new column flows through automatically once the migration is applied.)

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: passes with no new errors. If `metadata` is missing on any other `PaymentRecord` construction site, fix it (`metadata: null` is the safe default for existing code paths).

- [ ] **Step 3: Commit**

```bash
git add src/services/rewards/SupabaseRewardService.ts
git commit -m "Feature: surface reward_payments.metadata through PaymentRecord"
```

---

## Task 3: Create the rewardLabel helper

**Files:**
- Create: `src/screens/rewardLabel.ts`

- [ ] **Step 1: Create the helper file**

Create `src/screens/rewardLabel.ts` with this exact content:

```typescript
import type * as React from 'react';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface RewardLabel {
  label: string;
  icon: IconName;
}

/**
 * Renders a row label and icon for a reward_payments row.
 * Knows about: 'workout', 'steps', 'daily_bonus', 'event_bonus'.
 * Falls back to a generic label for unknown reward_type values so future
 * additions don't crash the History tab.
 */
export function rewardLabel(
  rewardType: string,
  metadata: Record<string, any> | null
): RewardLabel {
  switch (rewardType) {
    case 'workout':
      return { label: 'Workout reward', icon: 'fitness-outline' };
    case 'steps':
      return { label: 'Steps reward', icon: 'footsteps-outline' };
    case 'daily_bonus':
      return {
        label: dailyBonusLabel(metadata),
        icon: 'trophy-outline',
      };
    case 'event_bonus':
      return {
        label: eventBonusLabel(metadata),
        icon: 'flame-outline',
      };
    default:
      return { label: 'Reward', icon: 'star-outline' };
  }
}

function dailyBonusLabel(metadata: Record<string, any> | null): string {
  const lbLabel = typeof metadata?.leaderboard_label === 'string'
    ? metadata.leaderboard_label
    : null;
  const place = typeof metadata?.place === 'number' ? metadata.place : null;
  if (lbLabel && place) {
    return `${lbLabel} Daily — ${ordinal(place)} place`;
  }
  if (lbLabel) return `${lbLabel} Daily bonus`;
  return 'Daily bonus';
}

function eventBonusLabel(metadata: Record<string, any> | null): string {
  const name = typeof metadata?.event_name === 'string' ? metadata.event_name : null;
  const place = typeof metadata?.place === 'number' ? metadata.place : null;
  if (name && place) return `${name} — ${ordinal(place)} place`;
  if (name) return `${name} bonus`;
  return 'Event bonus';
}

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/rewardLabel.ts
git commit -m "Feature: rewardLabel helper for History row rendering"
```

---

## Task 4: Wire RewardHistoryScreen to use the helper

**Files:**
- Modify: `src/screens/RewardHistoryScreen.tsx:34, 79-95, 117-120`

- [ ] **Step 1: Remove the inline helpers and import the new one**

In `src/screens/RewardHistoryScreen.tsx`:

**Add the import** near the other relative imports (after line 32 `import type { PaymentRecord }...`):

```typescript
import { rewardLabel } from './rewardLabel';
```

**Remove these three helper functions entirely** (lines 79–95 in the current file):

```typescript
const classifyReward = (rewardType: string): RewardType => { ... };
const labelFor = (type: RewardType): string => { ... };
const iconFor = (type: RewardType): React.ComponentProps<typeof Ionicons>['name'] => { ... };
```

**Remove the local `RewardType` alias** at line 34:

```typescript
type RewardType = 'workout' | 'steps' | 'other';
```

- [ ] **Step 2: Update the row renderer to use the helper**

In the `RewardRow` component (currently lines 117–121), replace:

```typescript
const RewardRow: React.FC<RewardRowProps> = ({ payment, expanded, onToggle }) => {
  const type = classifyReward(payment.reward_type);
  const label = labelFor(type);
  const icon = iconFor(type);
  const time = formatTime(payment.paid_at);
```

with:

```typescript
const RewardRow: React.FC<RewardRowProps> = ({ payment, expanded, onToggle }) => {
  const { label, icon } = rewardLabel(payment.reward_type, payment.metadata);
  const time = formatTime(payment.paid_at);
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: passes with no errors. If there are unused-import warnings for `Ionicons` types or `RewardType`, those are stale references — remove them.

- [ ] **Step 4: Commit**

```bash
git add src/screens/RewardHistoryScreen.tsx
git commit -m "Feature: render daily_bonus and event_bonus rows in History tab"
```

---

## Task 5: Verification script

**Files:**
- Create: `scripts/verify/verify-bonus-rewards-schema.ts`

- [ ] **Step 1: Create the verification script**

Create `scripts/verify/verify-bonus-rewards-schema.ts` with this exact content:

```typescript
/**
 * Verifies the bonus rewards migration applied correctly and the rewardLabel
 * helper renders every supported reward_type.
 *
 * Run: npx tsx scripts/verify/verify-bonus-rewards-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import { rewardLabel } from '../../src/screens/rewardLabel';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyTablesExist() {
  const tables = ['monthly_budget_state', 'daily_bonus_payouts', 'event_bonus_payouts'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*').limit(0);
    if (error) {
      console.error(`❌ Table ${t} not readable:`, error.message);
      process.exit(1);
    }
    console.log(`✓ Table ${t} exists and is readable`);
  }
}

async function verifyMetadataColumn() {
  // Read one row with metadata to confirm the column is selectable.
  // (No rows is also OK — column existence is what we're checking.)
  const { error } = await supabase
    .from('reward_payments')
    .select('id, reward_type, metadata')
    .limit(1);
  if (error) {
    console.error('❌ reward_payments.metadata not selectable:', error.message);
    process.exit(1);
  }
  console.log('✓ reward_payments.metadata column exists');
}

function verifyLabelHelper() {
  const cases: Array<{
    rewardType: string;
    metadata: Record<string, any> | null;
    expectedLabel: string;
  }> = [
    { rewardType: 'workout', metadata: null, expectedLabel: 'Workout reward' },
    { rewardType: 'steps', metadata: null, expectedLabel: 'Steps reward' },
    {
      rewardType: 'daily_bonus',
      metadata: { leaderboard_label: 'Half Marathon', place: 1 },
      expectedLabel: 'Half Marathon Daily — 1st place',
    },
    {
      rewardType: 'daily_bonus',
      metadata: { leaderboard_label: '5K', place: 2 },
      expectedLabel: '5K Daily — 2nd place',
    },
    {
      rewardType: 'daily_bonus',
      metadata: { leaderboard_label: 'Steps', place: 3 },
      expectedLabel: 'Steps Daily — 3rd place',
    },
    {
      rewardType: 'event_bonus',
      metadata: { event_name: 'Ohio Ruckers Sprint', place: 2 },
      expectedLabel: 'Ohio Ruckers Sprint — 2nd place',
    },
    { rewardType: 'unknown_future_type', metadata: null, expectedLabel: 'Reward' },
    { rewardType: 'daily_bonus', metadata: null, expectedLabel: 'Daily bonus' },
    { rewardType: 'event_bonus', metadata: null, expectedLabel: 'Event bonus' },
  ];

  let failures = 0;
  for (const c of cases) {
    const { label } = rewardLabel(c.rewardType, c.metadata);
    if (label !== c.expectedLabel) {
      console.error(
        `❌ rewardLabel(${c.rewardType}, ${JSON.stringify(c.metadata)}) → "${label}" (expected "${c.expectedLabel}")`
      );
      failures++;
    } else {
      console.log(`✓ rewardLabel(${c.rewardType}) → "${label}"`);
    }
  }
  if (failures > 0) {
    console.error(`\n${failures} label test(s) failed`);
    process.exit(1);
  }
}

async function main() {
  console.log('Verifying bonus rewards schema and label helper...\n');
  await verifyTablesExist();
  await verifyMetadataColumn();
  console.log('');
  verifyLabelHelper();
  console.log('\nAll checks passed.');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the verification script**

```bash
npx tsx scripts/verify/verify-bonus-rewards-schema.ts
```

Expected output (after migration is applied):
```
Verifying bonus rewards schema and label helper...

✓ Table monthly_budget_state exists and is readable
✓ Table daily_bonus_payouts exists and is readable
✓ Table event_bonus_payouts exists and is readable
✓ reward_payments.metadata column exists

✓ rewardLabel(workout) → "Workout reward"
✓ rewardLabel(steps) → "Steps reward"
✓ rewardLabel(daily_bonus) → "Half Marathon Daily — 1st place"
✓ rewardLabel(daily_bonus) → "5K Daily — 2nd place"
✓ rewardLabel(daily_bonus) → "Steps Daily — 3rd place"
✓ rewardLabel(event_bonus) → "Ohio Ruckers Sprint — 2nd place"
✓ rewardLabel(unknown_future_type) → "Reward"
✓ rewardLabel(daily_bonus) → "Daily bonus"
✓ rewardLabel(event_bonus) → "Event bonus"

All checks passed.
```

If the schema portion fails: the migration hasn't been applied yet. Re-run after the user has applied it.
If the label portion fails: the helper has a bug — fix `src/screens/rewardLabel.ts` to match the expected outputs.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify/verify-bonus-rewards-schema.ts
git commit -m "Feature: verify-bonus-rewards-schema script"
```

---

## Done condition

Plan is complete when:
1. Migration 179 file exists, committed, and the user has applied it to Supabase.
2. `PaymentRecord` includes `metadata`.
3. `src/screens/rewardLabel.ts` exists and handles all four reward types plus the unknown fallback.
4. `RewardHistoryScreen.tsx` uses `rewardLabel` and no longer has inline `classifyReward`/`labelFor`/`iconFor`.
5. `npx tsx scripts/verify/verify-bonus-rewards-schema.ts` exits 0.
6. `npm run typecheck` passes.

After this plan ships, the app is ready. Bonus rows won't appear in the History tab until the zapper repo starts inserting them — that work is tracked separately via the handoff doc.
