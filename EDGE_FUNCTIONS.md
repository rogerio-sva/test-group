# ZapManager - Edge Functions

Este documento descreve todas as Edge Functions do sistema e como configurá-las.

## Visão Geral

| Função | Descrição | JWT Requerido |
|--------|-----------|---------------|
| `zapi-groups` | Gerenciamento de grupos WhatsApp | Não |
| `zapi-messages` | Envio de mensagens individuais | Não |
| `zapi-instance` | Status e controle da instância | Não |
| `zapi-broadcast` | Broadcast em background | Não |
| `smart-link-redirect` | Redirecionamento de smart links | Não |
| `process-scheduled-messages` | Processamento de agendamentos | Não |

## Secrets Necessários

Configure estes secrets no Supabase (Dashboard > Project Settings > Edge Functions > Secrets):

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `ZAPI_INSTANCE_ID` | ID da instância Z-API | Sim (se usar Z-API) |
| `ZAPI_TOKEN` | Token da instância Z-API | Sim (se usar Z-API) |
| `ZAPI_CLIENT_TOKEN` | Client token Z-API | Sim (se usar Z-API) |
| `SUPABASE_URL` | URL do projeto Supabase | Auto-configurado |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Auto-configurado |
| `SUPABASE_ANON_KEY` | Anon key | Auto-configurado |

## Funções Detalhadas

### zapi-groups

Gerencia grupos WhatsApp via Z-API.

**Endpoint**: `POST /functions/v1/zapi-groups`

**Ações disponíveis**:

```typescript
// Listar todos os grupos
{ action: 'list' }

// Obter metadados via link de convite
{ action: 'metadata', inviteUrl: 'https://chat.whatsapp.com/xxx' }

// Criar grupo
{ action: 'create', groupName: 'Nome', phones: ['5511999999999'] }

// Atualizar nome
{ action: 'updateName', groupId: '123456@g.us', groupName: 'Novo Nome' }

// Atualizar foto
{ action: 'updatePhoto', groupId: '123456@g.us', groupPhoto: 'https://...' }

// Atualizar descrição
{ action: 'updateDescription', groupId: '123456@g.us', groupDescription: 'Nova descrição' }

// Adicionar participante
{ action: 'addParticipant', groupId: '123456@g.us', phones: ['5511999999999'], autoInvite: true }

// Remover participante
{ action: 'removeParticipant', groupId: '123456@g.us', phones: ['5511999999999'] }

// Obter link de convite
{ action: 'getInviteLink', groupId: '123456-group' }
```

---

### zapi-messages

Envia mensagens individuais via Z-API.

**Endpoint**: `POST /functions/v1/zapi-messages`

**Ações disponíveis**:

```typescript
// Enviar texto
{ 
  action: 'sendText', 
  phone: '5511999999999', 
  message: 'Olá!',
  delayMessage: 3,
  mentionsEveryOne: true // opcional - menciona todos
}

// Enviar imagem
{ 
  action: 'sendImage', 
  phone: '5511999999999', 
  image: 'https://...', 
  caption: 'Legenda',
  mentionsEveryOne: true
}

// Enviar vídeo
{ 
  action: 'sendVideo', 
  phone: '5511999999999', 
  video: 'https://...', 
  caption: 'Legenda',
  mentionsEveryOne: true
}

// Enviar áudio
{ 
  action: 'sendAudio', 
  phone: '5511999999999', 
  audio: 'https://...',
  mentionsEveryOne: true
}

// Enviar documento
{ 
  action: 'sendDocument', 
  phone: '5511999999999', 
  document: 'https://...', 
  fileName: 'arquivo.pdf',
  mentionsEveryOne: true
}

// Enviar link com preview
{ 
  action: 'sendLink', 
  phone: '5511999999999', 
  message: 'Confira:', 
  linkUrl: 'https://...',
  title: 'Título',
  linkDescription: 'Descrição',
  image: 'https://...'
}
```

---

### zapi-instance

Gerencia a instância WhatsApp.

**Endpoint**: `POST /functions/v1/zapi-instance`

**Ações disponíveis**:

