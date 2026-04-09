-- RUNSTR Reward System Health Monitoring Queries
-- Date: January 18, 2026
-- Run these queries in Supabase SQL Editor to monitor reward system health

-- ============================================
-- SECTION 1: DAILY HEALTH DASHBOARD
-- ============================================

-- QUERY 1: Daily reward system summary (run daily)
SELECT
  reward_date,
  COUNT(*) as total_claims,
  SUM(CASE WHEN workout_claimed THEN 1 ELSE 0 END) as workout_claims,
  SUM(step_sats_claimed) as total_step_sats,
  COUNT(DISTINCT lightning_address_hash) as unique_users
FROM daily_reward_claims
WHERE reward_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY reward_date
ORDER BY reward_date DESC;

-- ============================================
-- SECTION 2: CHARITY PAYMENT HEALTH
-- ============================================

-- QUERY 2: Charity donations by charity (CRITICAL - check all charities are receiving)
SELECT
  charity_id,
  charity_name,
  COUNT(*) as payment_count,
  SUM(amount_sats) as total_sats,
  COUNT(DISTINCT user_pubkey) as unique_donors,
  MAX(created_at) as last_payment
FROM charity_reward_payments
GROUP BY charity_id, charity_name
ORDER BY total_sats DESC;

-- QUERY 3: Recent charity payments (verify payments are flowing)
SELECT
  created_at,
  charity_name,
  amount_sats,
  reward_type,
  status,
  paid_at
FROM charity_reward_payments
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- SECTION 3: FAILURE DETECTION
-- ============================================

-- QUERY 4: Payments stuck in pending (should be empty or minimal)
SELECT
  charity_id,
  charity_name,
  COUNT(*) as pending_count,
  SUM(amount_sats) as pending_sats,
  MIN(created_at) as oldest_pending
FROM charity_reward_payments
WHERE status = 'pending' AND paid_at IS NULL
GROUP BY charity_id, charity_name
ORDER BY pending_count DESC;

-- QUERY 5: Failed charity payments with error details
SELECT
  created_at,
  charity_id,
  charity_name,
  charity_lightning_address,
  amount_sats,
  error_message,
  lnurl_response
FROM charity_reward_payments
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- QUERY 6: Failed payments grouped by charity (identify systematic issues)
SELECT
  charity_id,
  charity_name,
  charity_lightning_address,
  COUNT(*) as failure_count,
  SUM(amount_sats) as total_failed_sats,
  MAX(created_at) as last_failure
FROM charity_reward_payments
WHERE status = 'failed'
GROUP BY charity_id, charity_name, charity_lightning_address
ORDER BY failure_count DESC;

-- ============================================
-- SECTION 4: PAYMENT VERIFICATION
-- ============================================

-- QUERY 7: Verified vs unverified workout claims (check preimage coverage)
SELECT
  reward_date,
  COUNT(*) as total_claims,
  SUM(CASE WHEN workout_claimed THEN 1 ELSE 0 END) as workout_claimed,
  SUM(CASE WHEN workout_preimage IS NOT NULL THEN 1 ELSE 0 END) as workout_verified,
  SUM(CASE WHEN step_sats_claimed > 0 THEN 1 ELSE 0 END) as step_claimed,
  SUM(CASE WHEN step_preimage IS NOT NULL THEN 1 ELSE 0 END) as step_verified
FROM daily_reward_claims
WHERE reward_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY reward_date
ORDER BY reward_date DESC;

-- QUERY 8: Unverified payments (claimed but no preimage - possible failures)
SELECT
  id,
  lightning_address_hash,
  reward_date,
  workout_claimed,
  step_sats_claimed,
  created_at
FROM daily_reward_claims
WHERE (workout_claimed = true AND workout_preimage IS NULL)
   OR (step_sats_claimed > 0 AND step_preimage IS NULL)
ORDER BY created_at DESC
LIMIT 50;

-- ============================================
-- SECTION 5: USER-LEVEL DIAGNOSTICS
-- ============================================

