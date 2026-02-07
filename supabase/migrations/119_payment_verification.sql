-- Migration: Payment Verification Columns
-- Purpose: Store payment proof (hash + preimage) for reward claims
-- Date: 2026-01-18
--
-- Background: Currently we record workout_claimed=true but have no cryptographic proof
-- that the Lightning payment actually succeeded. This adds payment verification data.

-- Add payment verification columns for workout rewards
ALTER TABLE daily_reward_claims
ADD COLUMN IF NOT EXISTS workout_payment_hash TEXT,
ADD COLUMN IF NOT EXISTS workout_preimage TEXT;

-- Add payment verification columns for step rewards
ALTER TABLE daily_reward_claims
ADD COLUMN IF NOT EXISTS step_payment_hash TEXT,
ADD COLUMN IF NOT EXISTS step_preimage TEXT;

-- Add comments for documentation
COMMENT ON COLUMN daily_reward_claims.workout_payment_hash IS 'Lightning payment hash for workout reward - cryptographic proof of payment initiation';
COMMENT ON COLUMN daily_reward_claims.workout_preimage IS 'Lightning payment preimage for workout reward - cryptographic proof of payment completion';
COMMENT ON COLUMN daily_reward_claims.step_payment_hash IS 'Lightning payment hash for step rewards - cryptographic proof of payment initiation';
COMMENT ON COLUMN daily_reward_claims.step_preimage IS 'Lightning payment preimage for step rewards - cryptographic proof of payment completion';

-- Create view for verified payments (have preimage = confirmed receipt)
CREATE OR REPLACE VIEW verified_reward_claims AS
SELECT
    id,
    lightning_address_hash,
    reward_date,
    workout_claimed,
    workout_preimage IS NOT NULL AS workout_verified,
    step_sats_claimed,
    step_preimage IS NOT NULL AS steps_verified,
    created_at
FROM daily_reward_claims
WHERE workout_preimage IS NOT NULL OR step_preimage IS NOT NULL;

COMMENT ON VIEW verified_reward_claims IS 'View of reward claims with cryptographic payment proof';

-- Create view for unverified payments (claimed but no preimage = possible payment failure)
CREATE OR REPLACE VIEW unverified_reward_claims AS
SELECT
    id,
    lightning_address_hash,
    reward_date,
    workout_claimed,
    step_sats_claimed,
    created_at
FROM daily_reward_claims
WHERE (workout_claimed = true AND workout_preimage IS NULL)
   OR (step_sats_claimed > 0 AND step_preimage IS NULL);

COMMENT ON VIEW unverified_reward_claims IS 'View of reward claims without payment proof - may indicate payment failures';
