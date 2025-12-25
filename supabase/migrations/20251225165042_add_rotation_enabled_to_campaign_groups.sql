/*
  # Add rotation control to campaign groups

  1. Changes
    - Add `rotation_enabled` column to `campaign_groups` table
      - Boolean flag to control if group participates in smart link rotation
      - Defaults to true for new groups
    - Update existing groups to have rotation enabled by default

  2. Purpose
    - Allows users to enable/disable rotation per group within a campaign
    - Provides granular control over which groups receive new members from smart links
*/

-- Add rotation_enabled column to campaign_groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_groups' AND column_name = 'rotation_enabled'
  ) THEN
    ALTER TABLE campaign_groups ADD COLUMN rotation_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Update existing groups to have rotation enabled
UPDATE campaign_groups SET rotation_enabled = true WHERE rotation_enabled IS NULL;

-- Add index for efficient queries on rotation-enabled groups
CREATE INDEX IF NOT EXISTS idx_campaign_groups_rotation_enabled ON campaign_groups(campaign_id, rotation_enabled, is_active) WHERE rotation_enabled = true AND is_active = true;
