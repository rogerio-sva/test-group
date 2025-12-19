# 🔍 DEBUG: Erro ao Salvar Credenciais no Netlify

## Passo 1: Ver o Erro Exato no Console

1. **Abra o site no Netlify** (gestordegruposwpp.netlify.app)
2. Pressione **F12** (ou botão direito → Inspecionar)
3. Vá na aba **Console**
4. Tente salvar as credenciais novamente
5. **Copie a mensagem de erro em vermelho** que aparecer

### O que procurar:

Se aparecer algo como:
- `"Failed to fetch"` → **Problema de variáveis de ambiente**
- `"new row violates row-level security policy"` → **Problema de RLS no banco**
- `"relation api_settings does not exist"` → **Tabela não existe**
- `"null value in column"` → **Campo obrigatório está faltando**

---

## Passo 2: Verificar Variáveis de Ambiente no Netlify

**ESTE É O PROBLEMA MAIS COMUM!**

### Como Verificar:

1. Acesse o painel do **Netlify**
2. Vá no seu site
3. Clique em **Site settings** (menu lateral)
4. Clique em **Environment variables**
5. Verifique se EXATAMENTE estas 2 variáveis existem:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

### ⚠️ ATENÇÃO - Erros Comuns:

❌ **ERRADO:**
```
SUPABASE_URL (sem o VITE_)
VITE_SUPABASE_ANON_KEY (deve ser PUBLISHABLE_KEY)
VITE_SUPABASE_KEY (sem o PUBLISHABLE)
```

✅ **CORRETO:**
```
VITE_SUPABASE_URL=https://seuprojetoid.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Como Pegar os Valores Corretos:

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** (ícone de engrenagem)
4. Clique em **API**
5. Copie:
   - **Project URL** → Cole em `VITE_SUPABASE_URL`
   - **anon public** (NOT service_role!) → Cole em `VITE_SUPABASE_PUBLISHABLE_KEY`

### Depois de Configurar:

1. **Salve** as variáveis
2. Vá em **Deploys** (menu lateral)
3. Clique em **Trigger deploy** → **Deploy site**
4. Aguarde 2-3 minutos
5. Teste novamente

---

## Passo 3: Verificar se o Banco de Dados Foi Criado

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Execute este comando:

```sql
SELECT * FROM api_settings;
```

### Resultados Possíveis:

✅ **Se mostrar uma tabela vazia:** Tudo certo! O problema é nas variáveis de ambiente.

❌ **Se der erro "relation api_settings does not exist":**
   - A tabela não foi criada
   - Vá para o **Passo 4** abaixo

---

## Passo 4: Criar o Banco de Dados (Se Necessário)

Se a tabela não existe, execute este SQL:

1. No **SQL Editor** do Supabase
2. Cole TODO o conteúdo do arquivo `supabase/complete_setup.sql`
3. Clique em **Run**
4. Aguarde a confirmação
5. Execute novamente: `SELECT * FROM api_settings;`
6. Agora deve funcionar!

---

## Passo 5: Teste de Diagnóstico Rápido

No Console do navegador (F12), execute este código:

```javascript
// Ver se as variáveis estão carregadas
console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('KEY:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
```

### Resultados:

✅ **Se mostrar os valores:** Variáveis OK, problema é no banco
❌ **Se mostrar "undefined":** Problema nas variáveis de ambiente do Netlify

---

## Checklist Completo

Use este checklist para resolver o problema:

### No Supabase:
- [ ] Projeto criado
- [ ] Tabela `api_settings` existe (teste com SELECT)
- [ ] RLS está configurado corretamente
- [ ] Copiou a URL do projeto
- [ ] Copiou a **anon public key** (NÃO a service_role!)

### No Netlify:
- [ ] Variável `VITE_SUPABASE_URL` existe (com VITE_ no início!)
- [ ] Variável `VITE_SUPABASE_PUBLISHABLE_KEY` existe
- [ ] Valores estão corretos (sem espaços extras)
- [ ] Fez um novo deploy depois de configurar
- [ ] Deploy concluiu com sucesso (ícone verde)

### No Navegador:
- [ ] Console (F12) mostra os valores das variáveis
- [ ] Não há erro de CORS no console
- [ ] Erro específico foi identificado

---

## Problemas Específicos e Soluções

### Erro: "Failed to fetch"
**Causa:** Variáveis de ambiente não configuradas
**Solução:** Configure no Netlify e faça novo deploy

### Erro: "new row violates row-level security policy"
**Causa:** Políticas RLS muito restritivas
**Solução:** Execute `supabase/troubleshooting.sql`

### Erro: "relation api_settings does not exist"
**Causa:** Banco de dados não foi criado
**Solução:** Execute `supabase/complete_setup.sql`

### Erro: "Invalid API key"
**Causa:** Usando a chave errada (service_role em vez de anon)
**Solução:** Use a **anon public key** do Supabase

---

## Ainda com Problemas?

Se seguiu TODOS os passos acima e ainda não funciona:

1. **Tire um print** da mensagem de erro no Console (F12)
2. **Copie** o erro completo em texto
3. **Verifique** novamente as variáveis de ambiente no Netlify
4. **Confirme** que executou o SQL no Supabase
5. **Tente** em uma aba anônima do navegador

---

## Script de Teste Manual (Console do Navegador)

Cole este código no Console (F12) para testar manualmente:

```javascript
// Importar o cliente Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Pegar as variáveis
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

console.log('Testing Supabase connection...')
console.log('URL:', url)
console.log('Key:', key ? 'Present' : 'MISSING!')

if (!url || !key) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!')
} else {
  // Criar cliente
  const supabase = createClient(url, key)

  // Testar inserção
  const testData = {
    id: 'test_' + Date.now(),
    provider: 'zapi',
    instance_id: 'test',
    token: 'test',
    client_token: 'test',
    is_active: true
  }

  const { data, error } = await supabase
    .from('api_settings')
    .insert(testData)

  if (error) {
    console.error('❌ Erro ao inserir:', error)
  } else {
    console.log('✅ Teste OK! Dados inseridos:', data)

    // Limpar teste
    await supabase
      .from('api_settings')
      .delete()
      .eq('id', testData.id)
    console.log('🧹 Teste removido')
  }
}
```
