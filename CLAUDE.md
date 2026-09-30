# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo layout

pnpm workspaces monorepo. Each package has its own `CLAUDE.md` with deeper guidance.

```
apps/
  backend/   # Fastify 5 + Prisma 7 + PostgreSQL 17 + Redis 7  → apps/backend/CLAUDE.md
  frontend/  # React 19 + Vite + TanStack Router/Query          → apps/frontend/CLAUDE.md
packages/
  shared/    # @detonado/shared — Zod schemas used by the backend. The frontend does not depend on this package; its types live in apps/frontend/src/types/api.ts.
```

## Root commands

```bash
pnpm dev:backend    # backend watch mode (tsx)
pnpm dev:frontend   # Vite dev server (http://localhost:5173)
pnpm build          # compile all packages
pnpm lint           # Biome lint across all packages
```

## Local setup

```bash
pnpm install

# 1. Start infrastructure (Postgres 17 + Redis 7)
cd apps/backend && docker compose up -d

# 2. Configure env (see apps/backend/.env.exemple)
cp apps/backend/.env.exemple apps/backend/.env
# Required: DATABASE_URL, REDIS_URL, SESSION_SECRET (≥32 chars), COOKIE_SECRET (≥32 chars),
#            CORS_ORIGIN, IGDB_CLIENT_ID, IGDB_CLIENT_SECRET, RESEND_API_KEY
# Defaults: APP_URL=http://localhost:5173, EMAIL_FROM=onboarding@resend.dev

# 3. Database
cd apps/backend
pnpm prisma:migrate && pnpm prisma:generate
pnpm db:seed   # alice@example.com, bob@example.com / password123, emailVerified=false
```

Seed users cannot log in until `emailVerified` is true. Login rejects an unverified email. Email verification links expire 24 hours after they are issued; a token with no expiry is rejected.

API routes are mounted under `/api` (`/health` and `/docs` are not). Swagger UI (dev only): http://localhost:3000/docs — the document title is still the boilerplate string.

## Tech decisions that span both apps

- **Zod 4** for validation. Cross-app schemas live in `@detonado/shared` and are consumed by the backend. The frontend defines its own types in `src/types/api.ts`.
- **Biome** (not ESLint/Prettier) for linting and formatting. Backend: 100-char line width, single quotes. Frontend: tabs and double quotes.
- **Session-based auth** (not JWT) — `req.session.userId` and `sessionVersion` after login, stored in Redis. `requireAuth` drops the session when the version no longer matches.
- **ESM + NodeNext** in the backend — always use `.js` extensions in imports even for `.ts` source files.
- **Path alias `@`** maps to `src/` in both apps.
- Product is a private game library (IGDB search, six statuses, HLTB times stored on add). There is no social graph and no Steam import.
