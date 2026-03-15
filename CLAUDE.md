# FormalLauncher

A Minecraft launcher that integrates with Modrinth and syncs instance metadata (settings, mod lists) between sessions via a server. Syncs metadata only — not mod files themselves.

## Architecture

```
Desktop (Electron) <--tRPC--> Server (Hono) <--Drizzle--> PostgreSQL
       |
       +--> Modrinth API (called from Electron main process)
```

## Packages

- `apps/desktop` — Electron + Vite + React + ShadCN + Tailwind + Zustand. The launcher UI.
- `apps/server` — Bun + Hono + tRPC + Better Auth + Drizzle ORM. Handles sync, auth, instance storage.
- `packages/shared` — Zod schemas and TypeScript types shared between desktop and server. Exports raw `.ts` files (no build step).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | Electron |
| Desktop bundler | electron-vite (Vite) |
| Desktop UI | React 19, ShadCN (new-york), Tailwind CSS v4 |
| Client state | Zustand |
| API layer | tRPC v11 (end-to-end type safety) |
| Client data fetching | @trpc/react-query + TanStack React Query |
| Server runtime | Bun |
| Server framework | Hono |
| Auth | Better Auth (email/password, Drizzle adapter) |
| Database | PostgreSQL + Drizzle ORM |
| Schemas | Zod (in `packages/shared`) |

## Dev Commands

```bash
bun install              # Install all workspace dependencies
bun run dev:server       # Start server on port 3000
bun run dev:desktop      # Start Electron dev mode
bun run typecheck        # Typecheck all packages

# Server-specific
cd apps/server
bun run db:generate      # Generate Drizzle migrations
bun run db:migrate       # Run migrations
bun run db:push          # Push schema directly (dev)
bun run db:studio        # Open Drizzle Studio
```

## Database

- ORM: Drizzle with PostgreSQL dialect
- Schema: `apps/server/src/db/schema.ts`
- Migrations output: `apps/server/drizzle/`
- Config: `apps/server/drizzle.config.ts`

## Auth

- Better Auth with Drizzle adapter (`apps/server/src/lib/auth.ts`)
- Email/password only — no OAuth configured yet
- Auth routes mounted at `/api/auth/**`

## tRPC

- Server init + context: `apps/server/src/trpc/index.ts`
- Root router: `apps/server/src/trpc/router.ts` — exports `AppRouter` type
- Sub-routers: `apps/server/src/trpc/routers/`
- Desktop client: `apps/desktop/src/renderer/src/lib/trpc.ts` — imports `AppRouter` type from `@formallauncher/server/trpc`
- Mounted at `/trpc/*` on the Hono server

## Sync Model

- Metadata only: instance settings, mod lists, JVM args
- No file sync — mod files are downloaded from Modrinth directly by the desktop client
- Sync payload schema: `SyncPayloadSchema` in `packages/shared`

## Modrinth

- API calls happen from the Electron main process (not renderer)
- No server proxy — desktop talks to Modrinth directly

## Environment Variables

Set in `apps/server/.env` (see `.env.example`):

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Secret for Better Auth session signing
- `BETTER_AUTH_URL` — Base URL for auth callbacks (e.g., `http://localhost:3000`)

## Key Conventions

- Zod schemas live in `packages/shared/src/schemas/` — both desktop and server import from here
- Zustand for all client-side state (`apps/desktop/src/renderer/src/store/`)
- Shared package exports raw TypeScript — no build step, consumed directly by bundlers
- ShadCN components: `apps/desktop/src/renderer/src/components/ui/`
- `cn()` utility: `apps/desktop/src/renderer/src/lib/utils.ts`
