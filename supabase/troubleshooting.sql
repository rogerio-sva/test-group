-- ===========================================
-- TROUBLESHOOTING - Gestor de Grupos
-- ===========================================
-- Execute este arquivo se estiver tendo problemas
-- ao salvar as credenciais Z-API
-- ===========================================

-- 1. VERIFICAR SE A TABELA EXISTE
SELECT
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'api_settings'
    )
    THEN '✓ Tabela api_settings existe'
    ELSE '✗ ERRO: Tabela api_settings não existe'
  END as status;

-- 2. VERIFICAR RLS
SELECT
  CASE
    WHEN EXISTS (
      SELECT FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = 'api_settings'
      AND rowsecurity = true
    )
    THEN '✓ RLS está habilitado'
    ELSE '✗ AVISO: RLS não está habilitado'
  END as status;

-- 3. VERIFICAR POLÍTICAS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'api_settings';

-- 4. FORÇAR RECRIAÇÃO DAS POLÍTICAS (SOLUÇÃO)
-- Remover políticas antigas
DROP POLICY IF EXISTS "Allow all access to api_settings" ON public.api_settings;
DROP POLICY IF EXISTS "Allow read access to api_settings" ON public.api_settings;
DROP POLICY IF EXISTS "Allow insert access to api_settings" ON public.api_settings;
DROP POLICY IF EXISTS "Allow update access to api_settings" ON public.api_settings;
DROP POLICY IF EXISTS "Allow delete access to api_settings" ON public.api_settings;

-- Garantir que RLS está habilitado
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Criar nova política que permite tudo
CREATE POLICY "Allow all access to api_settings"
  ON public.api_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. VERIFICAR NOVAMENTE
SELECT
  CASE
    WHEN count(*) > 0
    THEN '✓ Políticas criadas com sucesso! Total: ' || count(*)
    ELSE '✗ ERRO: Nenhuma política encontrada'
  END as status
FROM pg_policies
WHERE tablename = 'api_settings';

-- 6. TESTE DE INSERÇÃO
-- Tentar inserir um registro de teste
INSERT INTO public.api_settings (id, provider, instance_id, token, client_token, is_active)
VALUES ('test_credentials', 'zapi', 'test_instance', 'test_token', 'test_client', true)
ON CONFLICT (id) DO UPDATE SET
  provider = EXCLUDED.provider,
  instance_id = EXCLUDED.instance_id,
  token = EXCLUDED.token,
  client_token = EXCLUDED.client_token,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 7. VERIFICAR SE O TESTE FOI INSERIDO
SELECT
  CASE
    WHEN EXISTS (SELECT FROM public.api_settings WHERE id = 'test_credentials')
    THEN '✓ Inserção funcionou! Você pode salvar as credenciais.'
    ELSE '✗ ERRO: Não foi possível inserir dados'
  END as status;

-- 8. LIMPAR TESTE
DELETE FROM public.api_settings WHERE id = 'test_credentials';

-- ===========================================
-- FIM DO TROUBLESHOOTING
-- ===========================================
-- Se ainda tiver problemas, verifique:
-- 1. As variáveis de ambiente no Netlify estão corretas?
-- 2. Você está usando a ANON KEY e não a SERVICE ROLE KEY?
-- 3. O projeto Supabase está ativo?
-- ===========================================
