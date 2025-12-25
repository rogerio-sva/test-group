/*
  # Configure Cron Jobs and Realtime for Broadcast System

  1. Cron Jobs Configuration
    - Schedule `process-scheduled-messages` to run every minute
    - Schedule `broadcast-monitor` to run every 5 minutes
    - Schedule `sync-group-metadata` to run every 30 minutes
    - Uses pg_cron extension to call Edge Functions via pg_net

  2. Realtime Configuration
    - Enable realtime for broadcast_queue table
    - Enable realtime for broadcast_batch table
    - Enable realtime for group_metadata_cache table
    - Enable realtime for group_sync_status table

  3. Important Notes
    - Cron jobs automatically call Edge Functions
    - Realtime enables instant UI updates without polling
    - All subscriptions are scoped to authenticated users via RLS
*/

-- ===========================================
-- 1. CONFIGURE CRON JOBS
-- ===========================================

-- Remove existing cron jobs if they exist (for idempotency)
DO $$
BEGIN
  PERFORM cron.unschedule('process-scheduled-messages');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('broadcast-monitor');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-group-metadata');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule process-scheduled-messages (every minute)
SELECT cron.schedule(
  'process-scheduled-messages',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ezsvnjmixsgrpjdmyqyj.supabase.co/functions/v1/process-scheduled-messages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6c3Zuam1peHNncnBqZG15cXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTAwNjAsImV4cCI6MjA4MTE2NjA2MH0.QqTIe_7EqPdnp_WjaB3gQh8oiXyBadkOyjPLgYw4hkY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule broadcast-monitor (every 5 minutes)
SELECT cron.schedule(
  'broadcast-monitor',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ezsvnjmixsgrpjdmyqyj.supabase.co/functions/v1/broadcast-monitor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6c3Zuam1peHNncnBqZG15cXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTAwNjAsImV4cCI6MjA4MTE2NjA2MH0.QqTIe_7EqPdnp_WjaB3gQh8oiXyBadkOyjPLgYw4hkY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule sync-group-metadata (every 30 minutes)
SELECT cron.schedule(
  'sync-group-metadata',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ezsvnjmixsgrpjdmyqyj.supabase.co/functions/v1/sync-group-metadata',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6c3Zuam1peHNncnBqZG15cXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTAwNjAsImV4cCI6MjA4MTE2NjA2MH0.QqTIe_7EqPdnp_WjaB3gQh8oiXyBadkOyjPLgYw4hkY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ===========================================
-- 2. ENABLE REALTIME FOR BROADCAST TABLES
-- ===========================================

-- Add broadcast tables to realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE broadcast_queue;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE broadcast_batch;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_metadata_cache;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_sync_status;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 3. VERIFICATION QUERY
-- ===========================================

-- Verify cron jobs are scheduled
SELECT 
  'Cron jobs configured' as status,
  count(*) as active_jobs
FROM cron.job
WHERE jobname IN ('process-scheduled-messages', 'broadcast-monitor', 'sync-group-metadata');
