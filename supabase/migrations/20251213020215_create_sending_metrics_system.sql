/*
  # Sending Metrics System

  1. New Tables
    - `sending_metrics`
      - `id` (uuid, primary key)
      - `timestamp` (timestamptz) - When metric was recorded
      - `messages_sent` (integer) - Number of messages sent in this period
      - `messages_failed` (integer) - Number of messages that failed
      - `period_start` (timestamptz) - Start of measurement period
      - `period_end` (timestamptz) - End of measurement period
      - `period_type` (text) - Type of period (minute, hour, day)
      - `metadata` (jsonb) - Additional metrics data
    
    - `sending_rate_limits`
      - `id` (uuid, primary key)
      - `limit_type` (text) - Type of limit (per_minute, per_hour, per_day)
      - `limit_value` (integer) - Maximum messages allowed
      - `current_count` (integer) - Current count in period
      - `period_start` (timestamptz) - When current period started
      - `is_active` (boolean) - Whether limit is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes to Existing Tables
    - Add timing columns to `message_send_details`
      - `send_started_at` (timestamptz) - When send started
      - `send_completed_at` (timestamptz) - When send completed
      - `send_duration_ms` (integer) - Duration in milliseconds
  
  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create sending_metrics table
CREATE TABLE IF NOT EXISTS sending_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  messages_sent integer DEFAULT 0,
  messages_failed integer DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  period_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create sending_rate_limits table
CREATE TABLE IF NOT EXISTS sending_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_type text UNIQUE NOT NULL,
  limit_value integer NOT NULL DEFAULT 100,
  current_count integer DEFAULT 0,
  period_start timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add timing columns to message_send_details if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'message_send_details'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'message_send_details' AND column_name = 'send_started_at'
    ) THEN
      ALTER TABLE message_send_details ADD COLUMN send_started_at timestamptz;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'message_send_details' AND column_name = 'send_completed_at'
    ) THEN
      ALTER TABLE message_send_details ADD COLUMN send_completed_at timestamptz;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'message_send_details' AND column_name = 'send_duration_ms'
    ) THEN
      ALTER TABLE message_send_details ADD COLUMN send_duration_ms integer;
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sending_metrics_timestamp ON sending_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sending_metrics_period_type ON sending_metrics(period_type);
CREATE INDEX IF NOT EXISTS idx_sending_metrics_period_start ON sending_metrics(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_sending_rate_limits_limit_type ON sending_rate_limits(limit_type);
CREATE INDEX IF NOT EXISTS idx_sending_rate_limits_is_active ON sending_rate_limits(is_active);

-- Enable RLS
ALTER TABLE sending_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sending_rate_limits ENABLE ROW LEVEL SECURITY;

-- Sending metrics policies
CREATE POLICY "Users can view sending metrics"
  ON sending_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert sending metrics"
  ON sending_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Sending rate limits policies
CREATE POLICY "Users can view rate limits"
  ON sending_rate_limits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update rate limits"
  ON sending_rate_limits FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can insert rate limits"
  ON sending_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default rate limits
INSERT INTO sending_rate_limits (limit_type, limit_value, is_active)
VALUES 
  ('per_minute', 20, true),
  ('per_hour', 1000, true),
  ('per_day', 10000, true)
ON CONFLICT (limit_type) DO NOTHING;

-- Function to record sending metric
CREATE OR REPLACE FUNCTION record_sending_metric(
  p_period_type text DEFAULT 'minute',
  p_messages_sent integer DEFAULT 1,
  p_messages_failed integer DEFAULT 0
)
RETURNS uuid AS $$
DECLARE
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_metric_id uuid;
BEGIN
  -- Calculate period boundaries
  IF p_period_type = 'minute' THEN
    v_period_start := date_trunc('minute', now());
    v_period_end := v_period_start + interval '1 minute';
  ELSIF p_period_type = 'hour' THEN
    v_period_start := date_trunc('hour', now());
    v_period_end := v_period_start + interval '1 hour';
  ELSIF p_period_type = 'day' THEN
    v_period_start := date_trunc('day', now());
    v_period_end := v_period_start + interval '1 day';
  ELSE
    RAISE EXCEPTION 'Invalid period type';
  END IF;

  -- Insert or update metric
  INSERT INTO sending_metrics (
    period_start,
    period_end,
    period_type,
    messages_sent,
    messages_failed
  )
  VALUES (
    v_period_start,
    v_period_end,
    p_period_type,
    p_messages_sent,
    p_messages_failed
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_metric_id;

  -- If metric already exists for this period, update it
  IF v_metric_id IS NULL THEN
    UPDATE sending_metrics
    SET 
      messages_sent = messages_sent + p_messages_sent,
      messages_failed = messages_failed + p_messages_failed,
      timestamp = now()
    WHERE 
      period_start = v_period_start
      AND period_type = p_period_type
    RETURNING id INTO v_metric_id;
  END IF;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_limit_type text)
RETURNS boolean AS $$
DECLARE
  v_limit_value integer;
  v_current_count integer;
  v_period_start timestamptz;
  v_is_active boolean;
  v_period_duration interval;
BEGIN
  -- Get rate limit configuration
  SELECT limit_value, current_count, period_start, is_active
  INTO v_limit_value, v_current_count, v_period_start, v_is_active
  FROM sending_rate_limits
  WHERE limit_type = p_limit_type;

  -- If limit doesn't exist or is not active, allow
  IF v_limit_value IS NULL OR v_is_active = false THEN
    RETURN true;
  END IF;

  -- Determine period duration
  IF p_limit_type = 'per_minute' THEN
    v_period_duration := interval '1 minute';
  ELSIF p_limit_type = 'per_hour' THEN
    v_period_duration := interval '1 hour';
  ELSIF p_limit_type = 'per_day' THEN
    v_period_duration := interval '1 day';
  ELSE
    RETURN true;
  END IF;

  -- Check if we need to reset the period
  IF now() >= v_period_start + v_period_duration THEN
    UPDATE sending_rate_limits
    SET 
      current_count = 0,
      period_start = now(),
      updated_at = now()
    WHERE limit_type = p_limit_type;
    
    RETURN true;
  END IF;

  -- Check if under limit
  RETURN v_current_count < v_limit_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(p_limit_type text)
RETURNS void AS $$
BEGIN
  UPDATE sending_rate_limits
  SET 
    current_count = current_count + 1,
    updated_at = now()
  WHERE limit_type = p_limit_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
