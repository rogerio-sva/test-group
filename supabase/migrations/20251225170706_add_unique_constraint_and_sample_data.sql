/*
  # Add Unique Constraint and Sample Data

  1. Changes
    - Add unique constraint on (period_type, period_start)
    - Add cron job for metrics aggregation
    - Insert sample data for testing
    
  2. Purpose
    - Allow upsert operations on metrics
    - Populate dashboard with test data
*/

-- Add unique constraint to allow ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS idx_sending_metrics_period_unique 
ON sending_metrics(period_type, period_start);

-- Remove existing cron job if exists
DO $$
BEGIN
  PERFORM cron.unschedule('aggregate-sending-metrics');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule metrics aggregation (every 5 minutes)
SELECT cron.schedule(
  'aggregate-sending-metrics',
  '*/5 * * * *',
  $$
  SELECT aggregate_sending_metrics();
  $$
);

-- Insert sample data for testing the dashboard
DO $$
DECLARE
  v_hour_offset int;
  v_messages_sent int;
  v_messages_failed int;
  v_period_start timestamptz;
BEGIN
  -- Generate hourly metrics for last 12 hours
  FOR v_hour_offset IN 0..11 LOOP
    v_period_start := date_trunc('hour', now()) - (v_hour_offset || ' hours')::interval;
    
    -- Simulate realistic traffic patterns
    v_messages_sent := CASE 
      WHEN extract(hour from v_period_start) BETWEEN 9 AND 18 THEN 
        floor(random() * 150 + 100)::int
      ELSE 
        floor(random() * 50 + 20)::int
    END;
    
    v_messages_failed := floor(v_messages_sent * (random() * 0.05 + 0.05))::int;
    
    INSERT INTO sending_metrics (
      period_type,
      period_start,
      period_end,
      messages_sent,
      messages_failed,
      timestamp
    ) VALUES (
      'hour',
      v_period_start,
      v_period_start + interval '1 hour',
      v_messages_sent,
      v_messages_failed,
      now()
    )
    ON CONFLICT (period_type, period_start) DO UPDATE SET
      messages_sent = EXCLUDED.messages_sent,
      messages_failed = EXCLUDED.messages_failed,
      timestamp = EXCLUDED.timestamp;
  END LOOP;

  -- Add minute-level detail for the last hour
  FOR v_hour_offset IN 0..11 LOOP
    v_period_start := date_trunc('minute', now()) - (v_hour_offset * 5 || ' minutes')::interval;
    
    v_messages_sent := floor(random() * 20 + 5)::int;
    v_messages_failed := floor(v_messages_sent * (random() * 0.05 + 0.05))::int;
    
    INSERT INTO sending_metrics (
      period_type,
      period_start,
      period_end,
      messages_sent,
      messages_failed,
      timestamp
    ) VALUES (
      'minute',
      v_period_start,
      v_period_start + interval '1 minute',
      v_messages_sent,
      v_messages_failed,
      now()
    )
    ON CONFLICT (period_type, period_start) DO UPDATE SET
      messages_sent = EXCLUDED.messages_sent,
      messages_failed = EXCLUDED.messages_failed,
      timestamp = EXCLUDED.timestamp;
  END LOOP;

  -- Update rate limits with realistic values
  UPDATE sending_rate_limits
  SET 
    current_count = CASE limit_type
      WHEN 'per_minute' THEN floor(random() * 15 + 5)::int
      WHEN 'per_hour' THEN floor(random() * 400 + 200)::int
      WHEN 'per_day' THEN floor(random() * 3000 + 1500)::int
    END,
    period_start = CASE limit_type
      WHEN 'per_minute' THEN date_trunc('minute', now())
      WHEN 'per_hour' THEN date_trunc('hour', now())
      WHEN 'per_day' THEN date_trunc('day', now())
    END,
    updated_at = now()
  WHERE is_active = true;

END $$;

-- Verify data was inserted
SELECT 
  period_type,
  count(*) as metric_count,
  sum(messages_sent) as total_sent,
  sum(messages_failed) as total_failed
FROM sending_metrics
GROUP BY period_type
ORDER BY period_type;
