# Detonado — frontend

Biblioteca pessoal de jogos. React 19, Vite, TanStack Router e TanStack Query. A home logada é a prateleira Agora. A interface fica no tema escuro.

## Desenvolvimento

Na raiz do monorepo:

```bash
pnpm --filter frontend dev
```

O Vite sobe em http://localhost:5173 e encaminha `/api` para http://localhost:3000. O backend precisa estar no ar.

Em produção, `VITE_API_URL` prefixa as chamadas (`src/lib/api.ts`). A sessão vai no cookie. Cada POST, PATCH e DELETE envia o header `x-csrf-token`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` | gera as rotas, checa os tipos e faz o build |
| `pnpm preview` | serve o build |
| `pnpm test` | Vitest |
| `pnpm lint` | Biome |
