-- =============================================================================
-- Migration 149: Security Lockdown — Remove Anon Write Policies
--
-- All writes now go through Edge Functions (manage-club, manage-competition,
-- manage-club-chat) which use the service_role key.
-- Anon key retains SELECT-only access.
-- =============================================================================

BEGIN;

-- -----------------------------------------------
-- club_memberships: drop anon INSERT/DELETE/UPDATE
-- -----------------------------------------------
DROP POLICY IF EXISTS "club_memberships_insert" ON club_memberships;
DROP POLICY IF EXISTS "club_memberships_delete" ON club_memberships;
DROP POLICY IF EXISTS "club_memberships_update" ON club_memberships;

-- -----------------------------------------------
-- club_messages: drop anon INSERT/UPDATE
-- -----------------------------------------------
DROP POLICY IF EXISTS "club_messages_insert" ON club_messages;
DROP POLICY IF EXISTS "club_messages_update" ON club_messages;

-- -----------------------------------------------
-- competition_participants: drop anon INSERT
-- -----------------------------------------------
DROP POLICY IF EXISTS "Anyone can join competitions" ON competition_participants;

-- -----------------------------------------------
-- competitions: drop anon INSERT
-- -----------------------------------------------
DROP POLICY IF EXISTS "competitions_insert" ON competitions;

-- -----------------------------------------------
-- user_teams: drop anon INSERT/UPDATE/DELETE
-- -----------------------------------------------
DROP POLICY IF EXISTS "user_teams_insert" ON user_teams;
DROP POLICY IF EXISTS "user_teams_update" ON user_teams;
DROP POLICY IF EXISTS "user_teams_delete" ON user_teams;

-- -----------------------------------------------
-- workout_submissions: drop anon INSERT
-- -----------------------------------------------
DROP POLICY IF EXISTS "Anon can insert workout_submissions" ON workout_submissions;

-- -----------------------------------------------
-- Ensure service_role has unrestricted access on each table
-- (service_role bypasses RLS by default, but explicit policy is belt-and-suspenders)
-- -----------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'club_memberships',
    'club_messages',
    'competition_participants',
    'competitions',
    'user_teams',
    'workout_submissions'
  ])
  LOOP
    -- Drop existing service_role policy if it exists to avoid duplicate error
    EXECUTE format(
      'DROP POLICY IF EXISTS "service_role_all_%s" ON %I',
      tbl, tbl
    );
    -- Create service_role ALL policy
    EXECUTE format(
      'CREATE POLICY "service_role_all_%s" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END
$$;

COMMIT;
