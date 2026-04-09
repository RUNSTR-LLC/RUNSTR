-- Migration 160: Schedule social feed indexer to run every 5 minutes
-- Queries Nostr relays for fitness-related kind 1 posts

SELECT cron.schedule(
  'index-social-feed',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/index-social-feed',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
