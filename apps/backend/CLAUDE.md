# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # dev server with watch mode (tsx)
pnpm build            # compile TypeScript to dist/
pnpm start            # run production build

pnpm prisma:migrate   # apply migrations (dev)
pnpm prisma:generate  # regenerate Prisma Client

pnpm db:seed          # alice@example.com, bob@example.com / password123; emailVerified stays false, so login rejects them
pnpm db:clean         # delete all rows from every table
pnpm db:reset         # drop DB, re-run migrations, then re-seed (prisma migrate reset)

pnpm lint             # check with Biome
pnpm lint:fix         # auto-fix lint issues
pnpm format           # auto-format with Biome

docker compose up -d  # start Postgres 17 + Redis 7

pnpm gen:module <name>  # scaffold a new module (see "Adding a new module")
```

Tests (Vitest):
```bash
pnpm test                                # run all tests once
pnpm test:watch                          # watch mode
pnpm test:cov                            # with coverage
pnpm test -- tests/auth.service.test.ts  # single file
pnpm test -- -t "returns 201"            # single test by name
```

## Test setup

Tests are unit tests — repositories are mocked with `vi.fn()`, no external services needed. No `.env.test` required. The pattern used in existing tests is a `makeRepo()` factory that returns a plain object of `vi.fn()` stubs, passed to services as `never`:

```ts
function makeRepo(overrides = {}) {
  return { findByEmail: vi.fn(), create: vi.fn(), ...overrides };
}
const service = new AuthService(makeRepo({ findByEmail: vi.fn().mockResolvedValue(null) }) as never);
```

## Architecture

Modular monolith with strict layer separation. All imports use `.js` extensions (ESM + `NodeNext`). Path alias `@` maps to `src/`.

**Module structure** (`src/modules/<name>/`):
- `<name>.schema.ts` — Zod schemas + inferred TypeScript types
- `<name>.repository.ts` — Prisma queries only, no business logic
- `<name>.service.ts` — business rules, calls repository
- `<name>.controller.ts` — HTTP handlers, calls service. Use `parse(schema, req.body)` from `@/lib/validate.js` for manual parsing when needed.
- `<name>.routes.ts` — registers routes, wires dependencies via constructor injection
- `<name>.errors.ts` — domain-specific `AppError` subclasses (optional)

Dependency direction: `routes → controller → service → repository → Prisma`.

**Plugins** (`src/plugins/`): `errorHandler`, `cors`, `rateLimit`, `prisma`, `redis`, `session`, `cron`, `igdb`, `hltb`, `swagger`. Registration order in `app.ts` matters (`errorHandler` and `cors` first). API modules are mounted with prefix `/api`.

**Error handling**: throw subclasses of `AppError` (`src/lib/errors.ts`) from any layer. The global handler in `plugins/errorHandler.ts` serializes them to `{ error: { code, message, details } }`. Available base classes: `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`.

**Auth / protected routes**: use `requireAuth` from `@/lib/requireAuth.js` as a `preHandler` on any route that requires a session. It throws `UnauthorizedError` if `req.session.userId` is absent, and destroys the session when `sessionVersion` does not match the user row. On login, always call `req.session.regenerate()` before writing `userId` to prevent session fixation. Email verification tokens expire 24 hours after issue (`emailVerificationExpiresAt`); a token with a null expiry is invalid.

**Session**: stored in Redis (`sess:` prefix), 7-day TTL, rolling. `request.session.userId` holds the authenticated user ID. Only `session.ts` plugin extends the `Session` interface — do not extend it elsewhere.

**Validation**: Zod schemas on route `body`/`response` via `fastify-type-provider-zod`. Schemas defined in `<module>.schema.ts`, reused in routes and services.

**Environment**: validated at startup via `src/config/env.ts` (Zod). All env access goes through the exported `env` object — never `process.env` directly. Required: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` (≥32 chars), `COOKIE_SECRET` (≥32 chars), `CORS_ORIGIN`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `RESEND_API_KEY`. Defaults: `APP_URL`, `EMAIL_FROM`, timeouts.

**Prisma Client**: generated to `src/generated/prisma/` (gitignored). Uses `@prisma/adapter-pg` (driver adapter). Always run `pnpm prisma:generate` after schema changes.

## Adding a new module

Use the scaffolding command — it generates all six files with the correct patterns:

```bash
pnpm gen:module <name>   # e.g. pnpm gen:module product  /  pnpm gen:module blog-post
```

The script (`scripts/create-module.ts`) creates `src/modules/<name>/` with all files pre-wired and handles pluralization automatically (`category` → `/categories`, `box` → `/boxes`). After running:

1. Add the Prisma model for the resource in `prisma/schema.prisma`.
2. Run `pnpm prisma:migrate && pnpm prisma:generate`.
3. Register the routes in `src/app.ts`:
   ```ts
   import { <name>Routes } from '@/modules/<name>/<name>.routes.js';
   await app.register(<name>Routes);
   ```
