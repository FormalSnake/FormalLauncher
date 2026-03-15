# FormalLauncher

A Minecraft launcher with full Modrinth support (mods, resource packs, modpacks), multi-instance management, skin editing, and Microsoft account login. Syncs instance metadata and modpack URLs between sessions via a server. Includes a custom Minecraft library package for launching and authentication.

## Architecture

```
Desktop (Electron) <--tRPC--> Server (Hono) <--Drizzle--> PostgreSQL
       |
       +--> Modrinth API (called from Electron main process)
       +--> Microsoft Auth (via packages/minecraft)
       +--> packages/minecraft (launch, auth utilities)
```

## Packages

- `apps/desktop` — Electron + Vite + React + ShadCN + Tailwind + Zustand. The launcher UI.
- `apps/server` — Bun + Hono + tRPC + Better Auth + Drizzle ORM. Handles sync, auth, instance storage.
- `packages/shared` — Zod schemas and TypeScript types shared between desktop and server. Exports raw `.ts` files (no build step).
- `packages/minecraft` — Custom library for Minecraft launching, Microsoft authentication, and related utilities.

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
| App auth | Better Auth (email/password, Drizzle adapter) |
| Minecraft auth | Microsoft account login (via `packages/minecraft`) |
| Minecraft library | `packages/minecraft` (launching, auth, utilities) |
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

- **App account (sync):** Better Auth with Drizzle adapter (`apps/server/src/lib/auth.ts`). Email/password. Routes at `/api/auth/**`.
- **Minecraft account:** Microsoft account login handled by `packages/minecraft`. Used for launching Minecraft and skin access.

## tRPC

- Server init + context: `apps/server/src/trpc/index.ts`
- Root router: `apps/server/src/trpc/router.ts` — exports `AppRouter` type
- Sub-routers: `apps/server/src/trpc/routers/`
- Desktop client: `apps/desktop/src/renderer/src/lib/trpc.ts` — imports `AppRouter` type from `@formallauncher/server/trpc`
- Mounted at `/trpc/*` on the Hono server

## Sync Model

- Metadata + modpack URLs: instance settings, mod lists, JVM args, modpack source URLs
- No file sync — mod and resource pack files are downloaded from Modrinth directly by the desktop client
- Sync payload schema: `SyncPayloadSchema` in `packages/shared`

## Modrinth

- API calls happen from the Electron main process (not renderer)
- No server proxy — desktop talks to Modrinth directly
- Features: mod search/install, resource pack search/install, modpack support, multi-instance management
- Example Modrinth API usage is implemented for display only (not yet wired to real functionality)

## Features

- Multi-instance management (create, configure, launch separate Minecraft instances)
- Modpack instances from Modrinth modpack URLs
- Mod search and installation from Modrinth
- Resource pack search and installation from Modrinth
- Skin editing
- Microsoft account login for Minecraft
- Custom Minecraft launch library (`packages/minecraft`)

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
