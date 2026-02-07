-- Migration 126: Ensure reward_payments table exists in version control
-- This table is written by runstr-zapper and read by the app (SupabaseRewardService).
-- Previously created manually in Supabase; now tracked in migrations.
--
-- NOTE: rewards_pool already exists (created before migration 123, which added last_updated_at).
-- NOTE: daily_rewards VIEW is owned/managed by runstr-zapper, not this repo.

-- =============================================
-- reward_payments: Every reward payment record
-- Written by runstr-zapper, read by the app
-- =============================================
CREATE TABLE IF NOT EXISTS reward_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  npub TEXT NOT NULL,
  lightning_address TEXT,
  amount_sats INTEGER NOT NULL,
  reward_type TEXT DEFAULT 'workout',
  is_ein_bonus BOOLEAN DEFAULT FALSE,
  charity_id TEXT,
  payment_hash TEXT,
  preimage TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('success', 'pending', 'failed')),
  error_message TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_payments_npub ON reward_payments(npub);
CREATE INDEX IF NOT EXISTS idx_reward_payments_status ON reward_payments(status);
CREATE INDEX IF NOT EXISTS idx_reward_payments_paid_at ON reward_payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_payments_npub_status ON reward_payments(npub, status);

ALTER TABLE reward_payments ENABLE ROW LEVEL SECURITY;

-- Idempotent: drop-then-create policies
DROP POLICY IF EXISTS "Anyone can read reward payments" ON reward_payments;
CREATE POLICY "Anyone can read reward payments" ON reward_payments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert reward payments" ON reward_payments;
CREATE POLICY "Anyone can insert reward payments" ON reward_payments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON reward_payments;
CREATE POLICY "Service role full access" ON reward_payments
  FOR ALL USING (auth.role() = 'service_role');
