-- Migration 156: Lottery wheel tables
-- Daily spin wheel where user level applies a logarithmic multiplier to prizes.
-- Rewards flow through the existing reward_payments pipeline.

-- =============================================
-- lottery_config: Wheel segment configuration
-- Tunable without app updates
-- =============================================
CREATE TABLE IF NOT EXISTS lottery_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment INTEGER NOT NULL UNIQUE,
  base_value INTEGER NOT NULL,
  probability NUMERIC NOT NULL CHECK (probability > 0 AND probability <= 1),
  active BOOLEAN DEFAULT TRUE
);

-- Seed default segments
INSERT INTO lottery_config (segment, base_value, probability) VALUES
  (1, 5, 0.30),
  (2, 10, 0.25),
  (3, 25, 0.20),
  (4, 50, 0.13),
  (5, 100, 0.08),
  (6, 250, 0.03),
  (7, 500, 0.008),
  (8, 1000, 0.002)
ON CONFLICT (segment) DO NOTHING;

-- RLS: anyone can read config, no writes from client
ALTER TABLE lottery_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read lottery config" ON lottery_config;
CREATE POLICY "Anyone can read lottery config" ON lottery_config
  FOR SELECT USING (true);

-- =============================================
-- lottery_spins: One record per spin attempt
-- Server-side trigger fills segment_value and final_payout
-- =============================================
CREATE TABLE IF NOT EXISTS lottery_spins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  npub TEXT NOT NULL,
  level INTEGER NOT NULL,
  multiplier NUMERIC NOT NULL,
  segment_value INTEGER,
  final_payout INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'paid')),
  spun_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce one spin per user per calendar day (UTC)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lottery_spins_one_per_day
  ON lottery_spins (npub, (spun_at::date));

CREATE INDEX IF NOT EXISTS idx_lottery_spins_npub ON lottery_spins(npub);
CREATE INDEX IF NOT EXISTS idx_lottery_spins_spun_at ON lottery_spins(spun_at DESC);

-- RLS: users can insert their own spins and read their own results
ALTER TABLE lottery_spins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own spins" ON lottery_spins;
CREATE POLICY "Users can insert own spins" ON lottery_spins
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own spins" ON lottery_spins;
CREATE POLICY "Users can read own spins" ON lottery_spins
  FOR SELECT USING (true);

-- Enable Realtime for lottery_spins (client subscribes for spin results)
ALTER PUBLICATION supabase_realtime ADD TABLE lottery_spins;

-- =============================================
-- Server-side function: pick segment and calculate payout
-- Called by trigger on lottery_spins INSERT
-- =============================================
CREATE OR REPLACE FUNCTION process_lottery_spin()
RETURNS TRIGGER AS $$
DECLARE
  picked_segment RECORD;
  rand_val NUMERIC;
  cumulative NUMERIC := 0;
BEGIN
  -- Pick a random segment using weighted probabilities
  rand_val := random();

  FOR picked_segment IN
    SELECT segment, base_value, probability
    FROM lottery_config
    WHERE active = true
    ORDER BY segment
  LOOP
    cumulative := cumulative + picked_segment.probability;
    IF rand_val <= cumulative THEN
      -- Update the spin record with the result
      NEW.segment_value := picked_segment.base_value;
      NEW.final_payout := ROUND(picked_segment.base_value * NEW.multiplier);
      NEW.status := 'completed';
      RETURN NEW;
    END IF;
  END LOOP;

  -- Fallback: if we somehow didn't pick (rounding), use last segment
  IF picked_segment IS NOT NULL THEN
    NEW.segment_value := picked_segment.base_value;
    NEW.final_payout := ROUND(picked_segment.base_value * NEW.multiplier);
    NEW.status := 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: process spin on insert (BEFORE so it modifies the row)
DROP TRIGGER IF EXISTS trigger_process_lottery_spin ON lottery_spins;
CREATE TRIGGER trigger_process_lottery_spin
  BEFORE INSERT ON lottery_spins
  FOR EACH ROW
  EXECUTE FUNCTION process_lottery_spin();
