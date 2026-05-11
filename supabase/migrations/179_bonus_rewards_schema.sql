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
