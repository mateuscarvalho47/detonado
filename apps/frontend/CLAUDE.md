# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Frontend of the Detonado monorepo. React 19 + Vite + TanStack Router/Query. See root `../../CLAUDE.md` for monorepo-wide setup. Run all commands from this directory (`apps/frontend`).

## Commands

```bash
pnpm dev            # Vite dev server → http://localhost:5173
pnpm build          # tsr generate → tsc -b → vite build (route tree regenerated first)
pnpm routes:gen     # regenerate src/routeTree.gen.ts (also runs in dev via plugin)
pnpm lint           # biome check .
pnpm lint:fix       # biome check --write .
pnpm test           # vitest run (once)
pnpm test:watch     # vitest watch
pnpm test:cov       # vitest run --coverage
```

Run a single test file: `pnpm vitest run src/lib/api.test.ts`. Filter by name: `pnpm vitest run -t "name"`.

## Backend dependency

Dev server proxies `/api` → `http://localhost:3000` (see `vite.config.ts`). Backend must run for auth/data. In prod, `VITE_API_URL` prefixes requests (`src/lib/api.ts`). Auth is a cookie session (`credentials: "include"`). POST, PATCH, and DELETE send `x-csrf-token`, cached in memory by `src/lib/api.ts` and cleared after login, logout, and account deletion. The logged-in home component is `AgoraScreen`.

## Architecture

Feature-sliced. Each `src/features/<name>/` owns its slice with a consistent shape:

- `service/` — thin functions calling the `api` client; return typed data. No React.
- `hooks/` — TanStack Query `useQuery`/`useMutation` wrappers + react-hook-form glue. UI talks to these, never to `service/` directly.
- `schema/` — Zod schemas + inferred form types, used with `@hookform/resolvers/zod`.
- `components/` — feature-specific screens/components.

Features: `auth`, `dashboard`, `detail`, `landing`, `library`, `search`, `stats`.

Shared layers:
- `src/components/ui/` — shadcn primitives (style `radix-vega`, `components.json`). Generated; don't hand-edit casually.
- `src/shared/` — cross-feature components (`Sidebar`, `BottomNav`, `StatusBadge`…), hooks, constants.
- `src/lib/` — `api.ts` (fetch wrapper + `ApiError`), `utils.ts`.
- `src/store/useAppStore.ts` — Zustand for UI state only (search modal, sidebar, library view/sort/filter). Persisted slice (`detonado-ui`, version 2) is `libraryView`, `librarySortField`, and `sidebarOpen`. Default view is `list`. There is no theme in the store: `__root.tsx` forces `data-theme="dark"`.
- `src/types/api.ts` — local API types. This app does not depend on `@detonado/shared`.

### Data flow

`api` client (`src/lib/api.ts`) throws `ApiError(code, message, details, status)` on non-2xx; returns `undefined` for 204. Services catch where a non-error outcome is expected (e.g. `fetchMe` maps 401 → `null`). Server state = TanStack Query; query keys are bare arrays like `["me"]`, `["library"]`. Mutations update the cache via `setQueryData` / `invalidateQueries` (see `useAuth.ts`); logout calls `qc.clear()`.

### Routing & auth gating

File-based via `@tanstack/router-plugin` (`autoCodeSplitting`). Routes in `src/routes/` map a file to a screen with `createFileRoute`. `routeTree.gen.ts` is generated — never edit it (excluded from Biome + coverage).

Auth gating is **centralized in `src/routes/__root.tsx`**, not per-route `beforeLoad`. `RootLayout` reads `useMe()`, and a `useEffect` redirects to `/` when there's no session and the path isn't in `PUBLIC_ROUTES`. `NO_SHELL_ROUTES` controls whether the sidebar/bottom-nav shell renders. When adding a public or chromeless page, update those arrays.

## Conventions

- **Biome** formats with **tabs** and (frontend default) **double quotes** — note this differs from the backend. Run `pnpm lint:fix` before committing.
- Path alias `@` → `src/`.
- Dark only. `__root.tsx` sets `data-theme="dark"` and `.dark` on `<html>`. Type is IBM Plex Sans / IBM Plex Mono. The logged-in home is the shelf (`Agora`: playing, queue, backlog hours), not a metrics dashboard.
- Tests colocated as `*.test.ts(x)`, jsdom env, globals on, `@testing-library/react` (`src/test/setup.ts`).