-- QUERY 9: Check specific user's reward history
-- Replace 'USER_ADDRESS_HASH_HERE' with SHA256 of their lowercase Lightning address
SELECT
  reward_date,
  workout_claimed,
  workout_preimage IS NOT NULL as workout_verified,
  step_sats_claimed,
  step_preimage IS NOT NULL as steps_verified,
  created_at
FROM daily_reward_claims
WHERE lightning_address_hash = 'USER_ADDRESS_HASH_HERE'
ORDER BY reward_date DESC
LIMIT 30;

-- QUERY 10: Check specific user's charity donations
-- Replace 'USER_HEX_PUBKEY_HERE' with user's hex pubkey
SELECT
  created_at,
  charity_name,
  amount_sats,
  reward_type,
  donation_percentage,
  status,
  error_message
FROM charity_reward_payments
WHERE user_pubkey = 'USER_HEX_PUBKEY_HERE'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- SECTION 6: WEEKLY HEALTH CHECK
-- ============================================

-- QUERY 11: Comprehensive weekly health report
WITH weekly_stats AS (
  SELECT
    DATE_TRUNC('week', reward_date) as week,
    COUNT(*) as claims,
    SUM(CASE WHEN workout_claimed THEN 1 ELSE 0 END) as workouts,
    SUM(step_sats_claimed) as step_sats
  FROM daily_reward_claims
  WHERE reward_date >= CURRENT_DATE - INTERVAL '4 weeks'
  GROUP BY DATE_TRUNC('week', reward_date)
),
charity_stats AS (
  SELECT
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as donations,
    SUM(amount_sats) as charity_sats,
    COUNT(DISTINCT charity_id) as charities_receiving,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
  FROM charity_reward_payments
  WHERE created_at >= CURRENT_DATE - INTERVAL '4 weeks'
  GROUP BY DATE_TRUNC('week', created_at)
)
SELECT
  w.week,
  w.claims,
  w.workouts,
  w.step_sats,
  COALESCE(c.donations, 0) as charity_donations,
  COALESCE(c.charity_sats, 0) as charity_sats,
  COALESCE(c.charities_receiving, 0) as charities_active,
  COALESCE(c.successful, 0) as charity_success,
  COALESCE(c.failed, 0) as charity_failed
FROM weekly_stats w
LEFT JOIN charity_stats c ON w.week = c.week
ORDER BY w.week DESC;

-- ============================================
-- SECTION 7: ALERT QUERIES (Check for Problems)
-- ============================================

-- QUERY 12: Alert - No successful charity payments in last 24h (should return 0 rows if healthy)
SELECT 'NO_RECENT_CHARITY_PAYMENTS' as alert
WHERE NOT EXISTS (
  SELECT 1 FROM charity_reward_payments
  WHERE status = 'success'
    AND created_at >= NOW() - INTERVAL '24 hours'
);

-- QUERY 13: Alert - High failure rate (>20% failures in last 24h)
SELECT
  'HIGH_FAILURE_RATE' as alert,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::float / COUNT(*)::float * 100 as failure_rate_pct
FROM charity_reward_payments
WHERE created_at >= NOW() - INTERVAL '24 hours'
HAVING SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::float / COUNT(*)::float > 0.2;

