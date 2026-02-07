-- Charity Reward Payments Tracking Table
-- Records all charity donations made through the reward system for audit trail
-- This enables reporting, verification, and charity accountability

CREATE TABLE IF NOT EXISTS charity_reward_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who triggered this payment
  user_pubkey TEXT NOT NULL,

  -- Which charity received the payment
  charity_id TEXT NOT NULL,
  charity_name TEXT NOT NULL,
  charity_lightning_address TEXT NOT NULL,

  -- Payment details
  amount_sats INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'workout' or 'steps'
  donation_percentage INTEGER NOT NULL, -- 0-100

  -- Payment proof (from Lightning Network)
  payment_hash TEXT,
  preimage TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending/success/failed
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'success', 'failed')),
  CONSTRAINT valid_amount CHECK (amount_sats > 0),
  CONSTRAINT valid_percentage CHECK (donation_percentage >= 0 AND donation_percentage <= 100),
  CONSTRAINT valid_reward_type CHECK (reward_type IN ('workout', 'steps'))
);

-- Indexes for common queries
-- Query by charity (e.g., "how much has ALS Foundation received?")
CREATE INDEX idx_charity_payments_charity ON charity_reward_payments(charity_id);

-- Query by date (e.g., "what donations were made today?")
CREATE INDEX idx_charity_payments_date ON charity_reward_payments(created_at);

-- Query by status (e.g., "find all successful payments")
CREATE INDEX idx_charity_payments_status ON charity_reward_payments(status);

-- Query by user (e.g., "how much has this user donated?")
CREATE INDEX idx_charity_payments_user ON charity_reward_payments(user_pubkey);

-- Compound index for charity + date queries (common reporting pattern)
CREATE INDEX idx_charity_payments_charity_date ON charity_reward_payments(charity_id, created_at);

-- RLS: Only service role can access (sensitive financial data)
ALTER TABLE charity_reward_payments ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for edge functions)
CREATE POLICY "Service role full access" ON charity_reward_payments
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE charity_reward_payments IS 'Audit trail for all charity donations made through RUNSTR reward system';
COMMENT ON COLUMN charity_reward_payments.user_pubkey IS 'Nostr public key of the user who triggered the donation';
COMMENT ON COLUMN charity_reward_payments.preimage IS 'Lightning payment preimage as cryptographic proof of payment';
COMMENT ON COLUMN charity_reward_payments.donation_percentage IS 'User donation percentage setting at time of payment (0-100)';
