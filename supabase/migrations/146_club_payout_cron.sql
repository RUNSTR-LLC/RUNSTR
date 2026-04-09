-- =============================================
-- Migration 146: Schedule process-club-payouts cron job
-- =============================================
--
-- Sets up pg_cron to call the process-club-payouts edge function
-- every 5 minutes, checking for ended competitions that need
-- prize pool payouts.
--
-- Prerequisites:
-- 1. pg_cron extension enabled (Supabase Pro plan or higher)
-- 2. pg_net extension enabled (for HTTP requests)
-- 3. Edge function deployed: supabase functions deploy process-club-payouts
-- 4. Vault secrets configured (project_url, service_role_key)
--
-- IMPORTANT: Run this AFTER deploying the edge function.
-- =============================================

-- Create the trigger function that pg_cron will call
CREATE OR REPLACE FUNCTION public.trigger_process_club_payouts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url text;
  service_key text;
BEGIN
  -- Get secrets from vault
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url';

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- Make HTTP request to edge function
  IF project_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := project_url || '/functions/v1/process-club-payouts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'triggered_at', now(),
        'source', 'pg_cron'
      ),
      timeout_milliseconds := 60000
    );

    RAISE LOG 'Triggered process-club-payouts at %', now();
  ELSE
    RAISE WARNING 'Missing vault secrets for process-club-payouts';
  END IF;
END;
$$;

-- Schedule the job to run every 5 minutes
SELECT cron.schedule(
  'process-club-payouts',
  '*/5 * * * *',
  $$SELECT public.trigger_process_club_payouts()$$
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.trigger_process_club_payouts() TO postgres;

-- =============================================
-- Verification queries:
-- =============================================
--
-- Check if job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'process-club-payouts';
--
-- Check recent job runs:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-club-payouts')
-- ORDER BY start_time DESC LIMIT 10;
--
-- Manually trigger:
-- SELECT public.trigger_process_club_payouts();
--
-- Remove the scheduled job:
-- SELECT cron.unschedule('process-club-payouts');
-- =============================================
