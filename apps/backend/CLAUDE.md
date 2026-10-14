# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # dev server with watch mode (tsx)
pnpm build            # compile TypeScript to dist/
pnpm start            # run production build

pnpm prisma:migrate   # apply migrations (dev)
pnpm prisma:generate  # regenerate Prisma Client

pnpm db:seed          # alice@example.com, bob@example.com / password123; sets emailVerified=true (also on update)
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

Default Vitest execution needs no services or .env. Most tests use small vi.fn
stores and injectable email senders. Services accept public-method Pick contracts,
so service mocks do not need `as never`. Prisma/Fastify boundary fixtures may still
use casts; these are not substitutes for database integration tests.

`tests/backend.database.test.ts` runs only when BACKEND_TEST_DATABASE_URL is
explicitly set. Apply migrations to that disposable database first. It tests
concurrent queue changes, ownership, verification consumption and reset budgets.
Never use the application's DATABASE_URL as an implicit test fallback.

## Architecture and readability

Modular monolith, ESM imports with `.js` and alias `@` for src.

- `<name>.schema.ts`: schemas and named request/change types. Shared schemas are
  split by domain in packages/shared/src; keep its index as exports only.
- `<name>.routes.ts`: validates inputs, infers handler types with ZodTypeProvider,
  and wires dependencies. Simple games/library handlers live here.
- `<name>.service.ts`: explicit product rules and orchestration; avoid conditional
  object spreads and leaking Prisma aggregates into business rules.
- `<name>.repository.ts`: ownership-filtered writes and database transactions.
  Update library rows with updateManyAndReturn to return the actual written row.
- Controllers remain where HTTP work warrants them (sessions and account flows).
  Do not create a controller just to forward a method or parse a validated body.
- library.stats.ts executes and maps statistics queries; no `_sum`/`_count` in service.
- Library create/update/move/remove use withUserLock: SELECT User FOR UPDATE inside
  a transaction. Keep network calls outside it. Normal queue moves swap two rows;
  only legacy null/duplicate positions require normalization.
- Do not monkey-patch pg Pool.query/connect or automatically replay arbitrary
  writes after connection errors. The error handler maps unavailable DB to 503.

Plugins: errorHandler, cors, prisma, redis, rateLimit, session, csrf, igdb, hltb,
swagger. Redis precedes rateLimit/session; session precedes csrf. Rate limits keyed
by session user run at preHandler, after session initialization. API prefix: /api.
The request logger omits query strings so verification tokens are not persisted.

**Error handling**: throw subclasses of `AppError` (`src/lib/errors.ts`) from any layer. The global handler in `plugins/errorHandler.ts` serializes them to `{ error: { code, message, details } }`. Available base classes: `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `EmailDeliveryError` (503).

**Auth / protected routes**: use `requireAuth` from `@/lib/requireAuth.js` as a `preHandler` on any route that requires a session. It throws `UnauthorizedError` if `req.session.userId` is absent, and destroys the session when `sessionVersion` does not match the user row. On login, always call `req.session.regenerate()` before writing `userId` to prevent session fixation. Email verification tokens expire 24 hours after issue (`emailVerificationExpiresAt`); a token with a null expiry is invalid. The column stores `sha256(rawToken)`; the email contains the raw token. Cleartext rows from before the hash do not match and need a resend. POST, PATCH, and DELETE require header `x-csrf-token` equal to `req.session.csrfToken` (`GET /api/auth/csrf` creates it). Login regenerates the session, so the client must fetch a new token afterwards.

**Session**: stored in Redis (`sess:` prefix), 7-day TTL, rolling. `request.session.userId` holds the authenticated user ID. `session.ts` is the only plugin that extends the `Session` interface (`userId`, `sessionVersion`, `csrfToken`). Production cookies use secure auto: trusted HTTPS gets SameSite=None/Secure, otherwise Lax. Development uses Lax. Unset TRUST_PROXY defaults to 1 in production and false elsewhere; .env.example explicitly sets false.

**Validation**: Zod schemas on route `body`/`response` via `fastify-type-provider-zod`. Schemas defined in `<module>.schema.ts`, reused in routes and services.

**Environment**: validated at startup via `src/config/env.ts` (Zod). All env access goes through the exported `env` object — never `process.env` directly. Required: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` (≥32 chars), `COOKIE_SECRET` (≥32 chars), `CORS_ORIGIN`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `RESEND_API_KEY`. Defaults: `APP_URL`, `EMAIL_FROM`, timeouts, `TRUST_PROXY=1` in production / false elsewhere when unset (true or a hop count can be explicit). Copy `apps/backend/.env.example`.

