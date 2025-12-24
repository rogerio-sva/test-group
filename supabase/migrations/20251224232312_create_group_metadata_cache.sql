/*
  # Create Group Metadata Cache System

  1. New Tables
    - `group_metadata_cache`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - Owner of the API instance
      - `group_id` (text) - WhatsApp group ID
      - `group_name` (text) - Name of the group
      - `group_description` (text, nullable) - Group description
      - `participant_count` (integer) - Number of participants
      - `is_admin` (boolean) - Whether user is admin
      - `metadata` (jsonb) - Full metadata from Z-API
      - `last_synced_at` (timestamptz) - Last sync timestamp
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `group_sync_status`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `status` (text) - idle, syncing, error
      - `last_sync_at` (timestamptz)
      - `error_message` (text, nullable)
      - `groups_synced` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own cached data
    - Policies for select, insert, update operations

  3. Indexes
    - Index on user_id and group_id for fast lookups
    - Index on last_synced_at for cleanup queries
*/

-- Create group_metadata_cache table
CREATE TABLE IF NOT EXISTS group_metadata_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id text NOT NULL,
  group_name text NOT NULL,
  group_description text,
  participant_count integer DEFAULT 0,
  is_admin boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- Create group_sync_status table
CREATE TABLE IF NOT EXISTS group_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status text DEFAULT 'idle' CHECK (status IN ('idle', 'syncing', 'error')),
  last_sync_at timestamptz,
  error_message text,
  groups_synced integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_metadata_user_id ON group_metadata_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_group_metadata_group_id ON group_metadata_cache(group_id);
CREATE INDEX IF NOT EXISTS idx_group_metadata_last_synced ON group_metadata_cache(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_group_sync_status_user_id ON group_sync_status(user_id);

-- Enable RLS
ALTER TABLE group_metadata_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_sync_status ENABLE ROW LEVEL SECURITY;

-- Policies for group_metadata_cache
CREATE POLICY "Users can view own group metadata"
  ON group_metadata_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own group metadata"
  ON group_metadata_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own group metadata"
  ON group_metadata_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own group metadata"
  ON group_metadata_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for group_sync_status
CREATE POLICY "Users can view own sync status"
  ON group_sync_status FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync status"
  ON group_sync_status FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync status"
  ON group_sync_status FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_group_metadata_cache_updated_at
  BEFORE UPDATE ON group_metadata_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_group_metadata_updated_at();

CREATE TRIGGER update_group_sync_status_updated_at
  BEFORE UPDATE ON group_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_group_metadata_updated_at();