```typescript
// Status da conexão
{ action: 'status' }
// Retorna: { connected: boolean, session: boolean, smartphoneConnected: boolean }

// QR Code para conexão
{ action: 'qrcode' }
// Retorna: { value: 'base64...' }

// Desconectar
{ action: 'disconnect' }

// Reiniciar
{ action: 'restart' }
```

---

### zapi-broadcast

Processa broadcast de mensagens em background.

**Endpoint**: `POST /functions/v1/zapi-broadcast`

**Request**:
```typescript
{
  messageHistoryId: 'uuid-da-mensagem',
  delayBetween: 5000, // ms entre mensagens (default: 5000)
  mentionsEveryOne: false // mencionar todos (default: false)
}
```

**Funcionamento**:
1. Busca `message_history` pelo ID
2. Busca `message_send_details` pendentes
3. Processa em batches de 50
4. Atualiza status em tempo real
5. Auto-invoca para continuar se houver mais

---

### smart-link-redirect

Redireciona smart links para grupos WhatsApp.

**Endpoint**: `GET /functions/v1/smart-link-redirect?slug=meu-link`

**Query params**:
- `slug`: Slug do smart link (obrigatório)

**Funcionamento**:
1. Busca smart link pelo slug
2. Verifica grupos da campanha
3. Obtém contagem de membros via Z-API
4. Seleciona primeiro grupo disponível
5. Registra clique para analytics
6. Retorna HTML com redirecionamento

---

### process-scheduled-messages

Processa mensagens agendadas.

**Endpoint**: `POST /functions/v1/process-scheduled-messages`

**Funcionamento** (executado via pg_cron a cada minuto):
1. Busca mensagens com `status = 'scheduled'` e `scheduled_at <= now()`
2. Atualiza status para `pending`
3. Invoca `zapi-broadcast` para cada mensagem

## Deploy das Edge Functions

### Via Supabase CLI

1. Instale o CLI:
```bash
npm install -g supabase
```

2. Login:
```bash
supabase login
```

3. Link ao projeto:
```bash
supabase link --project-ref YOUR_PROJECT_ID
```

4. Deploy de todas as funções:
```bash
supabase functions deploy
```

5. Deploy de função específica:
```bash
supabase functions deploy zapi-groups
```

### Via Dashboard

1. Acesse Supabase Dashboard
2. Vá em Edge Functions
3. Clique em "New Function"
4. Cole o código de cada função
5. Configure os secrets necessários

## Configuração no config.toml

```toml
project_id = "your-project-id"

[functions.zapi-groups]
verify_jwt = false

[functions.zapi-messages]
verify_jwt = false

[functions.zapi-instance]
verify_jwt = false

[functions.zapi-broadcast]
verify_jwt = false

[functions.smart-link-redirect]
verify_jwt = false

[functions.process-scheduled-messages]
verify_jwt = false
```

## Logs e Debug

### Visualizar logs

```bash
supabase functions logs zapi-groups
```

### Logs com filtro

```bash
supabase functions logs zapi-broadcast --search "error"
```

### Via Dashboard

1. Supabase Dashboard > Edge Functions
2. Selecione a função
3. Aba "Logs"

## Segurança

### Tokens Mascarados

Os logs mascaram tokens sensíveis:
```typescript
function maskSensitiveUrl(url: string): string {
  return url.replace(/\/token\/[^\/]+/, '/token/***MASKED***');
}
```

### CORS

Todas as funções incluem headers CORS:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

## Troubleshooting

### Erro: "Function not found"
- Verifique se a função foi deployada
- Confirme o nome exato da função

### Erro: "CORS error"
- Verifique se a função retorna headers CORS
- Verifique handler de OPTIONS

### Erro: "Timeout"
- Broadcasts grandes usam auto-invocação
- Verifique se `SUPABASE_URL` está configurado

### Erro: "Z-API error"
- Verifique credenciais nos secrets
- Confirme que a instância está conectada
- Verifique limites de rate da Z-API

### Erro: "Database error"
- Verifique `SUPABASE_SERVICE_ROLE_KEY`
- Confirme que as tabelas existem
- Verifique RLS policies