**Prisma Client**: generated to `src/generated/prisma/` (gitignored). Uses `@prisma/adapter-pg` (driver adapter). Always run `pnpm prisma:generate` after schema changes.

## Adding a new module

Use the scaffolding command — it generates routes, service, repository and schema:

```bash
pnpm gen:module <name>   # e.g. pnpm gen:module product  /  pnpm gen:module blog-post
```

The script (`scripts/create-module.ts`) creates `src/modules/<name>/` with all files pre-wired and handles pluralization automatically (`category` → `/categories`, `box` → `/boxes`). After running:

1. Add its user-owned Prisma model (`id`, `userId`, `createdAt`, `updatedAt`) and fill input/response schemas.
2. Run `pnpm prisma:migrate && pnpm prisma:generate`.
3. Register the routes in `src/app.ts`:
   ```ts
   import { <name>Routes } from '@/modules/<name>/<name>.routes.js';
   await app.register(<name>Routes, { prefix: '/api' });
   ```

## HLTB maintenance

Read `../../docs/backend-improvements.md` before continuing backend improvements.
HLTB uses `howlongtobeat-ts@1.3.1`, a total AbortSignal deadline and no automatic
retries. Provider `success: false` means FAILED, never MISS. The cache namespaces
are `hltb:v2:name:` and `igdb:v2:game:`; IGDB caches only IGDB data. Invalid HLTB
cache payloads are ignored. Concurrent lookups share a promise within the process.
Refresh is limited to 5/min per session user, at preHandler so the session exists.
On failed refresh update only hltbStatus, preserving stored times. FOUND lasts a
day, MISS an hour, and FAILED is not cached. Do not globally flush Redis to
invalidate old caches. Existing library snapshots need manual refresh; no batch
recovery has been implemented.

## Account and password-reset invariants

Verification checks hash, expiry and unverified state while consuming the token in
one write. Failed resend restores the previous token only if the failed token is
still current; it must not overwrite a newer resend. Password changes explicitly
increment sessionVersion in the service, persisted atomically with the hash.
Email delivery is injected into services; only the composition/routes load Resend.
A new reset code atomically invalidates old codes while locking the user. Both
check and verify increment the same attempts counter (maximum ten); commit locks
the same user before marking tokens and changing the password to avoid lock-order
inversion. Migration 20261013180000_add_reset_attempts is required.

## Production package imports

@detonado/shared exports compiled dist/index.js at runtime and src/index.ts for
TypeScript. Backend build/dev/test commands compile shared first. Never point
production exports back to src: Node does not resolve .js specifiers to .ts.
`pnpm check:runtime` checks shared and a compiled backend module with plain Node;
it runs at the end of build and in CI. Rebuild shared after editing its schemas
while the dev server is already running.

## Steam import

`STEAM_WEB_API_KEY` is optional and server-only. Missing or empty configuration
keeps startup working; authenticated status reports configured=false and provider
operations answer 503. Never log this key or put it in URLs; Steam accepts the
x-webapi-key header. APP_URL supplies the fixed OpenID return URL at /account.

Every Steam preview requires a SteamID verified through Steam OpenID in the
current Detonado session. Never accept an arbitrary profile/SteamID for provider
queries: a personal key can have visibility beyond public game details. State is
bound to the current session/user for ten minutes; the pinned Steam OP validates
signatures, signed fields, discovery, return URL, nonce freshness and one-time
consumption. Logout/disconnect clears the verified identity. OpenID does not
replace Detonado authentication.

Owned-games cache lasts five minutes and validates payloads. Missing game_count
means unavailable access, not an empty library; mismatched counts are upstream
errors and are not cached. IGDB matches external_game_source + Steam app uid,
discovering the Steam source ID rather than using deprecated category=1. Ambiguous
matches require explicit selection. Preview fetches no HLTB. Commit reuses the CSV
pipeline in batches of at most ten, skipping duplicates; Steam lifetime hours
become base hours only for new entries and must not overwrite existing campaigns.
