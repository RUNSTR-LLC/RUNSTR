-- Migration: Add WoT score and first_seen_at for fraud prevention
--
-- This enables gating rewards based on Web of Trust score and account age:
-- - wot_score: Brainstorm NIP-85 rank sent with each workout
-- - first_seen_at: Timestamp of user's first workout submission (tracks account age)
--
-- External reward tool uses these to gate personal rewards:
-- - High WoT (≥0.0001): Instant personal rewards
-- - Low WoT + account age ≥ 1 day: Personal rewards allowed
-- - Low WoT + account age < 1 day: Charity rewards only (prevents farming)

-- Add wot_score column to workout_submissions
ALTER TABLE workout_submissions
ADD COLUMN IF NOT EXISTS wot_score FLOAT DEFAULT 0;

-- Add first_seen_at column to track when user first submitted a workout
ALTER TABLE workout_submissions
ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;

-- Create index on wot_score for reward eligibility queries
CREATE INDEX IF NOT EXISTS idx_workout_submissions_wot_score
ON workout_submissions (wot_score);

-- Create index on first_seen_at for account age filtering
CREATE INDEX IF NOT EXISTS idx_workout_submissions_first_seen_at
ON workout_submissions (first_seen_at);

-- Create index on npub + first_seen_at for per-user account age lookups
CREATE INDEX IF NOT EXISTS idx_workout_submissions_npub_first_seen
ON workout_submissions (npub, first_seen_at);

-- Function to get or set first_seen_at for a user
-- Called by submit-workout edge function before insert
CREATE OR REPLACE FUNCTION get_or_create_first_seen_at(user_npub TEXT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  existing_first_seen TIMESTAMPTZ;
BEGIN
  -- Look up existing first_seen_at for this npub
  SELECT MIN(first_seen_at) INTO existing_first_seen
  FROM workout_submissions
  WHERE npub = user_npub
    AND first_seen_at IS NOT NULL;

  -- If found, return it; otherwise return current timestamp
  IF existing_first_seen IS NOT NULL THEN
    RETURN existing_first_seen;
  ELSE
    RETURN NOW();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the fraud prevention system
COMMENT ON COLUMN workout_submissions.wot_score IS
  'Brainstorm NIP-85 Web of Trust rank at time of submission. Used for fraud prevention gating.';

COMMENT ON COLUMN workout_submissions.first_seen_at IS
  'Timestamp when this npub first submitted a workout. Used with wot_score for account age gating.';
