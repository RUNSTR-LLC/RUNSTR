-- =============================================
-- RUNSTR Migration: Create payments table
-- Purpose: Track all Bitcoin transactions and rewards
-- =============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction parties
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id UUID REFERENCES auth.users(id),
  
  -- Payment details
  amount_sats BIGINT NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('reward', 'entry_fee', 'prize_distribution')),
  
  -- Context
  activity_id UUID REFERENCES activities(id),
  team_id UUID REFERENCES teams(id),
  
  -- Lightning Network details
  lightning_invoice TEXT,
  payment_hash TEXT,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_payments_from_user ON payments(from_user_id);
CREATE INDEX idx_payments_to_user ON payments(to_user_id);
CREATE INDEX idx_payments_activity ON payments(activity_id);
CREATE INDEX idx_payments_team ON payments(team_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can see payments they're involved in
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id
  );

-- Team members can see team-related payments
CREATE POLICY "Team members can view team payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = payments.team_id 
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- Only team captains can create payment distributions
CREATE POLICY "Team captains can create payments" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_id 
      AND captain_id = auth.uid()
    )
  );

-- Sample data (optional - run this in separate query if you want test data)
-- INSERT INTO payments (from_user_id, to_user_id, amount_sats, transaction_type, description, status)
-- SELECT 
--   (SELECT id FROM auth.users WHERE email IS NOT NULL LIMIT 1) as from_user,
--   (SELECT id FROM auth.users WHERE email IS NOT NULL OFFSET 1 LIMIT 1) as to_user,
--   5000,
--   'reward',
--   'Weekly 5K Challenge completion reward',
--   'completed'
-- WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 2);

COMMENT ON TABLE payments IS 'Tracks all Bitcoin transactions, rewards, and payments in RUNSTR';
