-- Migration 151: Skip auto-rewards for old synced workouts
--
-- Problem: When a user installs the app and grants Health Connect/HealthKit
-- permissions, historical workouts (days/weeks old) get synced and submitted.
-- The auto-reward trigger fires for each one, giving rewards for nothing.
--
-- Fix: If the workout's created_at predates the user's first_seen_at by more
-- than 24 hours, it's a historical sync — skip the reward. This allows recent
-- workouts (last 24h) to still earn rewards on first install.
--
-- Date: 2026-02-25

CREATE OR REPLACE FUNCTION trigger_auto_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_lightning_address TEXT;
  v_ppq_bolt11 TEXT;
  v_team_id TEXT;
  v_team_name TEXT;
  v_plan TEXT;
  v_reward_amount INT := 100;  -- default reward
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

  -- Only trigger for reward-eligible workout types
  IF NEW.activity_type NOT IN ('running', 'walking', 'cycling', 'hiking', 'strength', 'journal') THEN
    RETURN NEW;
  END IF;

  -- Cardio workouts require distance; strength and journal do not
  IF NEW.activity_type IN ('running', 'walking', 'cycling', 'hiking') THEN
    IF NEW.distance_meters IS NULL OR NEW.distance_meters <= 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Only trigger for verified workouts
  IF NEW.verified IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- ========================================
  -- Safeguard: Skip old synced workouts
  -- If the workout happened >24h before the user's first submission,
  -- it's a historical Health Connect/HealthKit sync, not a fresh workout.
  -- ========================================
  IF NEW.first_seen_at IS NOT NULL AND NEW.created_at IS NOT NULL THEN
    IF NEW.created_at < (NEW.first_seen_at - INTERVAL '24 hours') THEN
      RAISE LOG '[auto_reward] Skipping old synced workout (workout: %, first_seen: %, npub: %)',
        NEW.created_at, NEW.first_seen_at, left(NEW.npub, 12);
      RETURN NEW;
    END IF;
  END IF;

  -- ========================================
  -- Step 1: Determine payment destination
  -- PPQ.AI users have a bolt11 invoice on the row
  -- Regular users have a Lightning address in raw_event tags
  -- Also extract team tag for notification enrichment
  -- ========================================

  -- Check for PPQ.AI bolt11 invoice (stored directly on the row by the app)
  v_ppq_bolt11 := NEW.ppq_bolt11;

  -- If not PPQ, extract Lightning address and team tag from raw_event tags
  IF v_ppq_bolt11 IS NULL OR v_ppq_bolt11 = '' THEN
    IF NEW.raw_event IS NOT NULL AND NEW.raw_event->'tags' IS NOT NULL THEN
      FOR tag_arr IN SELECT * FROM jsonb_array_elements(NEW.raw_event->'tags')
      LOOP
        IF tag_arr->>0 = 'lightning' AND tag_arr->>1 IS NOT NULL THEN
          v_lightning_address := tag_arr->>1;
        END IF;
        IF tag_arr->>0 = 'team' AND tag_arr->>1 IS NOT NULL THEN
          v_team_id := tag_arr->>1;
        END IF;
      END LOOP;
    END IF;
  ELSE
    -- PPQ path: still extract team tag for notification enrichment
    IF NEW.raw_event IS NOT NULL AND NEW.raw_event->'tags' IS NOT NULL THEN
      FOR tag_arr IN SELECT * FROM jsonb_array_elements(NEW.raw_event->'tags')
      LOOP
        IF tag_arr->>0 = 'team' AND tag_arr->>1 IS NOT NULL THEN
          v_team_id := tag_arr->>1;
          EXIT;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Look up team name if we found a team tag
  IF v_team_id IS NOT NULL AND v_team_id <> '' THEN
    SELECT name INTO v_team_name
    FROM user_teams
    WHERE id::text = v_team_id OR name = v_team_id
    LIMIT 1;
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
  -- PPQ.AI free-tier gets 100 sats (API minimum)
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
  -- and team_name for enriched notification content
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
  -- Include team_name so notification can mention the charity
  IF v_ppq_bolt11 IS NOT NULL AND v_ppq_bolt11 <> '' THEN
    v_reward_body := jsonb_build_object(
      'operation', 'claim_reward',
      'ppq_bolt11', v_ppq_bolt11,
      'reward_type', 'workout',
      'amount_sats', v_reward_amount,
      'npub', NEW.npub,
      'team_name', v_team_name
    );
    RAISE LOG '[auto_reward] PPQ.AI reward (% sats) for workout % (invoice: %..., team: %)',
      v_reward_amount, NEW.event_id, left(v_ppq_bolt11, 20), COALESCE(v_team_name, 'none');
  ELSE
    v_reward_body := jsonb_build_object(
      'operation', 'claim_reward',
      'lightning_address', v_lightning_address,
      'reward_type', 'workout',
      'amount_sats', v_reward_amount,
      'npub', NEW.npub,
      'team_name', v_team_name
    );
    RAISE LOG '[auto_reward] Lightning reward (% sats, boosted=%) for workout % (address: %..., team: %)',
      v_reward_amount, v_is_boosted, NEW.event_id, left(v_lightning_address, 8), COALESCE(v_team_name, 'none');
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
  'Auto-triggers reward via claim-reward edge function when a verified workout is inserted. '
  'Eligible types: running, walking, cycling, hiking (require distance), strength, journal (no distance required). '
  'Safeguard: Skips workouts where created_at predates first_seen_at by >24h (old Health Connect/HealthKit syncs). '
  'PPQ.AI users: reads ppq_bolt11 from row and pays invoice directly. '
  'Regular users: extracts Lightning address from raw_event tags (100 sats default). '
  'Subscribers (supporter/pro): 800 sats for qualifying cardio workouts (2km+, 15min+, non-manual). '
  'Extracts team tag from raw_event and looks up team name from user_teams table. '
  'Includes npub and team_name in request body so claim-reward can send enriched push notifications. '
  'Rate limiting handled by claim-reward edge function.';
