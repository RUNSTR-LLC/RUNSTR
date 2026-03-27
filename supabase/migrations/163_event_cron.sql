-- Migration 163: Schedule daily finalize-and-recur-events cron
-- Runs at midnight UTC every day

SELECT cron.schedule(
  'finalize-and-recur-events',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/finalize-and-recur-events',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
