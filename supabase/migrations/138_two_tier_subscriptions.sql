-- Migration 138: Two-Tier Subscription System (Supporter + Pro)
--
-- Supporter (10k sats/mo): Season III access + boosted rewards (800 sats/workout)
-- Pro (15k sats/mo): Everything in Supporter + create clubs + create events
--
-- Existing 'creator' subscribers are upgraded to 'pro' (they had full access)

-- 1. Drop existing CHECK constraint on plan column
ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS subscribers_plan_check;

-- 2. Add new CHECK allowing supporter, pro, and creator (for migration safety)
ALTER TABLE subscribers ADD CONSTRAINT subscribers_plan_check
  CHECK (plan IN ('supporter', 'pro', 'creator'));

-- 3. Migrate existing 'creator' rows to 'pro' (they had full access, keep it)
UPDATE subscribers SET plan = 'pro' WHERE plan = 'creator';

-- 4. Now tighten the constraint to only supporter and pro
ALTER TABLE subscribers DROP CONSTRAINT subscribers_plan_check;
ALTER TABLE subscribers ADD CONSTRAINT subscribers_plan_check
  CHECK (plan IN ('supporter', 'pro'));

-- 5. Add index on plan for faster tier lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_plan ON subscribers(plan);

-- 6. Add requires_subscription field to CompetitionConfig
-- (This is stored in the JSONB config column, no schema change needed)
-- Example: UPDATE competitions SET config = config || '{"requires_subscription": "supporter"}'
-- for Season III events

-- 7. Update the auto-reward trigger to support boosted rewards for subscribers
-- The trigger passes reward amount to claim-reward edge function
CREATE OR REPLACE FUNCTION trigger_auto_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_lightning_address TEXT;
  v_plan TEXT;
  v_reward_amount INT := 50; -- default reward
  v_distance_m NUMERIC;
  v_duration_s NUMERIC;
  v_exercise TEXT;
  v_source TEXT;
  v_is_cardio BOOLEAN;
  v_is_boosted BOOLEAN := FALSE;
BEGIN
  -- Only fire for new workout submissions
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Look up user's Lightning address from reward_lightning_addresses table
  SELECT lightning_address INTO v_lightning_address
  FROM reward_lightning_addresses
  WHERE npub = NEW.npub
  LIMIT 1;

  -- No Lightning address = no reward
  IF v_lightning_address IS NULL OR v_lightning_address = '' THEN
    RETURN NEW;
  END IF;

  -- Check if user has an active subscription (supporter or pro)
  SELECT plan INTO v_plan
  FROM subscribers
  WHERE npub = NEW.npub
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;

  -- If subscriber, check if workout qualifies for boosted reward
  IF v_plan IN ('supporter', 'pro') THEN
    -- Extract workout metrics from the submission
    v_distance_m := COALESCE((NEW.metadata->>'distance_meters')::NUMERIC, 0);
    v_duration_s := COALESCE((NEW.metadata->>'duration_seconds')::NUMERIC, 0);
    v_exercise := LOWER(COALESCE(NEW.metadata->>'exercise', ''));
    v_source := LOWER(COALESCE(NEW.metadata->>'source', ''));

    -- Check cardio type
    v_is_cardio := v_exercise IN ('running', 'walking', 'cycling');

    -- Check non-manual source
    -- Manual entries don't qualify for boosted rewards
    v_is_boosted := v_is_cardio
      AND v_distance_m >= 2000      -- 2km minimum
      AND v_duration_s >= 900        -- 15 minutes minimum
      AND v_source <> 'manual_entry'; -- no manual entries

    IF v_is_boosted THEN
      v_reward_amount := 800;
    END IF;
  END IF;

  -- Insert reward claim (existing mechanism)
  INSERT INTO reward_claims (npub, amount_sats, lightning_address, status, metadata)
  VALUES (
    NEW.npub,
    v_reward_amount,
    v_lightning_address,
    'pending',
    jsonb_build_object(
      'workout_id', NEW.id,
      'boosted', v_is_boosted,
      'plan', COALESCE(v_plan, 'free')
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
