# Detonado

Biblioteca pessoal de jogos. Monorepo com backend Fastify e frontend React: busca no IGDB, seis status, horas e nota manuais, tempos do HowLongToBeat gravados ao adicionar o jogo.

O plano de melhorias, os critérios de legibilidade e o registro de execução do backend estão em [docs/backend-improvements.md](docs/backend-improvements.md).

## Stack

### Monorepo

- **pnpm workspaces** — gerenciador de pacotes e workspaces
- **`packages/shared`** (`@detonado/shared`) — schemas Zod usados pelo backend; o runtime carrega JavaScript compilado em `dist`. Os comandos de build, dev e teste do backend compilam o pacote antes de executar. O frontend mantém os tipos em `apps/frontend/src/types/api.ts`.

### Backend (`apps/backend`)

- **Node 22 LTS** + TypeScript (ESM, `NodeNext`)
- **Fastify 5** — servidor HTTP
- **Prisma 7** — ORM com driver adapter `pg`
- **PostgreSQL 17** — banco principal
- **Redis 7** — store de sessão
- **@fastify/session** + **connect-redis** — sessões server-side
- **argon2** — hash de senha
- **zod 4** — validação de schemas
- **Swagger / OpenAPI 3.1** — documentação automática
- **Biome** — lint e formatação
- **Vitest** — testes unitários
- **IGDB API** — busca de jogos
- **HowLongToBeat** (`howlongtobeat-ts`) — estimativa de duração gravada na entrada da biblioteca
- **Resend** — e-mail de verificação e de redefinição de senha

### Frontend (`apps/frontend`)

- **React 19** + TypeScript
- **Vite 8** — bundler
- **TanStack Router** — roteamento type-safe
- **TanStack Query** — data fetching e cache
- **CSS Modules** — estilos locais por feature
- **CSS custom properties** — tokens de marca e temas
- **Radix UI** — primitivas acessíveis sem camada de utilitários

## Estrutura do monorepo

```
detonado/
├── apps/
│   ├── backend/             # API Fastify
│   │   ├── prisma/          # schema, migrations, seed
│   │   ├── scripts/         # create-module, gen-bruno
│   │   ├── bruno/           # coleção Bruno API
│   │   └── src/
│   │       ├── config/      # env loader (zod)
│   │       ├── lib/         # helpers (hash, errors, cache, igdb, hltb, email, requireAuth)
│   │       ├── plugins/     # prisma, redis, session, csrf, swagger, cors, rateLimit, igdb, hltb, errorHandler
│   │       ├── modules/
│   │       │   ├── auth/    # conta, sessão, verificação de e-mail, consentimento, exportação
│   │       │   ├── password-reset/ # código de 6 dígitos, 15 min
│   │       │   ├── user/    # repositório e service de usuário
│   │       │   ├── game/    # busca de jogos via IGDB
│   │       │   └── library/ # biblioteca pessoal de jogos
│   │       ├── app.ts       # build da instância Fastify
│   │       └── server.ts    # bootstrap
│   └── frontend/            # SPA React
│       └── src/
│           ├── features/    # auth, dashboard, detail, landing, library, search, stats
│           ├── lib/         # cliente HTTP (api.ts)
│           ├── routes/      # rotas TanStack Router
│           └── types/       # tipos locais da API
└── packages/
    └── shared/              # @detonado/shared — schemas Zod do backend
```

### Camadas (backend)

| Camada     | Responsabilidade                | Pode tocar                  |
| ---------- | ------------------------------- | --------------------------- |
| Routes/handler | validação HTTP, parâmetros e resposta | service |
| Service    | regras de negócio, orquestração | repository, outros services |
| Repository | queries no banco                | Prisma                      |

Controllers separados ficam nos fluxos de conta e recuperação; games e biblioteca mantêm handlers simples junto das rotas. Schemas do pacote shared ficam separados em `auth.ts`, `library.ts` e `game.ts`.

### Modelo de dados

