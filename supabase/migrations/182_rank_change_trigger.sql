-- Migration 182: notify_rank_changes() trigger function.
-- Fires AFTER INSERT and AFTER UPDATE on workout_submissions.
-- Recomputes affected leaderboards inline, diffs against snapshot state,
-- and invokes notify-user via net.http_post (async) for any rank delta.
--
-- Scope: covers the 5 daily leaderboards (5K, 10K, Half, Marathon, Steps) and
-- all captain-created events (competitions where created_by_npub IS NOT NULL).
-- KNOWN GAP: cycling daily leaderboards (time_cycling_20k_seconds and friends
-- from migration 177) are NOT covered — they were out of scope for the design
-- spec and the daily_leaderboard_rank_snapshots.leaderboard_id CHECK constraint
-- would reject cycling values. Adding cycling requires a spec amendment.

CREATE OR REPLACE FUNCTION notify_rank_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url        TEXT;
  service_key        TEXT;
  today_date         DATE;
  affected_lbs       TEXT[];
  lb_id              TEXT;
  rank_row           RECORD;
  prior_rank         SMALLINT;
  push_body          TEXT;
  event_row          RECORD;
  event_rank_row     RECORD;
  event_prior_rank   SMALLINT;
BEGIN
  -- Pull Supabase URL and service-role key from vault (same pattern as migration 127).
  SELECT decrypted_secret INTO project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  IF project_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING '[notify_rank_changes] Missing vault secrets, cannot send pushes';
    RETURN NEW;
  END IF;

  RAISE LOG '[notify_rank_changes] Fired for workout % (npub: %, activity: %)', NEW.id, left(NEW.npub, 12), NEW.activity_type;

  today_date := NEW.leaderboard_date;

  IF today_date IS NULL THEN
    RAISE WARNING '[notify_rank_changes] leaderboard_date is NULL for workout %, skipping daily leaderboards', NEW.id;
  ELSE
  -- =============================================
  -- 1. Daily leaderboards
  -- =============================================
  affected_lbs := ARRAY[]::TEXT[];
  IF NEW.time_5k_seconds IS NOT NULL AND NEW.activity_type = 'running' THEN
    affected_lbs := array_append(affected_lbs, '5k');
  END IF;
  IF NEW.time_10k_seconds IS NOT NULL AND NEW.activity_type = 'running' THEN
    affected_lbs := array_append(affected_lbs, '10k');
  END IF;
  IF NEW.time_half_seconds IS NOT NULL AND NEW.activity_type = 'running' THEN
    affected_lbs := array_append(affected_lbs, 'half_marathon');
  END IF;
  IF NEW.time_marathon_seconds IS NOT NULL AND NEW.activity_type = 'running' THEN
    affected_lbs := array_append(affected_lbs, 'marathon');
  END IF;
  IF NEW.activity_type = 'steps' AND NEW.step_count IS NOT NULL THEN
    affected_lbs := array_append(affected_lbs, 'steps');
  END IF;

  FOREACH lb_id IN ARRAY affected_lbs
  LOOP
    -- Recompute today's ranks for this leaderboard.
    FOR rank_row IN
      WITH ranked AS (
        SELECT
          ws.npub,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE lb_id
                WHEN '5k'            THEN ws.time_5k_seconds
                WHEN '10k'           THEN ws.time_10k_seconds
                WHEN 'half_marathon' THEN ws.time_half_seconds
                WHEN 'marathon'      THEN ws.time_marathon_seconds
              END ASC NULLS LAST,
              CASE WHEN lb_id = 'steps' THEN -ws.step_count END ASC NULLS LAST,
              ws.created_at ASC
          )::SMALLINT AS rank
        FROM workout_submissions ws
        WHERE ws.leaderboard_date = today_date
          AND ws.verified IS TRUE
          AND (
            (lb_id = '5k'            AND ws.time_5k_seconds       IS NOT NULL AND ws.activity_type = 'running') OR
            (lb_id = '10k'           AND ws.time_10k_seconds      IS NOT NULL AND ws.activity_type = 'running') OR
            (lb_id = 'half_marathon' AND ws.time_half_seconds     IS NOT NULL AND ws.activity_type = 'running') OR
            (lb_id = 'marathon'      AND ws.time_marathon_seconds IS NOT NULL AND ws.activity_type = 'running') OR
            (lb_id = 'steps'         AND ws.step_count            IS NOT NULL AND ws.activity_type = 'steps')
          )
      )
      SELECT * FROM ranked
    LOOP
      SELECT s.rank INTO prior_rank
      FROM daily_leaderboard_rank_snapshots s
      WHERE s.snapshot_date = today_date AND s.leaderboard_id = lb_id AND s.npub = rank_row.npub;

      IF prior_rank IS DISTINCT FROM rank_row.rank THEN
        push_body := body_for_transition(prior_rank, rank_row.rank, daily_leaderboard_label(lb_id));

        PERFORM net.http_post(
          url := project_url || '/functions/v1/notify-user',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_key
          ),
          body := jsonb_build_object(
            'npub', rank_row.npub,
            'title', 'Standings update',
            'body', push_body,
            'data', jsonb_build_object(
              'type', 'rank_change',
              'leaderboard_id', lb_id,
              'previous_rank', prior_rank,
              'current_rank', rank_row.rank,
              'deep_link', 'leaderboard'
            )
          ),
          timeout_milliseconds := 30000
        );

        INSERT INTO daily_leaderboard_rank_snapshots (snapshot_date, leaderboard_id, npub, rank)
        VALUES (today_date, lb_id, rank_row.npub, rank_row.rank)
        ON CONFLICT (snapshot_date, leaderboard_id, npub)
        DO UPDATE SET rank = EXCLUDED.rank, last_updated_at = NOW();
      END IF;
    END LOOP;
  END LOOP;
  END IF; -- today_date IS NOT NULL

  -- =============================================
  -- 2. Captain events that include this workout in their window
  -- =============================================
  FOR event_row IN
    SELECT id, name, scoring_method, activity_type, start_date, end_date
    FROM competitions
    WHERE created_by_npub IS NOT NULL
      AND NEW.created_at >= start_date
      AND NEW.created_at <  end_date
      AND activity_type = NEW.activity_type
  LOOP
    FOR event_rank_row IN
      WITH ranked AS (
        SELECT
          ws.npub,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE event_row.scoring_method
                WHEN 'total_distance' THEN -SUM(ws.distance_meters)
                WHEN 'total_duration' THEN -SUM(ws.duration_seconds)
                WHEN 'workout_count'  THEN -COUNT(*)::numeric
                WHEN 'fastest_time'   THEN MIN(ws.duration_seconds)
              END ASC,
              MIN(ws.created_at) ASC
          )::SMALLINT AS rank
        FROM workout_submissions ws
        JOIN competition_participants cp ON cp.npub = ws.npub AND cp.competition_id = event_row.id
        WHERE ws.activity_type = event_row.activity_type
          AND ws.verified IS TRUE
          AND ws.created_at >= event_row.start_date
          AND ws.created_at <  event_row.end_date
        GROUP BY ws.npub
      )
      SELECT * FROM ranked
    LOOP
      SELECT s.rank INTO event_prior_rank
      FROM event_leaderboard_rank_snapshots s
      WHERE s.event_id = event_row.id AND s.npub = event_rank_row.npub;

      IF event_prior_rank IS DISTINCT FROM event_rank_row.rank THEN
        push_body := body_for_transition(event_prior_rank, event_rank_row.rank, event_row.name);

        PERFORM net.http_post(
          url := project_url || '/functions/v1/notify-user',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_key
          ),
          body := jsonb_build_object(
            'npub', event_rank_row.npub,
            'title', 'Standings update',
            'body', push_body,
            'data', jsonb_build_object(
              'type', 'rank_change',
              'event_id', event_row.id,
              'previous_rank', event_prior_rank,
              'current_rank', event_rank_row.rank,
              'deep_link', 'leaderboard'
            )
          ),
          timeout_milliseconds := 30000
        );

        INSERT INTO event_leaderboard_rank_snapshots (event_id, npub, rank)
        VALUES (event_row.id, event_rank_row.npub, event_rank_row.rank)
        ON CONFLICT (event_id, npub)
        DO UPDATE SET rank = EXCLUDED.rank, last_updated_at = NOW();
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

