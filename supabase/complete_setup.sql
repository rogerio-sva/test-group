-- ===========================================
-- Gestor de Grupos - Complete Database Setup
-- ===========================================
-- Execute this file in the Supabase SQL Editor
-- to set up all tables, functions, and policies
-- ===========================================

-- ===========================================
-- 1. EXTENSIONS
-- ===========================================

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Enable pg_net for HTTP calls from cron
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ===========================================
-- 2. FUNCTIONS
-- ===========================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===========================================
-- 3. TABLES
-- ===========================================

-- API Settings table (for Z-API credentials)
CREATE TABLE IF NOT EXISTS public.api_settings (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'zapi',
  instance_id TEXT,
  token TEXT,
  client_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign groups table
CREATE TABLE IF NOT EXISTS public.campaign_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  group_phone TEXT NOT NULL,
  invite_link TEXT,
  member_limit INTEGER NOT NULL DEFAULT 256,
  current_members INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Smart links table
CREATE TABLE IF NOT EXISTS public.smart_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  track_clicks BOOLEAN NOT NULL DEFAULT true,
  detect_device BOOLEAN NOT NULL DEFAULT true,
  redirect_delay INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Smart link clicks table
CREATE TABLE IF NOT EXISTS public.smart_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  smart_link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  redirected_to_group TEXT,
  device_type TEXT,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Message history table
CREATE TABLE IF NOT EXISTS public.message_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  target_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  successful_sends INTEGER NOT NULL DEFAULT 0,
  failed_sends INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Message send details table
CREATE TABLE IF NOT EXISTS public.message_send_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_history_id UUID NOT NULL REFERENCES public.message_history(id) ON DELETE CASCADE,
  group_phone TEXT NOT NULL,
  group_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  zapi_message_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===========================================
-- 4. INDEXES
-- ===========================================

-- Campaign groups indexes
CREATE INDEX IF NOT EXISTS idx_campaign_groups_campaign_id ON public.campaign_groups(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_groups_priority ON public.campaign_groups(priority);
CREATE INDEX IF NOT EXISTS idx_campaign_groups_is_active ON public.campaign_groups(is_active);

-- Smart links indexes
CREATE INDEX IF NOT EXISTS idx_smart_links_slug ON public.smart_links(slug);
CREATE INDEX IF NOT EXISTS idx_smart_links_campaign_id ON public.smart_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_smart_links_is_active ON public.smart_links(is_active);

-- Smart link clicks indexes
CREATE INDEX IF NOT EXISTS idx_smart_link_clicks_smart_link_id ON public.smart_link_clicks(smart_link_id);
CREATE INDEX IF NOT EXISTS idx_smart_link_clicks_created_at ON public.smart_link_clicks(created_at);

-- Message history indexes
CREATE INDEX IF NOT EXISTS idx_message_history_status ON public.message_history(status);
CREATE INDEX IF NOT EXISTS idx_message_history_scheduled_at ON public.message_history(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_message_history_created_at ON public.message_history(created_at);

-- Message send details indexes
CREATE INDEX IF NOT EXISTS idx_message_send_details_message_history_id ON public.message_send_details(message_history_id);
CREATE INDEX IF NOT EXISTS idx_message_send_details_status ON public.message_send_details(status);

-- ===========================================
-- 5. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_send_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow all access to api_settings" ON public.api_settings;
DROP POLICY IF EXISTS "Allow all access to campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow all access to campaign_groups" ON public.campaign_groups;
DROP POLICY IF EXISTS "Allow all access to smart_links" ON public.smart_links;
DROP POLICY IF EXISTS "Allow all access to smart_link_clicks" ON public.smart_link_clicks;
DROP POLICY IF EXISTS "Allow all access to message_history" ON public.message_history;
DROP POLICY IF EXISTS "Allow all access to message_send_details" ON public.message_send_details;

-- Create permissive policies (for self-hosted mode)
CREATE POLICY "Allow all access to api_settings"
  ON public.api_settings FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to campaigns"
  ON public.campaigns FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to campaign_groups"
  ON public.campaign_groups FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to smart_links"
  ON public.smart_links FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to smart_link_clicks"
  ON public.smart_link_clicks FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to message_history"
  ON public.message_history FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to message_send_details"
  ON public.message_send_details FOR ALL
  USING (true) WITH CHECK (true);

-- ===========================================
-- 6. TRIGGERS
-- ===========================================

-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS update_api_settings_updated_at ON public.api_settings;
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
DROP TRIGGER IF EXISTS update_campaign_groups_updated_at ON public.campaign_groups;
DROP TRIGGER IF EXISTS update_smart_links_updated_at ON public.smart_links;
DROP TRIGGER IF EXISTS update_message_history_updated_at ON public.message_history;

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_api_settings_updated_at
  BEFORE UPDATE ON public.api_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_groups_updated_at
  BEFORE UPDATE ON public.campaign_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_links_updated_at
  BEFORE UPDATE ON public.smart_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_history_updated_at
  BEFORE UPDATE ON public.message_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- 7. REALTIME
-- ===========================================

-- Enable realtime for broadcast progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_send_details;

-- ===========================================
-- 8. STORAGE
-- ===========================================

-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-uploads', 'media-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public read access for media-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to media-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from media-uploads" ON storage.objects;

-- Storage policies
CREATE POLICY "Public read access for media-uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'media-uploads');

CREATE POLICY "Allow uploads to media-uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media-uploads');

CREATE POLICY "Allow deletes from media-uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'media-uploads');

-- ===========================================
-- 9. CRON JOB (Execute separately after Edge Functions are deployed)
-- ===========================================

-- IMPORTANT: Replace YOUR_PROJECT_ID and YOUR_ANON_KEY before executing
--
-- SELECT cron.schedule(
--   'process-scheduled-messages',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/process-scheduled-messages',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--     body := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );

-- ===========================================
-- SETUP COMPLETE
-- ===========================================

-- Verify setup
SELECT 'Tables created:' as status, count(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('api_settings', 'campaigns', 'campaign_groups', 'smart_links', 'smart_link_clicks', 'message_history', 'message_send_details');