-- QUERY 14: Alert - Charity with no recent payments (charities that haven't received in 7 days)
SELECT
  charity_id,
  charity_name,
  MAX(created_at) as last_payment
FROM charity_reward_payments
WHERE status = 'success'
GROUP BY charity_id, charity_name
HAVING MAX(created_at) < NOW() - INTERVAL '7 days'
ORDER BY last_payment;

-- ============================================
-- SECTION 8: DAILY REWARD PARTICIPANTS
-- ============================================

-- QUERY 15: Today's reward participants with Lightning addresses + PPQ.AI bolt11
-- Use this to find all users eligible for daily rewards with their zap addresses
-- PPQ.AI users: pay ppq_bolt11 directly (skip LNURL), zap_to_address will be NULL
-- Subscribers (supporter/pro): get 800 sats for qualifying workouts
WITH ein_participants AS (
    SELECT DISTINCT cp.npub
    FROM competition_participants cp
    JOIN competitions c ON cp.competition_id = c.id
    WHERE c.external_id = 'einundzwanzig'
  ),
  active_subscribers AS (
    SELECT npub, plan
    FROM subscribers
    WHERE status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
  ),
  workout_data AS (
    SELECT
      ws.npub,
      ws.created_at,
      ws.source,
      ws.ppq_bolt11,
      ws.distance_meters,
      ws.duration_seconds,
      ws.activity_type,
      (
        SELECT elem->>1
        FROM jsonb_array_elements(ws.raw_event->'tags') AS elem
        WHERE elem->>0 = 'steps'
        LIMIT 1
      ) AS steps,
      (
        SELECT elem->>1
        FROM jsonb_array_elements(ws.raw_event->'tags') AS elem
        WHERE elem->>0 = 'lightning'
        LIMIT 1
      ) AS lightning_address,
      (
        SELECT elem->>1
        FROM jsonb_array_elements(ws.raw_event->'tags') AS elem
        WHERE elem->>0 = 'reward_destination'
        LIMIT 1
      ) AS reward_destination,
      (
        SELECT elem->>1
        FROM jsonb_array_elements(ws.raw_event->'tags') AS elem
        WHERE elem->>0 = 'charity'
        LIMIT 1
      ) AS charity_id,
      (
        SELECT elem->>3
        FROM jsonb_array_elements(ws.raw_event->'tags') AS elem
        WHERE elem->>0 = 'charity'
        LIMIT 1
      ) AS charity_lightning_address,
      CASE WHEN ep.npub IS NOT NULL THEN true ELSE false END AS is_ein_participant,
      sub.plan AS subscriber_plan,
      ROW_NUMBER() OVER (PARTITION BY ws.npub ORDER BY ws.created_at DESC) AS rn
    FROM workout_submissions ws
    LEFT JOIN ein_participants ep ON ws.npub = ep.npub
    LEFT JOIN active_subscribers sub ON ws.npub = sub.npub
    WHERE ws.leaderboard_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York')::date
      AND ws.raw_event IS NOT NULL
      AND (
        ws.source = 'app'
        OR (ws.source = 'nostr_scan' AND ws.distance_meters IS NULL)
      )
  )
  SELECT
    npub,
    source,
    steps,
    lightning_address,
    reward_destination,
    charity_id,
    charity_lightning_address,
    ppq_bolt11,
    subscriber_plan,
    is_ein_participant,
    -- Reward amount: subscriber boost > ein bonus > default
    CASE
      WHEN subscriber_plan IN ('supporter', 'pro')
        AND activity_type IN ('running', 'walking', 'cycling')
        AND COALESCE(distance_meters, 0) >= 2000
        AND COALESCE(duration_seconds, 0) >= 900
        AND COALESCE(source, '') <> 'manual_entry'
        THEN 800
      WHEN is_ein_participant THEN 100
      ELSE 50
    END AS sats_amount,
    created_at AS last_workout,
    -- Zap destination: PPQ users get NULL here (use ppq_bolt11 column instead)
    CASE
      WHEN reward_destination = 'ppq' THEN NULL
      WHEN reward_destination = 'user' THEN lightning_address
      WHEN reward_destination = 'charity' THEN charity_lightning_address
      WHEN lightning_address IS NOT NULL THEN lightning_address
      ELSE charity_lightning_address
    END AS zap_to_address
  FROM workout_data
  WHERE rn = 1
    AND (
      lightning_address IS NOT NULL
      OR charity_lightning_address IS NOT NULL
      OR (ppq_bolt11 IS NOT NULL AND ppq_bolt11 <> '')
    )
  ORDER BY is_ein_participant DESC, sats_amount DESC;
