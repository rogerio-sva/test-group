# Gestor de Grupos

Sistema completo para gerenciamento de grupos WhatsApp em larga escala.

## Funcionalidades

- Gerenciamento de grupos WhatsApp
- Envio de mensagens em massa (broadcast)
- Links Inteligentes com rotacao automatica
- Agendamento de mensagens
- Campanhas e organizacao de grupos
- Analises e relatorios

---

## Instalacao Rapida (3 Passos)

### Passo 1: Criar Banco de Dados (Supabase)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Crie um novo projeto (escolha uma senha forte)
3. Va em **SQL Editor** e cole o conteudo do arquivo `supabase/complete_setup.sql`
4. Clique em **Run** para criar as tabelas

### Passo 2: Deploy no Netlify

1. Acesse [netlify.com](https://netlify.com) e crie uma conta
2. Conecte seu repositorio ou faca upload do codigo
3. Va em **Site Settings > Environment Variables** e adicione:

| Variavel | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase (ex: https://xxx.supabase.co) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave "anon/public" do Supabase |

**Onde encontrar essas informacoes:**
- No Supabase, va em **Settings > API**
- Copie a **Project URL** e a **anon public key**

4. Faca o deploy (Netlify detecta automaticamente como projeto Vite)

### Passo 3: Configurar Z-API

1. Crie uma conta em [z-api.io](https://z-api.io)
2. Crie uma nova instancia e conecte seu WhatsApp (escaneie o QR Code)
3. Abra seu sistema (URL do Netlify) e va em **Configuracoes**
4. Preencha as credenciais Z-API:
   - Instance ID
   - Token
   - Client Token

Pronto! Seu sistema esta configurado e funcionando.

---

## Perguntas Frequentes

### Preciso saber programar?

Nao! A instalacao e simples e nao requer conhecimento tecnico. Siga os 3 passos acima.

### Quanto custa?

- **Supabase**: Gratuito (plano Free cobre a maioria dos usos)
- **Netlify**: Gratuito (plano Free)
- **Z-API**: Plano a partir de R$ 49,90/mes

### E seguro?

Sim. Suas credenciais ficam armazenadas de forma segura no banco de dados do Supabase.

### Posso usar em multiplos computadores?

Sim! O sistema e web, acesse de qualquer lugar pelo link do Netlify.

---

## Stack Tecnica

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Database + Edge Functions + Storage)
- Z-API (WhatsApp)

## Suporte

Se tiver duvidas durante a instalacao, entre em contato com o suporte.
