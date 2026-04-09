-- Migration 175: Fix double-payment bug + remove dead lottery code from daily_rewards
--
-- Fixes double-payment bug: the edge function (trigger_auto_reward -> claim-reward)
-- pays instantly on workout submission, but the zapper also polls daily_rewards
-- every 5 minutes. Without this filter, both paths pay the same user.
--
-- Fix: check daily_reward_claims (written by edge function) to exclude users
-- whose lightning address was already paid today. The zapper only catches users
-- the edge function missed.
--
-- Also removes the lottery_spins UNION since lottery was replaced by streak rewards
-- (handled in trigger_auto_reward, migration 174).
--
-- Date: 2026-04-09

CREATE OR REPLACE VIEW public.daily_rewards AS

WITH ein_participants AS (
    SELECT DISTINCT cp.npub
    FROM competition_participants cp
    JOIN competitions c ON cp.competition_id = c.id
    WHERE c.external_id = 'einundzwanzig'::text
), already_claimed_today AS (
    SELECT lightning_address_hash
    FROM daily_reward_claims
    WHERE workout_claimed = true
      AND reward_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York')::date
), workout_data AS (
    SELECT ws.npub,
        ws.created_at,
        ws.source,
        ws.wot_score,
        ws.first_seen_at,
        ( SELECT elem.value ->> 1
            FROM jsonb_array_elements(ws.raw_event -> 'tags'::text) elem(value)
            WHERE (elem.value ->> 0) = 'steps'::text
            LIMIT 1) AS steps,
        ( SELECT elem.value ->> 1
            FROM jsonb_array_elements(ws.raw_event -> 'tags'::text) elem(value)
            WHERE (elem.value ->> 0) = 'lightning'::text
            LIMIT 1) AS lightning_address,
        ( SELECT elem.value ->> 1
            FROM jsonb_array_elements(ws.raw_event -> 'tags'::text) elem(value)
            WHERE (elem.value ->> 0) = 'reward_destination'::text
            LIMIT 1) AS reward_destination,
        ( SELECT elem.value ->> 1
            FROM jsonb_array_elements(ws.raw_event -> 'tags'::text) elem(value)
            WHERE (elem.value ->> 0) = 'charity'::text
            LIMIT 1) AS charity_id,
        ( SELECT elem.value ->> 3
            FROM jsonb_array_elements(ws.raw_event -> 'tags'::text) elem(value)
            WHERE (elem.value ->> 0) = 'charity'::text
            LIMIT 1) AS charity_lightning_address,
        CASE
            WHEN ep.npub IS NOT NULL THEN true
            ELSE false
        END AS is_ein_participant,
        row_number() OVER (PARTITION BY ws.npub ORDER BY ws.created_at DESC) AS rn
    FROM workout_submissions ws
    LEFT JOIN ein_participants ep ON ws.npub = ep.npub
    WHERE ws.leaderboard_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York'::text)::date
        AND ws.raw_event IS NOT NULL
        AND (ws.distance_meters >= 1000::numeric OR ws.step_count >= 3000)
        AND (
            (( SELECT elem.value ->> 1
                FROM jsonb_array_elements(ws.raw_event -> 'tags'::text) elem(value)
                WHERE (elem.value ->> 0) = 'reward_destination'::text
                LIMIT 1)) = 'charity'::text
            OR COALESCE(ws.wot_score, 0::double precision) >= 0.0001::double precision
            OR ws.first_seen_at < ((CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York'::text) - '1 day'::interval)
        )
        -- Exclude users already paid today by the edge function
        -- Hash the lightning address the same way claim-reward does: sha256(lower(trim(address)))
        AND NOT EXISTS (
            SELECT 1 FROM already_claimed_today act
            WHERE act.lightning_address_hash = encode(
                extensions.digest(lower(trim(
                    ( SELECT elem.value ->> 1
                      FROM jsonb_array_elements(ws.raw_event -> 'tags') elem(value)
                      WHERE (elem.value ->> 0) = 'lightning'
                      LIMIT 1)
                )), 'sha256'), 'hex')
        )
)
SELECT npub,
    source,
    steps,
    wot_score,
    first_seen_at,
    lightning_address,
    reward_destination,
    charity_id,
    charity_lightning_address,
    is_ein_participant,
    CASE
        WHEN is_ein_participant THEN 100
        ELSE 50
    END AS sats_amount,
    created_at AS last_workout,
    CASE
        WHEN reward_destination = 'user'::text THEN lightning_address
        WHEN reward_destination = 'charity'::text THEN charity_lightning_address
        WHEN lightning_address IS NOT NULL THEN lightning_address
        ELSE charity_lightning_address
    END AS zap_to_address,
    'workout' AS reward_source
FROM workout_data
WHERE rn = 1
    AND (lightning_address IS NOT NULL OR charity_lightning_address IS NOT NULL)
ORDER BY sats_amount DESC;

COMMENT ON VIEW public.daily_rewards IS
  'Daily reward eligibility view for runstr-zapper. Shows one row per qualifying user. '
  'Excludes users already paid today (via daily_reward_claims) to prevent double-payment with edge function. '
  'Eligibility: distance >= 1km OR steps >= 3000. Anti-fraud: WoT >= 0.0001, account age > 1 day, or charity destination. '
  'Streak bonuses are handled by trigger_auto_reward (edge function path), not the zapper.';
