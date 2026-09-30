# Detonado

Biblioteca pessoal de jogos. Monorepo com backend Fastify e frontend React: busca no IGDB, seis status, horas e nota manuais, tempos do HowLongToBeat gravados ao adicionar o jogo.

## Stack

### Monorepo

- **pnpm workspaces** — gerenciador de pacotes e workspaces
- **`packages/shared`** (`@detonado/shared`) — schemas Zod usados pelo backend. O frontend mantém os tipos em `apps/frontend/src/types/api.ts`.

### Backend (`apps/backend`)

- **Node 22 LTS** + TypeScript (ESM, `NodeNext`)
- **Fastify 5** — servidor HTTP
- **Prisma 7** — ORM com driver adapter `pg`
- **PostgreSQL 17** — banco principal
- **Redis 7** — store de sessão
- **@fastify/session** + **connect-redis** — sessões server-side
- **argon2** — hash de senha
- **zod 4** — validação de schemas
- **croner** — agendamento de jobs
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
- **Tailwind CSS 4** — estilos
- **shadcn/ui** — componentes (via `class-variance-authority`)

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
│   │       ├── lib/         # helpers (hash, errors, validate, igdb, hltb, email, requireAuth)
│   │       ├── plugins/     # prisma, redis, session, swagger, cron, cors, rateLimit, igdb, hltb, errorHandler
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
| Controller | parse HTTP, validação, response | service                     |
| Service    | regras de negócio, orquestração | repository, outros services |
| Repository | queries no banco                | Prisma                      |

### Modelo de dados

```
User
  id, email, passwordHash
  emailVerified, emailVerificationToken, emailVerificationExpiresAt
  consentedAt, sessionVersion
  createdAt, updatedAt
  └── LibraryEntry (1:N)
  └── PasswordResetToken (1:N)

LibraryEntry
  id, userId, igdbId, name, coverUrl, genres[], platforms[]
  status (WISHLIST | BACKLOG | PLAYING | PAUSED | COMPLETED | DROPPED)
  userPlatform?, rating? (inteiro 0–10), hoursPlayed?, notes?, completedAt?
  hltbMain?, hltbMainExtra?, hltbCompletionist?
  unique (userId, igdbId)
```

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
cp apps/backend/.env.exemple apps/backend/.env
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

Com default: `NODE_ENV=development`, `PORT=3000`, `APP_URL=http://localhost:5173`, `EMAIL_FROM=onboarding@resend.dev`, `IGDB_TIMEOUT_MS=5000`, `HLTB_TIMEOUT_MS=5000`.

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
| `pnpm db:seed`                | insere usuários de teste (e-mail não verificado; o login recusa) |
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
| POST   | `/api/auth/logout`              | encerra sessão                                 | sim  |
| GET    | `/api/auth/me`                  | usuário atual                                  | sim  |
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
| GET    | `/api/games/:igdbId`         | busca jogo por ID IGDB | sim  |

### Library

| Método | Rota                 | Descrição                                      | Auth |
| ------ | -------------------- | ---------------------------------------------- | ---- |
| GET    | `/api/library`       | lista a biblioteca do usuário                  | sim  |
| POST   | `/api/library`       | adiciona jogo; copia ficha IGDB e tempos HLTB  | sim  |
| GET    | `/api/library/stats` | estatísticas                                   | sim  |
| GET    | `/api/library/:id`   | entrada pelo id interno (cuid)                 | sim  |
| PATCH  | `/api/library/:id`   | atualiza entrada                               | sim  |
| DELETE | `/api/library/:id`   | remove jogo                                    | sim  |

### Utilitários

| Método | Rota      | Descrição                                      | Auth |
| ------ | --------- | ---------------------------------------------- | ---- |
| GET    | `/health` | `{ ok: true }`, sem checar Postgres nem Redis  | não  |
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

## Sessões

- Persistidas no Redis (prefixo `sess:`)
- TTL de 7 dias, rolling
- Cookie `httpOnly`
- `sameSite: lax` em desenvolvimento; `sameSite: none` e `secure` em produção
- Troca de senha incrementa `sessionVersion` e derruba sessões antigas

## Testes

Vitest com mocks de repositório (`vi.fn()`), sem dependências externas.

```bash
pnpm test          # tudo
pnpm test:watch    # watch
pnpm test:cov      # coverage
```

```
tests/
├── auth.service.test.ts
├── game.service.test.ts
├── igdb.client.test.ts
├── igdb.genre-translations.test.ts
├── library.service.test.ts
├── library.stats.service.test.ts
├── requireAuth.test.ts
└── user.service.test.ts
```

Não há teste HTTP. A suíte não sobe Postgres nem Redis.

## Adicionando um módulo (backend)

```bash
pnpm gen:module <name>   # ex: pnpm gen:module product
```

Gera `src/modules/<name>/` com todos os arquivos. Depois:

1. Adicionar modelo em `prisma/schema.prisma`
2. `pnpm prisma:migrate && pnpm prisma:generate`
3. Registrar rotas em `src/app.ts`

## Licença

MIT
