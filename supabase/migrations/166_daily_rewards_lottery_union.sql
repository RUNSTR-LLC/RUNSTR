-- Migration 166: Add lottery spin wins to daily_rewards view
--
-- UNIONs lottery_spins (status='completed', not yet 'paid') into daily_rewards
-- so the zapper picks them up alongside workout rewards.
--
-- Lottery spins don't carry a lightning address, so we resolve it from the
-- user's most recent workout submission (which has their reward tags).
-- After the zapper pays a lottery win, it should UPDATE the spin status to 'paid'.

CREATE OR REPLACE VIEW public.daily_rewards AS

-- =============================================
-- PART 1: Workout rewards (existing logic)
-- =============================================
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
), workout_rewards AS (
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
),

-- =============================================
-- PART 2: Lottery spin wins (new)
-- =============================================
-- Resolve lightning address from the user's most recent workout submission
lottery_user_addresses AS (
    SELECT DISTINCT ON (ws.npub)
        ws.npub,
        ws.wot_score,
        ws.first_seen_at,
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
            LIMIT 1) AS charity_lightning_address
    FROM workout_submissions ws
    WHERE ws.raw_event IS NOT NULL
    ORDER BY ws.npub, ws.created_at DESC
), lottery_rewards AS (
    SELECT
        ls.npub,
        'lottery' AS source,
        NULL::text AS steps,
        lua.wot_score,
        lua.first_seen_at,
        lua.lightning_address,
        lua.reward_destination,
        lua.charity_id,
        lua.charity_lightning_address,
        false AS is_ein_participant,
        ls.final_payout AS sats_amount,
        ls.spun_at AS last_workout,
        CASE
            WHEN lua.reward_destination = 'user'::text THEN lua.lightning_address
            WHEN lua.reward_destination = 'charity'::text THEN lua.charity_lightning_address
            WHEN lua.lightning_address IS NOT NULL THEN lua.lightning_address
            ELSE lua.charity_lightning_address
        END AS zap_to_address,
        'lottery' AS reward_source
    FROM lottery_spins ls
    JOIN lottery_user_addresses lua ON ls.npub = lua.npub
    WHERE ls.status = 'completed'
        AND ls.final_payout > 0
        AND (CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York'::text)::date
            = lottery_spin_day(ls.spun_at)
)

-- =============================================
-- UNION: Workout rewards + Lottery wins
-- =============================================
SELECT npub, source, steps, wot_score, first_seen_at,
       lightning_address, reward_destination, charity_id,
       charity_lightning_address, is_ein_participant,
       sats_amount, last_workout, zap_to_address
FROM workout_rewards

UNION ALL

SELECT npub, source, steps, wot_score, first_seen_at,
       lightning_address, reward_destination, charity_id,
       charity_lightning_address, is_ein_participant,
       sats_amount, last_workout, zap_to_address
FROM lottery_rewards
WHERE zap_to_address IS NOT NULL

ORDER BY sats_amount DESC;

COMMENT ON VIEW public.daily_rewards IS
  'Daily reward eligibility view for runstr-zapper. Combines workout rewards and lottery spin wins. '
  'Workout rewards: one per qualifying user per day. Lottery wins: unpaid spins from today. '
  'Zapper should UPDATE lottery_spins SET status = paid after paying lottery wins.';
