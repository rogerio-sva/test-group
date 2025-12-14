/*
  # Create API Settings Table

  1. New Tables
    - `api_settings`
      - `id` (text, primary key) - Unique identifier for the settings record
      - `provider` (text) - API provider name (zapi, evolution, etc)
      - `instance_id` (text) - Z-API instance ID
      - `token` (text) - Z-API token
      - `client_token` (text) - Z-API client token
      - `is_active` (boolean) - Whether this configuration is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `api_settings` table
    - Add policies for read/write access (open access for single-tenant mode)

  3. Notes
    - This table stores Z-API credentials configured through the app interface
    - Replaces the need to manually configure Supabase Secrets
*/

CREATE TABLE IF NOT EXISTS api_settings (
  id text PRIMARY KEY,
  provider text NOT NULL DEFAULT 'zapi',
  instance_id text,
  token text,
  client_token text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to api_settings"
  ON api_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow insert access to api_settings"
  ON api_settings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update access to api_settings"
  ON api_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete access to api_settings"
  ON api_settings
  FOR DELETE
  USING (true);
