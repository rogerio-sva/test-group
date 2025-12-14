/*
  # Contacts Management System

  1. New Tables
    - `contacts`
      - `id` (uuid, primary key)
      - `phone` (text, unique) - Phone number with country code
      - `name` (text) - Contact name
      - `profile_pic_url` (text, nullable) - Contact profile picture URL
      - `is_business` (boolean) - Whether contact is a business account
      - `is_blocked` (boolean) - Whether contact is blocked
      - `is_group` (boolean) - Whether this is a group contact
      - `status` (text, nullable) - Contact status message
      - `metadata` (jsonb, nullable) - Additional metadata from Z-API
      - `created_at` (timestamptz) - When contact was added
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `contact_validation_results`
      - `id` (uuid, primary key)
      - `phone` (text) - Phone number validated
      - `is_valid` (boolean) - Whether number is valid on WhatsApp
      - `is_business` (boolean) - Whether it's a business account
      - `validated_at` (timestamptz) - When validation was performed
      - `metadata` (jsonb, nullable) - Additional validation data
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage contacts
*/

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  profile_pic_url text,
  is_business boolean DEFAULT false,
  is_blocked boolean DEFAULT false,
  is_group boolean DEFAULT false,
  status text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contact validation results table
CREATE TABLE IF NOT EXISTS contact_validation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  is_valid boolean DEFAULT false,
  is_business boolean DEFAULT false,
  validated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_is_blocked ON contacts(is_blocked);
CREATE INDEX IF NOT EXISTS idx_contacts_is_group ON contacts(is_group);
CREATE INDEX IF NOT EXISTS idx_validation_results_phone ON contact_validation_results(phone);
CREATE INDEX IF NOT EXISTS idx_validation_results_validated_at ON contact_validation_results(validated_at DESC);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_validation_results ENABLE ROW LEVEL SECURITY;

-- Contacts policies
CREATE POLICY "Users can view all contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (true);

-- Contact validation results policies
CREATE POLICY "Users can view validation results"
  ON contact_validation_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert validation results"
  ON contact_validation_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_contacts_updated_at_trigger ON contacts;
CREATE TRIGGER update_contacts_updated_at_trigger
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();
