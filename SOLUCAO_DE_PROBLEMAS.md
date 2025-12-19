# 🔧 Solução de Problemas - Gestor de Grupos

## Problema: Erro ao salvar credenciais Z-API

### Sintomas
- Ao tentar salvar as credenciais Z-API na página de Configurações, aparece um erro
- A mensagem de erro pode indicar problema de permissão ou falha ao inserir dados
- O botão "Salvar Credenciais" não funciona

### Possíveis Causas e Soluções

#### 1. ✅ Banco de dados não foi configurado corretamente

**Solução:**

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (ícone de banco de dados na barra lateral)
4. Clique em **New Query**
5. Execute o arquivo `supabase/troubleshooting.sql` (copie e cole todo o conteúdo)
6. Verifique se todas as mensagens aparecem com ✓
7. Se alguma aparecer com ✗, o script irá corrigir automaticamente

**Alternativa:** Execute o arquivo `supabase/complete_setup.sql` novamente (conteúdo completo).

---

#### 2. ✅ Variáveis de ambiente incorretas no Netlify

**Solução:**

1. Acesse o painel do Netlify
2. Vá em **Site settings** → **Environment variables**
3. Verifique se estas 2 variáveis existem:

```
VITE_SUPABASE_URL=https://seuprojetoid.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...sua.chave.aqui
```

4. **IMPORTANTE:** Use a **ANON KEY** (não a Service Role Key)
5. Para encontrar estas chaves no Supabase:
   - Vá em **Project Settings** → **API**
   - Copie a **URL** e a **anon/public key**

6. Após configurar, faça um **novo deploy** no Netlify:
   - Vá em **Deploys** → **Trigger deploy** → **Deploy site**

---

#### 3. ✅ Cache do navegador

**Solução:**

1. Limpe o cache do navegador
2. Ou abra o site em uma aba anônima/privada
3. Tente salvar as credenciais novamente

---

#### 4. ✅ Verificar se o problema é no frontend ou no banco

**Teste rápido:**

1. Abra as **Ferramentas do Desenvolvedor** do navegador (F12)
2. Vá na aba **Console**
3. Tente salvar as credenciais novamente
4. Veja se aparece alguma mensagem de erro
5. Se aparecer algo como:
   - `"new row violates row-level security policy"` → Problema de RLS (execute o troubleshooting.sql)
   - `"Failed to fetch"` → Problema de variáveis de ambiente no Netlify
   - `"relation api_settings does not exist"` → Tabela não existe (execute o complete_setup.sql)

---

## Checklist Completo de Instalação

Use este checklist para garantir que tudo está configurado:

### No Supabase:
- [ ] Projeto criado no Supabase
- [ ] Arquivo `supabase/complete_setup.sql` executado com sucesso
- [ ] Verificação com `troubleshooting.sql` mostra todos os ✓
- [ ] Copiou a URL do projeto (https://seuprojetoid.supabase.co)
- [ ] Copiou a ANON KEY (começa com eyJ...)

### No Netlify:
- [ ] Site importado do repositório Git
- [ ] Variável `VITE_SUPABASE_URL` configurada
- [ ] Variável `VITE_SUPABASE_PUBLISHABLE_KEY` configurada
- [ ] Deploy realizado com sucesso (status verde)
- [ ] Site abrindo normalmente no navegador

### No Sistema:
- [ ] Consegue acessar a página de Configurações
- [ ] Consegue salvar as credenciais Z-API sem erro
- [ ] Badge mostra "Configurado" em verde após salvar
- [ ] Status da conexão mostra "Conectado" (se credenciais corretas)

---

## Ainda com Problemas?

Se você seguiu todos os passos acima e ainda está com erro:

1. **Anote exatamente qual mensagem de erro aparece** (tire um print)
2. **Verifique o Console do navegador** (F12) e copie qualquer erro em vermelho
3. **Verifique se o Supabase está online** (às vezes eles têm manutenção)
4. **Tente criar um novo projeto Supabase** do zero e refazer o setup

### Comandos úteis para debug:

No Console do navegador (F12), execute:

```javascript
// Ver se as variáveis de ambiente estão carregadas
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

// Testar conexão com o Supabase manualmente
import { supabase } from './src/integrations/supabase/client'
const { data, error } = await supabase.from('api_settings').select('*')
console.log({ data, error })
```

Se `VITE_SUPABASE_URL` aparecer como `undefined`, o problema é com as variáveis de ambiente no Netlify.

---

## Contato e Suporte

Se precisar de ajuda adicional, certifique-se de ter:
- Print da mensagem de erro
- URL do site no Netlify
- Informação se já executou os SQLs do Supabase
- Console do navegador aberto mostrando os erros
