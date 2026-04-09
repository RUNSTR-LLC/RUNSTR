-- Migration: Pass npub to claim-reward so push notifications fire
-- Problem: trigger_auto_reward() builds reward_body without npub, so claim-reward
--          skips the notify-user call (line 1336: `if (npub)` is always false).
-- Fix: Include NEW.npub in both PPQ and Lightning reward_body payloads.
-- Date: 2026-03-22

CREATE OR REPLACE FUNCTION trigger_auto_reward()
RETURNS TRIGGER AS $$
DECLARE
  user_lightning_address TEXT;
  user_ppq_bolt11 TEXT;
  project_url TEXT;
  service_key TEXT;
  tag_arr JSONB;
  reward_body JSONB;
BEGIN
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

  -- Check for PPQ.AI bolt11 invoice (stored directly on the row)
  user_ppq_bolt11 := NEW.ppq_bolt11;

  -- Extract Lightning address from raw_event -> tags (fallback for non-PPQ users)
  IF user_ppq_bolt11 IS NULL OR user_ppq_bolt11 = '' THEN
    IF NEW.raw_event IS NOT NULL AND NEW.raw_event->'tags' IS NOT NULL THEN
      FOR tag_arr IN SELECT * FROM jsonb_array_elements(NEW.raw_event->'tags')
      LOOP
        IF tag_arr->>0 = 'lightning' AND tag_arr->>1 IS NOT NULL THEN
          user_lightning_address := tag_arr->>1;
          EXIT; -- Found it, stop looking
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Need either ppq_bolt11 or lightning_address to pay reward
  IF (user_ppq_bolt11 IS NULL OR user_ppq_bolt11 = '')
     AND (user_lightning_address IS NULL OR user_lightning_address = '') THEN
    RAISE LOG '[auto_reward] No ppq_bolt11 or lightning address found for workout %', NEW.event_id;
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service key from vault
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url';

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF project_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING '[auto_reward] Missing vault secrets, cannot trigger reward';
    RETURN NEW;
  END IF;

  -- Build the claim-reward request body
  -- Include npub so claim-reward can send push notifications via notify-user
  -- PPQ.AI: pass ppq_bolt11 (claim-reward pays the invoice directly)
  -- Regular: pass lightning_address (claim-reward creates LNURL invoice)
  IF user_ppq_bolt11 IS NOT NULL AND user_ppq_bolt11 != '' THEN
    reward_body := jsonb_build_object(
      'operation', 'claim_reward',
      'ppq_bolt11', user_ppq_bolt11,
      'reward_type', 'workout',
      'amount_sats', 50,
      'npub', NEW.npub
    );
    RAISE LOG '[auto_reward] PPQ.AI reward for workout % (invoice: %...)',
      NEW.event_id, left(user_ppq_bolt11, 20);
  ELSE
    reward_body := jsonb_build_object(
      'operation', 'claim_reward',
      'lightning_address', user_lightning_address,
      'reward_type', 'workout',
      'amount_sats', 50,
      'npub', NEW.npub
    );
    RAISE LOG '[auto_reward] Lightning reward for workout % (address: %...)',
      NEW.event_id, left(user_lightning_address, 8);
  END IF;

  -- Call claim-reward edge function via pg_net (non-blocking HTTP POST)
  -- The edge function handles its own rate limiting (1 workout reward per day per address)
  PERFORM net.http_post(
    url := project_url || '/functions/v1/claim-reward',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := reward_body,
    timeout_milliseconds := 30000
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_auto_reward() IS
  'Auto-triggers 50 sat reward via claim-reward edge function when a verified cardio workout is inserted. '
  'Includes npub in request body so claim-reward can send push notifications via notify-user. '
  'PPQ.AI users: reads ppq_bolt11 from row and pays invoice directly. '
  'Regular users: extracts Lightning address from raw_event tags. Rate limiting handled by claim-reward.';