```
User
  id, email, passwordHash, preferredPlatform?
  emailVerified, emailVerificationToken (SHA-256 do token do e-mail), emailVerificationExpiresAt
  consentedAt, sessionVersion
  createdAt, updatedAt
  └── LibraryEntry (1:N)
  └── PasswordResetToken (1:N)

LibraryEntry
  id, userId, igdbId, name, coverUrl, genres[], platforms[]
  status (WISHLIST | BACKLOG | PLAYING | PAUSED | COMPLETED | DROPPED)
  userPlatform?, rating? (inteiro 0–10), hoursPlayed?, notes?, completedAt?
  hltbMain?, hltbMainExtra?, hltbCompletionist?, hltbStatus? (FOUND | MISS | FAILED)
  unique (userId, igdbId)
```

HLTB usa `howlongtobeat-ts@1.3.1`, com cache separado do IGDB: resultado encontrado
por 24 horas e ausência confirmada por uma hora. Falhas não são cacheadas e não
apagam tempos já salvos. `hltbStatus=FAILED` pode coexistir com os últimos tempos
válidos. O refresh aceita até cinco chamadas por usuário por minuto. Entradas
antigas sem tempos podem ser recuperadas pelo botão de atualização no detalhe.

O detalhe no frontend não chama `GET /api/library/:id`. Ele baixa `GET /api/library` e acha a entrada pelo `igdbId`. O `:id` da API é o cuid interno.

## Pré-requisitos

- Node 22+
- pnpm
- Docker (Postgres + Redis via compose)
- Conta IGDB (Twitch Developer) — para busca de jogos

## Setup

```bash
# 1. instalar dependências
pnpm install

# 2. subir banco e cache
cd apps/backend && docker compose up -d

# 3. variáveis de ambiente
cp apps/backend/.env.example apps/backend/.env
# preencher DATABASE_URL, REDIS_URL, SESSION_SECRET, COOKIE_SECRET, CORS_ORIGIN,
# IGDB_CLIENT_ID, IGDB_CLIENT_SECRET e RESEND_API_KEY

# 4. rodar migrations
pnpm --filter backend prisma:migrate

# 5. gerar Prisma Client
pnpm --filter backend prisma:generate

# 6. rodar backend em dev
pnpm --filter backend dev

# 7. rodar frontend em dev
pnpm --filter frontend dev
```

Backend: `http://localhost:3000` | Frontend: `http://localhost:5173`

## Variáveis de ambiente (backend)

Obrigatórias para o processo subir (`src/config/env.ts`):

```
DATABASE_URL=postgresql://app:app@localhost:5432/app
REDIS_URL=redis://localhost:6379
SESSION_SECRET=<min 32 chars>
COOKIE_SECRET=<min 32 chars>
CORS_ORIGIN=http://localhost:5173
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
RESEND_API_KEY=
```

Com default: `NODE_ENV=development`, `PORT=3000`, `APP_URL=http://localhost:5173`, `EMAIL_FROM=onboarding@resend.dev`, `IGDB_TIMEOUT_MS=5000`, `HLTB_TIMEOUT_MS=5000`, `TRUST_PROXY=false`.

`TRUST_PROXY` aceita `true`, `false` ou um número de saltos. Atrás de um proxy reverso, use `TRUST_PROXY=1`. O padrão `false` faz o limite de taxa ver o IP do proxy.

`EMAIL_FROM` padrão só entrega para a conta dona da chave Resend. Verificação e redefinição de senha dependem de um domínio verificado para chegar na caixa de outra pessoa.

