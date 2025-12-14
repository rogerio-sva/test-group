# ZapManager - Documentação Completa

## Visão Geral

ZapManager é um sistema de gerenciamento de grupos WhatsApp desenvolvido para operações em larga escala. O sistema permite:

- **Gerenciamento de Grupos**: Listar, criar, editar e gerenciar grupos WhatsApp
- **Smart Links**: Links personalizados que rotacionam entre grupos baseado em limites de membros
- **Broadcast de Mensagens**: Envio em massa para múltiplos grupos com suporte a texto, imagem, vídeo, áudio e documentos
- **Agendamento**: Programar envios para datas/horários futuros
- **Campanhas**: Organizar grupos em campanhas para rotação de smart links

## Stack Tecnológica

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Componentes UI
- **TanStack Query** - Gerenciamento de estado/cache

### Backend
- **Supabase** - Database (PostgreSQL) + Auth + Storage + Edge Functions
- **Deno** - Runtime para Edge Functions
- **Z-API** / **Evolution API** - Integração WhatsApp

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  Pages          │  Components      │  Hooks                 │
│  - Dashboard    │  - GroupCard     │  - useZAPIGroups       │
│  - Groups       │  - MessageCard   │  - useBroadcastMessage │
│  - Messages     │  - SmartLinkCard │  - useCampaigns        │
│  - SmartLinks   │  - GroupSelector │  - useBackgroundBroadcast │
│  - Settings     │                  │                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                   │
├─────────────────────────────────────────────────────────────┤
│  zapi-groups    │  zapi-messages   │  zapi-broadcast        │
│  zapi-instance  │  smart-link-redirect │ process-scheduled  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      WhatsApp Provider                       │
├─────────────────────────────────────────────────────────────┤
│            Z-API            │        Evolution API           │
│    (api.z-api.io)          │   (your-evolution-instance)    │
└─────────────────────────────────────────────────────────────┘
```

## Estrutura de Pastas

```
zapmanager/
├── src/
│   ├── components/           # Componentes React
│   │   ├── ui/              # Componentes shadcn/ui
│   │   ├── layout/          # Header, Sidebar, MainLayout
│   │   ├── groups/          # GroupCard, GroupSelector, GroupEditSheet
│   │   ├── messages/        # MessageCard
│   │   ├── broadcast/       # ActiveBroadcastsPanel
│   │   └── smart-links/     # SmartLinkCard, CampaignGroupsManager
│   │
│   ├── core/                 # Lógica de negócio central
│   │   ├── types/           # Tipos e interfaces
│   │   └── services/        # Serviços de negócio
│   │
│   ├── providers/            # Adaptadores de provedores WhatsApp
│   │   ├── types.ts         # Interface comum
│   │   ├── index.ts         # Factory para selecionar provider
│   │   ├── zapi/            # Implementação Z-API
│   │   └── evolution/       # Implementação Evolution API
│   │
│   ├── hooks/                # React hooks customizados
│   │   ├── use-zapi.ts      # Hooks para Z-API
│   │   ├── use-campaigns.ts # Hooks para campanhas
│   │   └── use-background-broadcast.ts
│   │
│   ├── pages/                # Páginas da aplicação
│   │   ├── Dashboard.tsx
│   │   ├── Groups.tsx
│   │   ├── Messages.tsx
│   │   ├── SmartLinks.tsx
│   │   └── Settings.tsx
│   │
│   ├── lib/                  # Utilitários
│   │   ├── utils.ts
│   │   └── zapi.ts          # Cliente Z-API (legacy)
│   │
│   └── integrations/
│       └── supabase/
│           ├── client.ts    # Cliente Supabase (auto-gerado)
│           └── types.ts     # Tipos do banco (auto-gerado)
│
├── supabase/
│   ├── config.toml          # Configuração Supabase
│   ├── complete_setup.sql   # SQL consolidado para setup
│   └── functions/           # Edge Functions
│       ├── zapi-groups/
│       ├── zapi-messages/
│       ├── zapi-instance/
│       ├── zapi-broadcast/
│       ├── smart-link-redirect/
│       └── process-scheduled-messages/
│
├── .env.example              # Template de variáveis de ambiente
├── DATABASE_SETUP.md         # Instruções de setup do banco
├── EDGE_FUNCTIONS.md         # Documentação das Edge Functions
└── README.md                 # Instruções gerais
```

## Fluxos de Dados

### 1. Broadcast de Mensagens

```
┌──────────┐    ┌────────────────┐    ┌───────────────┐    ┌─────────────┐
│ Frontend │───▶│ message_history │───▶│ zapi-broadcast │───▶│   Z-API    │
│          │    │ (DB insert)     │    │ (Edge Function)│    │            │
└──────────┘    └────────────────┘    └───────────────┘    └─────────────┘
                        │                      │
                        ▼                      │
              ┌─────────────────┐              │
              │message_send_details│◀──────────┘
              │  (status updates) │
              └─────────────────┘
