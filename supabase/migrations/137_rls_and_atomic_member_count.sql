-- Migration 137: RLS policy gaps + atomic member_count
-- Fixes three issues:
--   1. user_teams missing UPDATE/DELETE policies (member_count, club edits, deactivation silently fail)
--   2. club_memberships missing UPDATE policy (transferCaptainship role changes silently fail)
--   3. member_count uses read-then-write pattern (race condition) — replace with atomic RPC

-- =============================================
-- 1. user_teams: ADD UPDATE + DELETE policies
-- =============================================

CREATE POLICY "user_teams_update" ON user_teams
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "user_teams_delete" ON user_teams
  FOR DELETE USING (true);

-- =============================================
-- 2. club_memberships: ADD UPDATE policy
-- =============================================

CREATE POLICY "club_memberships_update" ON club_memberships
  FOR UPDATE USING (true) WITH CHECK (true);

-- =============================================
-- 3. Atomic member_count adjustment function
-- =============================================
-- Usage: SELECT adjust_member_count('team-uuid', 1)   -- increment
--        SELECT adjust_member_count('team-uuid', -1)  -- decrement
-- Clamps to 0 (never goes negative).
-- Optionally deactivates club when count hits 0.

CREATE OR REPLACE FUNCTION adjust_member_count(
  team_id UUID,
  delta INTEGER,
  deactivate_if_empty BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.user_teams
    SET member_count = GREATEST(0, member_count + delta)
    WHERE id = team_id
    RETURNING member_count INTO new_count;

  -- If no row matched, return -1 as sentinel
  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  -- Optionally deactivate when empty (e.g. captain left)
  IF deactivate_if_empty AND new_count = 0 THEN
    UPDATE public.user_teams
      SET is_active = false
      WHERE id = team_id;
  END IF;

  RETURN new_count;
END;
$$;
