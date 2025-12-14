/*
  # Campaign Management System - Enhanced Structure

  ## Overview
  This migration creates a comprehensive campaign management system with many-to-many relationships,
  flexible configuration storage, and complete activity tracking.

  ## 1. New Tables

  ### `campaign_contacts` (Many-to-Many Relationship)
  - `id` (uuid, primary key) - Unique identifier for the relationship
  - `campaign_id` (uuid, foreign key) - References campaigns table
  - `contact_id` (uuid, foreign key) - References contacts table
  - `added_at` (timestamptz) - When contact was added to campaign
  - `tags` (text[]) - Array of tags for this contact in this campaign
  - `notes` (text) - Campaign-specific notes about this contact
  - `priority` (integer) - Priority level for this contact in campaign (1-10)
  - `status` (text) - Status: 'active', 'paused', 'removed'
  - Unique constraint on (campaign_id, contact_id)
  - Indexes for efficient queries

  ### `campaign_settings` (Flexible Configuration)
  - `id` (uuid, primary key) - Unique identifier
  - `campaign_id` (uuid, foreign key, unique) - One-to-one with campaigns
  - `preferred_provider` (text) - 'zapi', 'evolution', or null (use global)
  - `send_interval_min` (integer) - Minimum seconds between messages
  - `send_interval_max` (integer) - Maximum seconds between messages
  - `retry_attempts` (integer) - Number of retry attempts on failure
  - `retry_delay` (integer) - Seconds between retries
  - `allowed_days` (integer[]) - Array of allowed days (0=Sunday, 6=Saturday)
  - `allowed_hours_start` (integer) - Start hour (0-23)
  - `allowed_hours_end` (integer) - End hour (0-23)
  - `timezone` (text) - Timezone for scheduling
  - `auto_mention_all` (boolean) - Auto mention @everyone in groups
  - `custom_settings` (jsonb) - Additional flexible settings
  - `is_active` (boolean) - Campaign active status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `campaign_activity_log` (Audit Trail)
  - `id` (uuid, primary key) - Unique identifier
  - `campaign_id` (uuid, foreign key) - References campaigns table
  - `action_type` (text) - Type: 'contact_added', 'contact_removed', 'group_added', 'message_sent', 'link_created', 'settings_updated', etc.
  - `action_data` (jsonb) - Flexible data about the action
  - `performed_at` (timestamptz) - When action occurred
  - `metadata` (jsonb) - Additional context
  - Indexes for efficient timeline queries

  ## 2. Security
  - Enable RLS on all tables
  - Open policies for all operations (matching existing system pattern)

  ## 3. Important Notes
  - Uses IF NOT EXISTS to prevent conflicts
  - Composite indexes for optimal query performance
  - JSONB for flexibility in settings and logs
  - All timestamps use timestamptz for timezone support
*/

-- Create campaign_contacts table (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  tags text[] DEFAULT '{}',
  notes text DEFAULT '',
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'removed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, contact_id)
);

-- Create indexes for campaign_contacts
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_id ON public.campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_contact_id ON public.campaign_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON public.campaign_contacts(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_added_at ON public.campaign_contacts(campaign_id, added_at DESC);

-- Create campaign_settings table
CREATE TABLE IF NOT EXISTS public.campaign_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE REFERENCES public.campaigns(id) ON DELETE CASCADE,
  preferred_provider text CHECK (preferred_provider IN ('zapi', 'evolution') OR preferred_provider IS NULL),
  send_interval_min integer DEFAULT 2,
  send_interval_max integer DEFAULT 5,
  retry_attempts integer DEFAULT 3,
  retry_delay integer DEFAULT 30,
  allowed_days integer[] DEFAULT '{0,1,2,3,4,5,6}',
  allowed_hours_start integer DEFAULT 8 CHECK (allowed_hours_start >= 0 AND allowed_hours_start <= 23),
  allowed_hours_end integer DEFAULT 22 CHECK (allowed_hours_end >= 0 AND allowed_hours_end <= 23),
  timezone text DEFAULT 'America/Sao_Paulo',
  auto_mention_all boolean DEFAULT false,
  custom_settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for campaign_settings
CREATE INDEX IF NOT EXISTS idx_campaign_settings_campaign_id ON public.campaign_settings(campaign_id);

-- Create campaign_activity_log table
CREATE TABLE IF NOT EXISTS public.campaign_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_data jsonb DEFAULT '{}',
  performed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for campaign_activity_log
CREATE INDEX IF NOT EXISTS idx_campaign_activity_log_campaign_id ON public.campaign_activity_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_log_performed_at ON public.campaign_activity_log(campaign_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_log_action_type ON public.campaign_activity_log(campaign_id, action_type);

-- Enable RLS on all tables
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (open access matching existing system pattern)
CREATE POLICY "Allow all access to campaign_contacts" ON public.campaign_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to campaign_settings" ON public.campaign_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to campaign_activity_log" ON public.campaign_activity_log FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaign_contacts_updated_at'
  ) THEN
    CREATE TRIGGER update_campaign_contacts_updated_at
      BEFORE UPDATE ON public.campaign_contacts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaign_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_campaign_settings_updated_at
      BEFORE UPDATE ON public.campaign_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create view for campaign statistics
CREATE OR REPLACE VIEW public.campaign_stats AS
SELECT
  c.id as campaign_id,
  c.name as campaign_name,
  COUNT(DISTINCT cc.contact_id) FILTER (WHERE cc.status = 'active') as total_contacts,
  COUNT(DISTINCT cg.group_phone) as total_groups,
  COUNT(DISTINCT sl.id) as total_smart_links,
  COUNT(DISTINCT mh.id) FILTER (WHERE mh.created_at >= now() - interval '7 days') as messages_sent_week,
  COUNT(DISTINCT mh.id) as total_messages_sent,
  COALESCE(cs.is_active, c.is_active) as is_active
FROM public.campaigns c
LEFT JOIN public.campaign_contacts cc ON c.id = cc.campaign_id
LEFT JOIN public.campaign_groups cg ON c.id = cg.campaign_id
LEFT JOIN public.smart_links sl ON c.id = sl.campaign_id
LEFT JOIN public.message_history mh ON c.id = mh.campaign_id
LEFT JOIN public.campaign_settings cs ON c.id = cs.campaign_id
GROUP BY c.id, c.name, c.is_active, cs.is_active;