-- =============================================
-- Trigger registration on workout_submissions.
-- =============================================
DROP TRIGGER IF EXISTS trigger_notify_rank_changes_insert ON workout_submissions;
CREATE TRIGGER trigger_notify_rank_changes_insert
  AFTER INSERT ON workout_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_rank_changes();

DROP TRIGGER IF EXISTS trigger_notify_rank_changes_update ON workout_submissions;
CREATE TRIGGER trigger_notify_rank_changes_update
  AFTER UPDATE ON workout_submissions
  FOR EACH ROW
  WHEN (
    OLD.time_5k_seconds       IS DISTINCT FROM NEW.time_5k_seconds       OR
    OLD.time_10k_seconds      IS DISTINCT FROM NEW.time_10k_seconds      OR
    OLD.time_half_seconds     IS DISTINCT FROM NEW.time_half_seconds     OR
    OLD.time_marathon_seconds IS DISTINCT FROM NEW.time_marathon_seconds OR
    OLD.step_count            IS DISTINCT FROM NEW.step_count            OR
    OLD.verified              IS DISTINCT FROM NEW.verified              OR
    OLD.distance_meters       IS DISTINCT FROM NEW.distance_meters       OR
    OLD.duration_seconds      IS DISTINCT FROM NEW.duration_seconds
  )
  EXECUTE FUNCTION notify_rank_changes();

COMMENT ON FUNCTION notify_rank_changes() IS
  'Fires on workout_submissions INSERT/UPDATE. Recomputes affected daily and event leaderboards, diffs against snapshot tables, and async-invokes notify-user via net.http_post for each rank delta. See docs/superpowers/specs/2026-05-11-rank-change-notifications-design.md.';
