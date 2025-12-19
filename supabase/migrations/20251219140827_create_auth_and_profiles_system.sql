/*
  # Authentication and User Management System

  ## Overview
  Creates a complete authentication system with admin and regular users.
  The first registered user automatically becomes admin.
  All users share the same campaigns, groups, and data.

  ## New Tables

  ### `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique, not null)
  - `full_name` (text)
  - `role` (text, default 'user') - Values: 'admin' or 'user'
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security

  ### RLS Policies
  - All authenticated users can view all profiles
  - Users can update their own profile (except role)
  - Only admins can create, update role, or delete other users
  - First user created automatically becomes admin

  ## Triggers

  - Auto-create profile when user signs up
  - Auto-update updated_at timestamp
  - Set first user as admin automatically

  ## Important Notes

  1. Data Sharing: All users access the same campaigns, groups, contacts, etc.
  2. Admin Control: Only admins can manage other users
  3. Self-Service: Users can update their own profile information
  4. Security: RLS ensures users can only access data if authenticated
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles

-- All authenticated users can view all profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile (but not role or is_active)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    is_active = (SELECT is_active FROM profiles WHERE id = auth.uid())
  );

-- Only admins can insert new users (via invite)
CREATE POLICY "Admins can create users"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update other users' roles and status
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete users
CREATE POLICY "Admins can delete users"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
  user_role text;
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM profiles;

  -- First user becomes admin, others become regular users
  IF user_count = 0 THEN
    user_role := 'admin';
  ELSE
    user_role := 'user';
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role,
    true
  );

  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update RLS on existing tables to require authentication

-- Campaigns: All authenticated users can access
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON campaigns;
CREATE POLICY "Authenticated users have full access to campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Campaign Groups: All authenticated users can access
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON campaign_groups;
CREATE POLICY "Authenticated users have full access to campaign_groups"
  ON campaign_groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Contacts: All authenticated users can access
DROP POLICY IF EXISTS "Enable read access for all users" ON contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON contacts;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON contacts;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON contacts;
CREATE POLICY "Authenticated users have full access to contacts"
  ON contacts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Message History: All authenticated users can access
DROP POLICY IF EXISTS "Enable read access for all users" ON message_history;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON message_history;
CREATE POLICY "Authenticated users have full access to message_history"
  ON message_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sending Metrics: All authenticated users can access
DROP POLICY IF EXISTS "Enable read access for all users" ON sending_metrics;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sending_metrics;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON sending_metrics;
CREATE POLICY "Authenticated users have full access to sending_metrics"
  ON sending_metrics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- API Settings: All authenticated users can access (shared configuration)
DROP POLICY IF EXISTS "Enable read access for all users" ON api_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON api_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON api_settings;
CREATE POLICY "Authenticated users have full access to api_settings"
  ON api_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Smart Links: All authenticated users can access
CREATE POLICY "Authenticated users have full access to smart_links"
  ON smart_links
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Smart Link Clicks: Keep public for redirect tracking
CREATE POLICY "Anyone can insert smart link clicks"
  ON smart_link_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view smart link clicks"
  ON smart_link_clicks
  FOR SELECT
  TO authenticated
  USING (true);

-- Campaign Contacts: All authenticated users can access
CREATE POLICY "Authenticated users have full access to campaign_contacts"
  ON campaign_contacts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Campaign Settings: All authenticated users can access
CREATE POLICY "Authenticated users have full access to campaign_settings"
  ON campaign_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Campaign Activity Log: All authenticated users can access
CREATE POLICY "Authenticated users have full access to campaign_activity_log"
  ON campaign_activity_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Message Send Details: All authenticated users can access
CREATE POLICY "Authenticated users have full access to message_send_details"
  ON message_send_details
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Message Actions: All authenticated users can access
CREATE POLICY "Authenticated users have full access to message_actions"
  ON message_actions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Contact Validation Results: All authenticated users can access
CREATE POLICY "Authenticated users have full access to contact_validation_results"
  ON contact_validation_results
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sending Rate Limits: All authenticated users can access
CREATE POLICY "Authenticated users have full access to sending_rate_limits"
  ON sending_rate_limits
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
