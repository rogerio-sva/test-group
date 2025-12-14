/*
  # Add Campaign ID to Message History

  1. Changes to Existing Tables
    - Add `campaign_id` column to `message_history` table
      - `campaign_id` (uuid, foreign key) - Reference to campaigns table
      - Nullable to support messages not tied to campaigns

  2. Indexes
    - Add index on `campaign_id` for faster queries

  3. Notes
    - This enables tracking which campaign a message belongs to
    - Allows for better analytics and filtering of messages by campaign
    - Maintains backward compatibility by making the field nullable
*/

-- Add campaign_id column to message_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_history' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE message_history
    ADD COLUMN campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster campaign-based queries
CREATE INDEX IF NOT EXISTS idx_message_history_campaign_id
ON message_history(campaign_id);