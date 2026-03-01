-- Allow anon role to SELECT from broadcast_tokens.
-- PostgREST upsert (INSERT ... ON CONFLICT) benefits from SELECT access
-- for proper conflict resolution on the `token` unique column.
-- Matches existing INSERT/UPDATE policies which use WITH CHECK (true).

GRANT SELECT ON broadcast_tokens TO anon;

CREATE POLICY "anon_select_broadcast_tokens"
  ON broadcast_tokens
  FOR SELECT
  USING (true);
