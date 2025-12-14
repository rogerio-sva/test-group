/*
  # Message Queue Management System

  1. Changes to Existing Tables
    - Add queue management columns to `message_history` table
      - `queue_position` (integer) - Position in the queue
      - `can_be_cancelled` (boolean) - Whether message can be cancelled
      - `cancelled_at` (timestamptz) - When message was cancelled
      - `cancelled_by` (text) - Who cancelled the message
    
  2. New Tables
    - `message_actions`
      - `id` (uuid, primary key)
      - `message_history_id` (uuid, foreign key) - Reference to message
      - `action_type` (text) - Type of action (cancel, delete, pin, unpin)
      - `target_phone` (text) - Target phone number for action
      - `message_id` (text) - Z-API message ID for delete/pin operations
      - `performed_at` (timestamptz) - When action was performed
      - `status` (text) - Status of action (pending, completed, failed)
      - `error_message` (text, nullable) - Error if action failed
      - `metadata` (jsonb) - Additional action metadata
  
  3. Security
    - Enable RLS on message_actions table
    - Add policies for authenticated users
*/

-- Add queue management columns to message_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_history' AND column_name = 'queue_position'
  ) THEN
    ALTER TABLE message_history ADD COLUMN queue_position integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_history' AND column_name = 'can_be_cancelled'
  ) THEN
    ALTER TABLE message_history ADD COLUMN can_be_cancelled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_history' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE message_history ADD COLUMN cancelled_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_history' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE message_history ADD COLUMN cancelled_by text;
  END IF;
END $$;

-- Create message_actions table
CREATE TABLE IF NOT EXISTS message_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_history_id uuid REFERENCES message_history(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_phone text NOT NULL,
  message_id text,
  performed_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_history_queue_position ON message_history(queue_position);
CREATE INDEX IF NOT EXISTS idx_message_history_cancelled_at ON message_history(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_message_actions_message_history_id ON message_actions(message_history_id);
CREATE INDEX IF NOT EXISTS idx_message_actions_action_type ON message_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_message_actions_status ON message_actions(status);
CREATE INDEX IF NOT EXISTS idx_message_actions_performed_at ON message_actions(performed_at DESC);

-- Enable RLS
ALTER TABLE message_actions ENABLE ROW LEVEL SECURITY;

-- Message actions policies
CREATE POLICY "Users can view message actions"
  ON message_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert message actions"
  ON message_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update message actions"
  ON message_actions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete message actions"
  ON message_actions FOR DELETE
  TO authenticated
  USING (true);

-- Function to cancel scheduled message
CREATE OR REPLACE FUNCTION cancel_scheduled_message(
  p_message_history_id uuid,
  p_cancelled_by text DEFAULT 'user'
)
RETURNS boolean AS $$
DECLARE
  v_status text;
  v_can_be_cancelled boolean;
BEGIN
  -- Get current status
  SELECT status, can_be_cancelled
  INTO v_status, v_can_be_cancelled
  FROM message_history
  WHERE id = p_message_history_id;

  -- Check if message can be cancelled
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF v_status NOT IN ('scheduled', 'pending') THEN
    RAISE EXCEPTION 'Only scheduled or pending messages can be cancelled';
  END IF;

  IF v_can_be_cancelled = false THEN
    RAISE EXCEPTION 'This message cannot be cancelled';
  END IF;

  -- Update message status
  UPDATE message_history
  SET 
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = p_cancelled_by
  WHERE id = p_message_history_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
