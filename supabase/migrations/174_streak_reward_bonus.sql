-- Migration 173: Add streak bonus to auto-reward
--
-- Adds a streak-based bonus to workout rewards. Before calculating the payout,
-- the trigger queries consecutive workout days for the user and applies:
--   2 days: +10%, 3 days: +20%, 4 days: +30%, 5+ days: +40%
--
-- Base reward is 50 sats. With a 5-day streak: 70 sats.
--
-- Date: 2026-04-08

CREATE OR REPLACE FUNCTION trigger_auto_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_lightning_address TEXT;
  v_ppq_bolt11 TEXT;
  v_team_id TEXT;
  v_team_name TEXT;
  v_reward_amount INT := 50;
  v_streak_days INT := 0;
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
  -- ========================================

  v_ppq_bolt11 := NEW.ppq_bolt11;

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

  IF v_team_id IS NOT NULL AND v_team_id <> '' THEN
    SELECT name INTO v_team_name
    FROM user_teams
    WHERE id::text = v_team_id OR name = v_team_id
    LIMIT 1;
  END IF;

  IF (v_ppq_bolt11 IS NULL OR v_ppq_bolt11 = '')
     AND (v_lightning_address IS NULL OR v_lightning_address = '') THEN
    RAISE LOG '[auto_reward] No ppq_bolt11 or lightning address for workout %', NEW.event_id;
    RETURN NEW;
  END IF;

  -- ========================================
  -- Step 2: Calculate streak bonus
  -- Count consecutive days with workouts going backwards from today.
  -- 2 days: +10%, 3: +20%, 4: +30%, 5+: +40%
  -- ========================================

  WITH daily_workouts AS (
    SELECT DISTINCT leaderboard_date::date AS workout_date
    FROM workout_submissions
    WHERE npub = NEW.npub
      AND leaderboard_date IS NOT NULL
      AND leaderboard_date::date <= CURRENT_DATE
    ORDER BY workout_date DESC
    LIMIT 30
  ),
  numbered AS (
    SELECT workout_date,
           ROW_NUMBER() OVER (ORDER BY workout_date DESC) AS rn
    FROM daily_workouts
  )
  SELECT COUNT(*) INTO v_streak_days
  FROM numbered
  WHERE workout_date = CURRENT_DATE - (rn - 1)::int;

  IF v_streak_days >= 5 THEN
    v_reward_amount := v_reward_amount + (v_reward_amount * 40 / 100);
  ELSIF v_streak_days >= 4 THEN
    v_reward_amount := v_reward_amount + (v_reward_amount * 30 / 100);
  ELSIF v_streak_days >= 3 THEN
    v_reward_amount := v_reward_amount + (v_reward_amount * 20 / 100);
  ELSIF v_streak_days >= 2 THEN
    v_reward_amount := v_reward_amount + (v_reward_amount * 10 / 100);
  END IF;

  RAISE LOG '[auto_reward] Streak for %: % days, reward: % sats', NEW.npub, v_streak_days, v_reward_amount;

  -- ========================================
  -- Step 3: Call claim-reward edge function via pg_net
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

  IF v_ppq_bolt11 IS NOT NULL AND v_ppq_bolt11 <> '' THEN
    v_reward_body := jsonb_build_object(
      'operation', 'claim_reward',
      'ppq_bolt11', v_ppq_bolt11,
      'reward_type', 'workout',
      'amount_sats', v_reward_amount,
      'npub', NEW.npub,
      'team_name', v_team_name
    );
    RAISE LOG '[auto_reward] PPQ.AI reward (% sats, streak=%) for workout % (invoice: %..., team: %)',
      v_reward_amount, v_streak_days, NEW.event_id, left(v_ppq_bolt11, 20), COALESCE(v_team_name, 'none');
  ELSE
    v_reward_body := jsonb_build_object(
      'operation', 'claim_reward',
      'lightning_address', v_lightning_address,
      'reward_type', 'workout',
      'amount_sats', v_reward_amount,
      'npub', NEW.npub,
      'team_name', v_team_name
    );
    RAISE LOG '[auto_reward] Lightning reward (% sats, streak=%) for workout % (address: %..., team: %)',
      v_reward_amount, v_streak_days, NEW.event_id, left(v_lightning_address, 8), COALESCE(v_team_name, 'none');
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
  'Calculates streak bonus: 2 days +10%, 3 days +20%, 4 days +30%, 5+ days +40%. '
  'Base reward: 50 sats. Max with streak: 70 sats. '
  'PPQ.AI users: reads ppq_bolt11 from row and pays invoice directly. '
  'Regular users: extracts Lightning address from raw_event tags. '
  'Extracts team tag from raw_event and looks up team name from user_teams table. '
  'Includes npub and team_name in request body so claim-reward can send enriched push notifications. '
  'Rate limiting handled by claim-reward edge function.';
