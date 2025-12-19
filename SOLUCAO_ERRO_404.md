# 🔧 SOLUÇÃO: Erro 404 ao Salvar Credenciais

## Problema Identificado

```
eaoigskjdfmrarkcseer.supabase.co/rest/v1/api_settings?on_conflict=id:1
Failed to load resource: the server responded with a status of 404 ()
```

**Causa:** A tabela `api_settings` NÃO existe no banco de dados Supabase hospedado.

---

## ✅ SOLUÇÃO: Executar Migration no Supabase

### Passo 1: Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Faça login
3. Selecione seu projeto: **eaoigskjdfmrarkcseer**

### Passo 2: Abrir o SQL Editor

1. No menu lateral, clique em **SQL Editor** (ícone </> ou "SQL")
2. Clique em **New Query** (ou use uma query existente)

### Passo 3: Copiar e Colar o SQL Abaixo

**Cole TODO este código SQL:**

```sql
-- ===========================================
-- Create API Settings Table
-- ===========================================

-- 1. Create the table
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

-- 2. Enable RLS
ALTER TABLE api_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow read access to api_settings" ON api_settings;
DROP POLICY IF EXISTS "Allow insert access to api_settings" ON api_settings;
DROP POLICY IF EXISTS "Allow update access to api_settings" ON api_settings;
DROP POLICY IF EXISTS "Allow delete access to api_settings" ON api_settings;

-- 4. Create new policies
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
```

### Passo 4: Executar o SQL

1. Clique em **RUN** (botão verde no canto inferior direito)
2. Aguarde a mensagem de sucesso: "Success. No rows returned"

### Passo 5: Verificar se a Tabela Foi Criada

Execute este SQL para confirmar:

```sql
SELECT * FROM api_settings;
```

**Resultado esperado:** Uma tabela vazia (sem erros)

---

## ✅ Depois de Executar a Migration

1. Volte para o site: https://gestordegruposwpp.netlify.app/onboarding
2. Preencha os campos:
   - **Instance ID**
   - **Token**
   - **Client Token**
3. Clique em **Salvar e Continuar**
4. Agora deve funcionar!

---

## 🔍 Como Verificar se Funcionou

No Console do navegador (F12), você deve ver:

✅ **ANTES (erro):**
```
eaoigskjdfmrarkcseer.supabase.co/rest/v1/api_settings?on_conflict=id:1
Failed to load resource: the server responded with a status of 404 ()
```

✅ **DEPOIS (sucesso):**
```
Credenciais salvas!
Suas credenciais Z-API foram configuradas com sucesso.
```

---

## ❓ Por Que Isso Aconteceu?

As migrations foram executadas apenas no ambiente **local** (seu computador), mas não foram aplicadas automaticamente no **Supabase hospedado** (produção).

Para evitar isso no futuro, sempre execute as migrations diretamente no Supabase Dashboard.

---

## 🆘 Ainda com Problemas?

Se após executar o SQL acima você ainda receber erro 404:

1. **Verifique o projeto correto:**
   - Certifique-se de estar no projeto: **eaoigskjdfmrarkcseer**
   - URL deve ser: `https://eaoigskjdfmrarkcseer.supabase.co`

2. **Verifique se o SQL foi executado:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_name = 'api_settings';
   ```
   - Deve retornar: `api_settings`

3. **Verifique as políticas RLS:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'api_settings';
   ```
   - Deve mostrar 4 políticas (SELECT, INSERT, UPDATE, DELETE)

---

## 📝 Próximos Passos Após Resolver

Depois que a tabela for criada e as credenciais salvas:

1. Configure as credenciais Z-API no onboarding
2. Teste a conexão
3. Comece a usar o sistema normalmente

---

## ⚠️ IMPORTANTE: Variáveis de Ambiente

Depois de resolver o erro 404, se ainda houver problemas, verifique se as variáveis de ambiente estão configuradas no Netlify:

**Netlify → Site settings → Environment variables:**
- `VITE_SUPABASE_URL` = `https://eaoigskjdfmrarkcseer.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = (sua anon key do Supabase)

Se alterar, faça um novo deploy:
**Netlify → Deploys → Trigger deploy → Deploy site**
