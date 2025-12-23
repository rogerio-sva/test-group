/*
  # Create Sync System Tables

  1. New Tables
    - `sync_jobs`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key to campaigns)
      - `group_id` (uuid, foreign key to campaign_groups)
      - `last_sync_at` (timestamptz) - Last successful sync
      - `next_sync_at` (timestamptz) - Next scheduled sync
      - `sync_interval` (text) - Interval: 6h, 12h, 24h, 48h, weekly
      - `is_active` (boolean) - Whether auto-sync is enabled
      - `status` (text) - Status: pending, running, completed, failed
      - `members_added` (integer) - Count of new members found in last sync
      - `members_removed` (integer) - Count of removed members in last sync
      - `error_message` (text, nullable) - Error details if failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `group_members`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to campaign_groups)
      - `contact_id` (uuid, foreign key to contacts)
      - `phone` (text) - Phone number for quick lookup
      - `is_admin` (boolean) - Whether member is admin
      - `joined_at` (timestamptz) - When member joined
      - `synced_at` (timestamptz) - Last time we verified membership
      - `is_active` (boolean) - Whether still in group
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access all data

  3. Indexes
    - Add indexes for common queries
*/

-- Create sync_jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES campaign_groups(id) ON DELETE CASCADE NOT NULL,
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  sync_interval text DEFAULT '24h' NOT NULL,
  is_active boolean DEFAULT false NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  members_added integer DEFAULT 0 NOT NULL,
  members_removed integer DEFAULT 0 NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  CONSTRAINT valid_interval CHECK (sync_interval IN ('6h', '12h', '24h', '48h', 'weekly'))
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES campaign_groups(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  is_admin boolean DEFAULT false NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  synced_at timestamptz DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_id, contact_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_campaign ON sync_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_group ON sync_jobs(group_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_next_sync ON sync_jobs(next_sync_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_contact ON group_members(contact_id);
CREATE INDEX IF NOT EXISTS idx_group_members_phone ON group_members(phone);
CREATE INDEX IF NOT EXISTS idx_group_members_active ON group_members(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Policies for sync_jobs (allow all authenticated users)
CREATE POLICY "Authenticated users have full access to sync_jobs"
  ON sync_jobs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for group_members (allow all authenticated users)
CREATE POLICY "Authenticated users have full access to group_members"
  ON group_members FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for sync_jobs
DROP TRIGGER IF EXISTS sync_jobs_updated_at ON sync_jobs;
CREATE TRIGGER sync_jobs_updated_at
  BEFORE UPDATE ON sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_jobs_updated_at();