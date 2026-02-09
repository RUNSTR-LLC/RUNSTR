-- Migration: Auto-reward trigger on workout submission
-- Purpose: Automatically call claim-reward edge function when a HealthKit/background
--          workout is inserted, so users earn 50 sats without opening the app.
-- Date: 2026-02-08

-- Function: Extract Lightning address from raw_event tags and call claim-reward
CREATE OR REPLACE FUNCTION trigger_auto_reward()
RETURNS TRIGGER AS $$
DECLARE
  user_lightning_address TEXT;
  project_url TEXT;
  service_key TEXT;
  tag_arr JSONB;
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

  -- Extract Lightning address from raw_event -> tags
  -- Tags format: [["lightning", "user@getalby.com"], ["exercise", "running"], ...]
  IF NEW.raw_event IS NOT NULL AND NEW.raw_event->'tags' IS NOT NULL THEN
    FOR tag_arr IN SELECT * FROM jsonb_array_elements(NEW.raw_event->'tags')
    LOOP
      IF tag_arr->>0 = 'lightning' AND tag_arr->>1 IS NOT NULL THEN
        user_lightning_address := tag_arr->>1;
        EXIT; -- Found it, stop looking
      END IF;
    END LOOP;
  END IF;

  -- No Lightning address = no reward (user hasn't set one)
  IF user_lightning_address IS NULL OR user_lightning_address = '' THEN
    RAISE LOG '[auto_reward] No lightning address found for workout %', NEW.event_id;
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

  -- Call claim-reward edge function via pg_net (non-blocking HTTP POST)
  -- The edge function handles its own rate limiting (1 workout reward per day per address)
  PERFORM net.http_post(
    url := project_url || '/functions/v1/claim-reward',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'operation', 'claim_reward',
      'lightning_address', user_lightning_address,
      'reward_type', 'workout',
      'amount_sats', 50
    ),
    timeout_milliseconds := 30000
  );

  RAISE LOG '[auto_reward] Triggered claim-reward for workout % (address: %...)',
    NEW.event_id, left(user_lightning_address, 8);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_auto_reward() IS
  'Auto-triggers 50 sat reward via claim-reward edge function when a verified cardio workout is inserted. '
  'Extracts Lightning address from raw_event tags. Rate limiting handled by claim-reward.';

-- Trigger fires AFTER INSERT so the row is committed before the HTTP call
CREATE TRIGGER auto_reward_on_workout_insert
  AFTER INSERT ON workout_submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_reward();

COMMENT ON TRIGGER auto_reward_on_workout_insert ON workout_submissions IS
  'Fires claim-reward for each new verified cardio workout with a Lightning address in tags';
