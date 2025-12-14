-- Tabela de Campanhas (conjunto de grupos para rotação de smart links)
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Grupos da Campanha (grupos que fazem parte de uma campanha)
CREATE TABLE public.campaign_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  group_phone TEXT NOT NULL, -- ID do grupo no Z-API
  group_name TEXT NOT NULL,
  member_limit INTEGER NOT NULL DEFAULT 256,
  current_members INTEGER NOT NULL DEFAULT 0,
  invite_link TEXT,
  priority INTEGER NOT NULL DEFAULT 0, -- Ordem de rotação
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, group_phone)
);

-- Tabela de Smart Links
CREATE TABLE public.smart_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE, -- URL amigável (ex: /link/promo-black)
  name TEXT NOT NULL,
  description TEXT,
  redirect_delay INTEGER NOT NULL DEFAULT 0, -- Delay em ms antes de redirecionar
  track_clicks BOOLEAN NOT NULL DEFAULT true,
  detect_device BOOLEAN NOT NULL DEFAULT true, -- iOS vs Android
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Cliques nos Smart Links (analytics)
CREATE TABLE public.smart_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  smart_link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  redirected_to_group TEXT, -- ID do grupo para o qual foi redirecionado
  device_type TEXT, -- 'ios', 'android', 'desktop', 'unknown'
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Histórico de Mensagens Enviadas
CREATE TABLE public.message_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'video', 'document', 'audio'
  media_url TEXT, -- URL da mídia se houver
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'partial', 'failed'
  target_groups JSONB NOT NULL DEFAULT '[]'::jsonb, -- Lista de grupos alvo
  successful_sends INTEGER NOT NULL DEFAULT 0,
  failed_sends INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE, -- Se for agendada
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Detalhes de Envio (status individual por grupo)
CREATE TABLE public.message_send_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_history_id UUID NOT NULL REFERENCES public.message_history(id) ON DELETE CASCADE,
  group_phone TEXT NOT NULL,
  group_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  zapi_message_id TEXT, -- ID retornado pela Z-API
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS em todas as tabelas
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_send_details ENABLE ROW LEVEL SECURITY;

-- Policies para acesso público (sistema interno sem auth por enquanto)
-- NOTA: Em produção, você deve adicionar autenticação e restringir por user_id

CREATE POLICY "Allow all access to campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to campaign_groups" ON public.campaign_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to smart_links" ON public.smart_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to smart_link_clicks" ON public.smart_link_clicks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to message_history" ON public.message_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to message_send_details" ON public.message_send_details FOR ALL USING (true) WITH CHECK (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_groups_updated_at
  BEFORE UPDATE ON public.campaign_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_links_updated_at
  BEFORE UPDATE ON public.smart_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_history_updated_at
  BEFORE UPDATE ON public.message_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_campaign_groups_campaign_id ON public.campaign_groups(campaign_id);
CREATE INDEX idx_smart_links_campaign_id ON public.smart_links(campaign_id);
CREATE INDEX idx_smart_links_slug ON public.smart_links(slug);
CREATE INDEX idx_smart_link_clicks_smart_link_id ON public.smart_link_clicks(smart_link_id);
CREATE INDEX idx_smart_link_clicks_created_at ON public.smart_link_clicks(created_at);
CREATE INDEX idx_message_history_status ON public.message_history(status);
CREATE INDEX idx_message_history_created_at ON public.message_history(created_at);
CREATE INDEX idx_message_send_details_message_id ON public.message_send_details(message_history_id);