```

1. Frontend cria registro em `message_history`
2. Frontend cria registros em `message_send_details` para cada grupo
3. Edge Function `zapi-broadcast` é invocada
4. Processa em batches de 50 grupos
5. Atualiza status em tempo real no banco
6. Auto-invoca para continuar se houver mais grupos

### 2. Smart Links

```
┌──────────┐    ┌─────────────────────┐    ┌─────────────────┐
│  Usuário │───▶│ smart-link-redirect │───▶│ campaign_groups │
│  (click) │    │   (Edge Function)   │    │    (DB query)   │
└──────────┘    └─────────────────────┘    └─────────────────┘
                         │                          │
                         ▼                          ▼
                ┌────────────────┐         ┌───────────────┐
                │smart_link_clicks│         │ Z-API metadata│
                │   (tracking)   │         │ (member count)│
                └────────────────┘         └───────────────┘
                                                   │
                                                   ▼
                                          ┌───────────────┐
                                          │  WhatsApp     │
                                          │  Group Invite │
                                          └───────────────┘
```

1. Usuário clica no smart link
2. Edge Function busca campanha e grupos ativos
3. Verifica contagem de membros via Z-API
4. Seleciona primeiro grupo disponível
5. Registra clique para analytics
6. Redireciona para grupo WhatsApp

### 3. Agendamento de Mensagens

```
┌──────────┐    ┌────────────────┐    ┌──────────────────────┐
│ Frontend │───▶│ message_history │───▶│ process-scheduled    │
│(schedule)│    │(status:scheduled)│   │ (pg_cron every min)  │
└──────────┘    └────────────────┘    └──────────────────────┘
                                               │
                                               ▼
                                      ┌───────────────┐
                                      │ zapi-broadcast │
                                      │ (Edge Function)│
                                      └───────────────┘
```

1. Frontend cria mensagem com `status: 'scheduled'` e `scheduled_at`
2. `pg_cron` executa `process-scheduled-messages` a cada minuto
3. Busca mensagens prontas (`scheduled_at <= now()`)
4. Atualiza status para `pending`
5. Invoca `zapi-broadcast` para processar

## Segurança

### Tokens e Credenciais
- Todos os tokens são armazenados em Supabase Secrets
- Tokens NUNCA são expostos no frontend
- Logs mascaram tokens sensíveis
- RLS policies protegem dados do banco

### Logs
- Tokens são substituídos por `***MASKED***` nos logs
- URLs completas não são logadas
- Apenas ações e IDs são registrados

## Modos de Operação

### Self-Hosted (`APP_MODE=self`)
- Instância única
- Credenciais Z-API em variáveis de ambiente
- Ideal para uso próprio

### Hosted (`APP_MODE=hosted`)
- Multi-tenant
- Credenciais por tenant no banco
- Sistema de trial de 15 dias
- Ideal para SaaS

## Provedores WhatsApp

### Z-API (`PROVIDER=zapi`)
- Provedor padrão
- Requer: `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`
- Documentação: https://developer.z-api.io/

### Evolution API (`PROVIDER=evolution`)
- Alternativa open-source
- Requer: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`
- Documentação: https://doc.evolution-api.com/

## Limitações e Considerações

### Rate Limiting
- Delay recomendado: 5 segundos entre mensagens
- ~753 grupos = ~63 minutos de broadcast
- Batches de 50 grupos para evitar timeout

### Escala
- Sistema testado com 767+ grupos
- Background processing evita timeouts
- Real-time updates via Supabase Realtime

## Próximos Passos

Para exportar o projeto:

1. Configurar Supabase externo (ver `DATABASE_SETUP.md`)
2. Criar Edge Functions (ver `EDGE_FUNCTIONS.md`)
3. Configurar variáveis de ambiente (ver `.env.example`)
4. Configurar `pg_cron` para agendamentos
5. Build e deploy do frontend