Gerar secrets (PowerShell):

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
```

## Scripts

### Raiz

| Comando                           | Descrição                |
| --------------------------------- | ------------------------ |
| `pnpm --filter backend <script>`  | rodar script no backend  |
| `pnpm --filter frontend <script>` | rodar script no frontend |

### Backend

| Comando                       | Descrição                      |
| ----------------------------- | ------------------------------ |
| `pnpm dev`                    | servidor em modo watch         |
| `pnpm build`                  | compila TypeScript pra `dist/` |
| `pnpm start`                  | roda build de produção         |
| `pnpm prisma:generate`        | gera Prisma Client             |
| `pnpm prisma:migrate`         | aplica migrations (dev)        |
| `pnpm db:seed`                | alice e bob / password123, e-mail verificado (também na atualização) |
| `pnpm db:clean`               | limpa todas as tabelas         |
| `pnpm db:reset`               | recria banco do zero           |
| `pnpm test`                   | roda testes                    |
| `pnpm test:watch`             | testes em watch                |
| `pnpm test:cov`               | testes com coverage            |
| `pnpm lint` / `pnpm lint:fix` | Biome lint                     |
| `pnpm gen:module <name>`      | scaffold de novo módulo        |
| `pnpm gen:bruno`              | gera coleção Bruno             |

### Frontend

| Comando        | Descrição            |
| -------------- | -------------------- |
| `pnpm dev`     | servidor Vite em dev |
| `pnpm build`   | build de produção    |
| `pnpm preview` | preview do build     |

## Endpoints

Tudo o que é API fica sob `/api`, exceto `/health` e `/docs`.

### Auth

| Método | Rota                            | Descrição                                      | Auth |
| ------ | ------------------------------- | ---------------------------------------------- | ---- |
| POST   | `/api/auth/register`            | cria usuário e envia link de verificação (24 h) | não  |
| GET    | `/api/auth/verify-email?token=` | confirma o e-mail                              | não  |
| POST   | `/api/auth/resend-verification` | reenvia o link                                 | não  |
| POST   | `/api/auth/login`               | sessão; exige e-mail verificado                | não  |
| GET    | `/api/auth/csrf`                | token da sessão para o header `x-csrf-token`   | não  |
| POST   | `/api/auth/logout`              | encerra sessão                                 | sim  |
| GET    | `/api/auth/me`                  | usuário atual                                  | sim  |
| PATCH  | `/api/auth/preferences` | salva ou remove plataforma preferida | sim |
| PATCH  | `/api/auth/account`             | troca e-mail ou senha                          | sim  |
| DELETE | `/api/auth/account`             | exclui a conta, com senha                      | sim  |
| POST   | `/api/auth/consent`             | grava consentimento                            | sim  |
| GET    | `/api/auth/export`              | exporta dados da conta                         | sim  |

### Redefinição de senha

| Método | Rota                           | Descrição                          | Auth |
| ------ | ------------------------------ | ---------------------------------- | ---- |
| POST   | `/api/password-reset/request`  | envia código de 6 dígitos (15 min) | não  |
| POST   | `/api/password-reset/check`    | confere o código                   | não  |
| POST   | `/api/password-reset/verify`   | troca a senha e invalida sessões   | não  |

### Games (IGDB)

| Método | Rota                         | Descrição              | Auth |
| ------ | ---------------------------- | ---------------------- | ---- |
| GET    | `/api/games/search?q=<nome>` | busca jogos por nome   | sim  |
| GET    | `/api/games/platforms` | catálogo de plataformas IGDB | sim |
| GET    | `/api/games/:igdbId`         | busca jogo por ID IGDB | sim  |

### Library

| Método | Rota                 | Descrição                                      | Auth |
| ------ | -------------------- | ---------------------------------------------- | ---- |
| GET    | `/api/library`       | lista a biblioteca do usuário                  | sim  |
| POST   | `/api/library`       | adiciona jogo; copia ficha IGDB e tempos HLTB  | sim  |
| POST   | `/api/library/:id/hltb` | busca de novo os tempos do HowLongToBeat    | sim  |
| GET    | `/api/library/stats` | estatísticas                                   | sim  |
| GET    | `/api/library/:id`   | entrada pelo id interno (cuid)                 | sim  |
| PATCH  | `/api/library/:id`   | atualiza entrada                               | sim  |
| DELETE | `/api/library/:id`   | remove jogo                                    | sim  |

### Utilitários

| Método | Rota      | Descrição                                      | Auth |
| ------ | --------- | ---------------------------------------------- | ---- |
| GET    | `/health` | `{ ok: true }` se Postgres e Redis respondem; 503 se não | não  |
| GET    | `/docs`   | Swagger UI, fora de produção                   | não  |

## Tratamento de erros

```json
{
  "error": {
    "code": "EMAIL_TAKEN",
    "message": "Email já cadastrado",
    "details": null
  }
}
```

| Code               | Status |
| ------------------ | ------ |
| `VALIDATION_ERROR` | 400    |
| `UNAUTHORIZED`     | 401    |
| `FORBIDDEN`        | 403    |
| `NOT_FOUND`        | 404    |
| `CONFLICT`         | 409    |
| `INTERNAL`         | 500    |
| `EMAIL_DELIVERY_FAILED` | 503 |

## Sessões

- Persistidas no Redis (prefixo `sess:`)
- TTL de 7 dias, rolling
- Cookie `httpOnly`
- `sameSite: lax` em desenvolvimento; `sameSite: none` e `secure` em produção
- POST, PATCH e DELETE exigem o header `x-csrf-token` emitido por `GET /api/auth/csrf`
- Login troca a sessão; o cliente busca outro token em seguida
- Troca de senha incrementa `sessionVersion` e derruba sessões antigas
- O limite de taxa fica no Redis (prefixo `detonado-rl:`)

## Testes

Vitest com testes de regras, clientes externos simulados e fluxos HTTP isolados.
A execução padrão não precisa de serviços externos. Testes PostgreSQL são opt-in
com `BACKEND_TEST_DATABASE_URL`, apontando para um banco de teste com migrations
aplicadas. Não usam automaticamente o `DATABASE_URL` da aplicação.

Recuperação de senha mantém um orçamento de dez tentativas por código, compartilhado
entre check e verify. A migration `20261013180000_add_reset_attempts` adiciona o contador.
Aplique as migrations antes de iniciar esta versão do backend:

```bash
pnpm --filter backend exec prisma migrate deploy
```

```bash
pnpm test          # tudo
pnpm test:watch    # watch
pnpm test:cov      # coverage
```

Os testes cobrem auth/CSRF/sessão, biblioteca, fila, estatísticas, validação,
IGDB, HLTB, limites de taxa e erros. A suíte PostgreSQL cobre concorrência, isolamento
entre usuários, consumo de tokens e SQL de estatísticas. Consulte
[docs/backend-improvements.md](docs/backend-improvements.md) para execução isolada.

## Adicionando um módulo (backend)

```bash
pnpm gen:module <name>   # ex: pnpm gen:module product
```

Gera quatro arquivos em `src/modules/<name>/`: routes, service, repository e schema.
O template usa autenticação e filtro de proprietário por padrão. O modelo precisa
de `userId`, `id`, `createdAt` e `updatedAt`; complete os schemas de entrada e resposta. Depois:

1. Adicionar modelo em `prisma/schema.prisma`
2. `pnpm prisma:migrate && pnpm prisma:generate`
3. Registrar rotas em `src/app.ts`

## Licença

MIT

## Roadmap de produto

Prioridades, critérios de aceite e andamento das novas funcionalidades estão em [docs/product-roadmap.md](docs/product-roadmap.md). A preferência de plataforma requer a migration `20261013200000_add_preferred_platform`; a produção aplica migrations antes de iniciar o backend.

Filtros salvos requerem `20261013210000_add_saved_filters`. CRUD autenticado em `/api/library/filters` e `/:id`, com isolamento por usuário; filtros são aplicados na biblioteca pelo frontend.

Sessões requerem `20261013220000_add_play_sessions`. CRUD em `/api/library/:id/sessions` e `/:sessionId`; UUID `clientId` garante idempotência por usuário. A migração preserva horas anteriores em `baseHours`, soma sessões ao total e mantém `lastSessionAt`.

Coleções e tags requerem `20261013230000_add_collections_and_tags`. CRUD em `/api/library/collections` e `/tags`; vínculos múltiplos em `PATCH /api/library/:id/organization`. Agrupamentos não substituem status e sua exclusão preserva jogos.
