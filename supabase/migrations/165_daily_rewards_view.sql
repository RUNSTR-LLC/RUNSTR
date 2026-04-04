-- Migration 165: Create daily_rewards view for runstr-zapper
--
-- This view determines which users qualify for daily rewards and where to send them.
-- Used by runstr-zapper to process reward payments.
--
-- Logic:
--   1. Finds today's workouts (EST timezone) with distance >= 1km or steps >= 3000
--   2. Anti-fraud: requires WoT score >= 0.0001, account age > 1 day, OR charity destination
--   3. Picks the most recent qualifying workout per user (rn = 1)
--   4. Resolves zap_to_address based on reward_destination (user→their address, charity→charity address)
--   5. Einundzwanzig participants get 100 sats, everyone else gets 50

CREATE OR REPLACE VIEW public.daily_rewards AS
WITH ein_participants AS (
    SELECT DISTINCT cp.npub
    FROM competition_participants cp
    JOIN competitions c ON cp.competition_id = c.id
    WHERE c.external_id = 'einundzwanzig'::text
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
    END AS zap_to_address
FROM workout_data
WHERE rn = 1
    AND (lightning_address IS NOT NULL OR charity_lightning_address IS NOT NULL)
ORDER BY is_ein_participant DESC,
    (CASE WHEN is_ein_participant THEN 100 ELSE 50 END) DESC;

COMMENT ON VIEW public.daily_rewards IS
  'Daily reward eligibility view for runstr-zapper. Shows one row per qualifying user '
  'with their resolved zap_to_address based on reward destination preference.';
