/*
  # Create Broadcast Queue System

  1. New Tables
    - `broadcast_queue`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - Owner of the broadcast
      - `campaign_id` (uuid, nullable, references campaigns) - Associated campaign
      - `group_id` (text) - Target group ID
      - `message_content` (jsonb) - Message content and metadata
      - `status` (text) - pending, processing, sent, failed, cancelled
      - `priority` (integer) - Higher number = higher priority
      - `scheduled_at` (timestamptz) - When to send
      - `sent_at` (timestamptz, nullable) - When it was sent
      - `failed_at` (timestamptz, nullable) - When it failed
      - `retry_count` (integer) - Number of retry attempts
      - `max_retries` (integer) - Maximum retry attempts
      - `error_message` (text, nullable) - Last error message
      - `metadata` (jsonb) - Additional metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `broadcast_batch`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `campaign_id` (uuid, nullable, references campaigns)
      - `batch_name` (text) - Name of the batch
      - `total_messages` (integer) - Total messages in batch
      - `sent_count` (integer) - Messages sent
      - `failed_count` (integer) - Messages failed
      - `status` (text) - pending, processing, completed, failed, cancelled
      - `started_at` (timestamptz, nullable)
      - `completed_at` (timestamptz, nullable)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own broadcast data
    - Policies for select, insert, update operations

  3. Indexes
    - Index on status for quick filtering
    - Index on scheduled_at for time-based queries
    - Index on user_id for user-specific queries
    - Composite index on status and scheduled_at for queue processing
*/

-- Create broadcast_queue table
CREATE TABLE IF NOT EXISTS broadcast_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  group_id text NOT NULL,
  message_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  priority integer DEFAULT 0,
  scheduled_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  failed_at timestamptz,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create broadcast_batch table
CREATE TABLE IF NOT EXISTS broadcast_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  batch_name text NOT NULL,
  total_messages integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for broadcast_queue
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_user_id ON broadcast_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_status ON broadcast_queue(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_scheduled_at ON broadcast_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_status_scheduled ON broadcast_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_campaign_id ON broadcast_queue(campaign_id);

-- Create indexes for broadcast_batch
CREATE INDEX IF NOT EXISTS idx_broadcast_batch_user_id ON broadcast_batch(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_batch_status ON broadcast_batch(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_batch_campaign_id ON broadcast_batch(campaign_id);

-- Enable RLS
ALTER TABLE broadcast_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_batch ENABLE ROW LEVEL SECURITY;

-- Policies for broadcast_queue
CREATE POLICY "Users can view own broadcast queue"
  ON broadcast_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own broadcast queue items"
  ON broadcast_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own broadcast queue items"
  ON broadcast_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own broadcast queue items"
  ON broadcast_queue FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for broadcast_batch
CREATE POLICY "Users can view own broadcast batches"
  ON broadcast_batch FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own broadcast batches"
  ON broadcast_batch FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own broadcast batches"
  ON broadcast_batch FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own broadcast batches"
  ON broadcast_batch FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_broadcast_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_broadcast_queue_updated_at
  BEFORE UPDATE ON broadcast_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_broadcast_updated_at();

CREATE TRIGGER update_broadcast_batch_updated_at
  BEFORE UPDATE ON broadcast_batch
  FOR EACH ROW
  EXECUTE FUNCTION update_broadcast_updated_at();