# ZapManager - Setup do Banco de Dados

Este documento contém todas as instruções para configurar o banco de dados PostgreSQL no Supabase.

## Pré-requisitos

1. Conta no Supabase (https://supabase.com)
2. Projeto Supabase criado
3. Acesso ao SQL Editor do Supabase

## Setup Rápido

Execute o arquivo `supabase/complete_setup.sql` no SQL Editor do Supabase.

## Setup Manual

### 1. Extensões Necessárias

```sql
-- Habilitar extensões para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Permissões
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

### 2. Tabelas

#### campaigns
Armazena campanhas para organização de grupos.

```sql
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to campaigns" 
  ON public.campaigns 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
```

#### campaign_groups
Grupos associados a campanhas para smart links.

```sql
CREATE TABLE public.campaign_groups (
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

ALTER TABLE public.campaign_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to campaign_groups" 
  ON public.campaign_groups 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE INDEX idx_campaign_groups_campaign_id ON public.campaign_groups(campaign_id);
CREATE INDEX idx_campaign_groups_priority ON public.campaign_groups(priority);
```

#### smart_links
Links personalizados para rotação de grupos.

```sql
CREATE TABLE public.smart_links (
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

ALTER TABLE public.smart_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to smart_links" 
  ON public.smart_links 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE UNIQUE INDEX idx_smart_links_slug ON public.smart_links(slug);
CREATE INDEX idx_smart_links_campaign_id ON public.smart_links(campaign_id);
```

#### smart_link_clicks
Tracking de cliques em smart links.

```sql
CREATE TABLE public.smart_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  smart_link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  redirected_to_group TEXT,
  device_type TEXT,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to smart_link_clicks" 
  ON public.smart_link_clicks 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE INDEX idx_smart_link_clicks_smart_link_id ON public.smart_link_clicks(smart_link_id);
CREATE INDEX idx_smart_link_clicks_created_at ON public.smart_link_clicks(created_at);
```

#### message_history
Histórico de mensagens enviadas.

```sql
CREATE TABLE public.message_history (
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

ALTER TABLE public.message_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to message_history" 
  ON public.message_history 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE INDEX idx_message_history_status ON public.message_history(status);
CREATE INDEX idx_message_history_scheduled_at ON public.message_history(scheduled_at);
CREATE INDEX idx_message_history_created_at ON public.message_history(created_at);
```

#### message_send_details
Detalhes de envio por grupo.

```sql
CREATE TABLE public.message_send_details (
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

ALTER TABLE public.message_send_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to message_send_details" 
  ON public.message_send_details 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE INDEX idx_message_send_details_message_history_id ON public.message_send_details(message_history_id);
CREATE INDEX idx_message_send_details_status ON public.message_send_details(status);
```

### 3. Função de Atualização de Timestamp

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

### 4. Triggers para Atualização Automática

```sql
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
```

### 5. Realtime (Opcional)

Para atualizações em tempo real durante broadcasts:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_send_details;
```

### 6. Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-uploads', 'media-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'media-uploads');

CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media-uploads');

CREATE POLICY "Authenticated delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'media-uploads');
```

### 7. Cron Job para Mensagens Agendadas

**IMPORTANTE**: Este SQL deve ser executado separadamente após configurar as Edge Functions.

Substitua `YOUR_PROJECT_ID` e `YOUR_ANON_KEY` pelos valores do seu projeto:

```sql
SELECT cron.schedule(
  'process-scheduled-messages',
  '* * * * *', -- a cada minuto
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/process-scheduled-messages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

Para verificar cron jobs:
```sql
SELECT * FROM cron.job;
```

Para remover um cron job:
```sql
SELECT cron.unschedule('process-scheduled-messages');
```

## Verificação

Após executar o setup, verifique:

1. **Tabelas criadas**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

2. **RLS habilitado**:
```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';
```

3. **Extensões**:
```sql
SELECT * FROM pg_extension;
```

4. **Cron jobs**:
```sql
SELECT * FROM cron.job;
```

## Backup e Restauração

### Exportar dados
Use o Supabase Dashboard > Database > Backups

### Importar dados
Use `pg_restore` ou o SQL Editor para importar dumps

## Troubleshooting

### Erro: "permission denied for schema cron"
```sql
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT USAGE ON SCHEMA cron TO authenticated;
```

### Erro: "pg_cron not installed"
Verifique se as extensões foram habilitadas:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
```

### Erro: "pg_net not installed"
```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```
