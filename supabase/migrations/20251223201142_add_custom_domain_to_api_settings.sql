/*
  # Add Custom Domain Configuration

  1. Changes
    - Add `custom_domain` column to `api_settings` table
    - Add `domain_verified` column to track verification status
    - Add `domain_verified_at` timestamp

  2. Notes
    - custom_domain stores the user's custom domain (e.g., links.example.com)
    - domain_verified is true when DNS is configured correctly
    - domain_verified_at records when verification succeeded
*/

-- Add custom_domain column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_settings' AND column_name = 'custom_domain'
  ) THEN
    ALTER TABLE api_settings ADD COLUMN custom_domain text;
  END IF;
END $$;

-- Add domain_verified column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_settings' AND column_name = 'domain_verified'
  ) THEN
    ALTER TABLE api_settings ADD COLUMN domain_verified boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add domain_verified_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_settings' AND column_name = 'domain_verified_at'
  ) THEN
    ALTER TABLE api_settings ADD COLUMN domain_verified_at timestamptz;
  END IF;
END $$;