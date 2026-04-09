-- Migration 143: Pass npub to claim-reward for push notifications
--
-- Problem: trigger_auto_reward() calls claim-reward edge function but doesn't
-- include the user's npub. Without npub, claim-reward can't look up the user's
-- push token to send "Reward Earned!" notifications.
--
-- Fix: Add 'npub' field to v_reward_body in both PPQ and Lightning paths.
-- The npub is available as NEW.npub from the workout_submissions insert row.
--
-- Date: 2026-02-19

CREATE OR REPLACE FUNCTION trigger_auto_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_lightning_address TEXT;
  v_ppq_bolt11 TEXT;
  v_plan TEXT;
  v_reward_amount INT := 50;  -- default reward
  v_is_boosted BOOLEAN := FALSE;
  v_project_url TEXT;
  v_service_key TEXT;
  v_reward_body JSONB;
  tag_arr JSONB;
BEGIN
  -- Only fire on INSERT
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Only trigger for cardio workouts with distance
  IF NEW.activity_type NOT IN ('running', 'walking', 'cycling', 'hiking') THEN
    RETURN NEW;
  END IF;

  IF NEW.distance_meters IS NULL OR NEW.distance_meters <= 0 THEN
    RETURN NEW;
  END IF;

  -- Only trigger for verified workouts
  IF NEW.verified IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- ========================================
  -- Step 1: Determine payment destination
  -- PPQ.AI users have a bolt11 invoice on the row
  -- Regular users have a Lightning address in raw_event tags
  -- ========================================

  -- Check for PPQ.AI bolt11 invoice (stored directly on the row by the app)
  v_ppq_bolt11 := NEW.ppq_bolt11;

  -- If not PPQ, extract Lightning address from raw_event tags
  IF v_ppq_bolt11 IS NULL OR v_ppq_bolt11 = '' THEN
    IF NEW.raw_event IS NOT NULL AND NEW.raw_event->'tags' IS NOT NULL THEN
      FOR tag_arr IN SELECT * FROM jsonb_array_elements(NEW.raw_event->'tags')
      LOOP
        IF tag_arr->>0 = 'lightning' AND tag_arr->>1 IS NOT NULL THEN
          v_lightning_address := tag_arr->>1;
          EXIT;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Need either ppq_bolt11 or lightning_address to pay reward
  IF (v_ppq_bolt11 IS NULL OR v_ppq_bolt11 = '')
     AND (v_lightning_address IS NULL OR v_lightning_address = '') THEN
    RAISE LOG '[auto_reward] No ppq_bolt11 or lightning address for workout %', NEW.event_id;
    RETURN NEW;
  END IF;

  -- ========================================
  -- Step 2: Check subscription tier for boosted rewards
  -- Supporters/Pro get 800 sats if workout qualifies
  -- ========================================

  SELECT plan INTO v_plan
  FROM subscribers
  WHERE npub = NEW.npub
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;

  IF v_plan IN ('supporter', 'pro') THEN
    -- Boost if: cardio, 2km+ distance, 15min+ duration, non-manual
    v_is_boosted := NEW.activity_type IN ('running', 'walking', 'cycling')
      AND COALESCE(NEW.distance_meters, 0) >= 2000
      AND COALESCE(NEW.duration_seconds, 0) >= 900
      AND COALESCE(NEW.source, '') <> 'manual_entry';

    IF v_is_boosted THEN
      v_reward_amount := 800;
    END IF;
  END IF;

  -- ========================================
  -- Step 3: Call claim-reward edge function via pg_net
  -- Now includes npub for push notification targeting
  -- ========================================

  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF v_project_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING '[auto_reward] Missing vault secrets, cannot trigger reward';
    RETURN NEW;
  END IF;

  -- Build request body: PPQ gets bolt11, regular gets lightning_address
  -- Include npub so claim-reward can send push notifications
  IF v_ppq_bolt11 IS NOT NULL AND v_ppq_bolt11 <> '' THEN
    v_reward_body := jsonb_build_object(
      'operation', 'claim_reward',
      'ppq_bolt11', v_ppq_bolt11,
      'reward_type', 'workout',
      'amount_sats', v_reward_amount,
      'npub', NEW.npub
    );
    RAISE LOG '[auto_reward] PPQ.AI reward (% sats) for workout % (invoice: %...)',
      v_reward_amount, NEW.event_id, left(v_ppq_bolt11, 20);
  ELSE
    v_reward_body := jsonb_build_object(
      'operation', 'claim_reward',
      'lightning_address', v_lightning_address,
      'reward_type', 'workout',
      'amount_sats', v_reward_amount,
      'npub', NEW.npub
    );
    RAISE LOG '[auto_reward] Lightning reward (% sats, boosted=%) for workout % (address: %...)',
      v_reward_amount, v_is_boosted, NEW.event_id, left(v_lightning_address, 8);
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/claim-reward',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := v_reward_body,
    timeout_milliseconds := 30000
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_auto_reward() IS
  'Auto-triggers reward via claim-reward edge function when a verified cardio workout is inserted. '
  'PPQ.AI users: reads ppq_bolt11 from row and pays invoice directly. '
  'Regular users: extracts Lightning address from raw_event tags. '
  'Subscribers (supporter/pro): 800 sats for qualifying workouts (2km+, 15min+, non-manual). '
  'Includes npub in request body so claim-reward can send push notifications. '
  'Rate limiting handled by claim-reward edge function.';
