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
- Tables: `instances` (instance metadata, mods, resource packs) and `instanceConfigs` (config file storage with SHA-256 hashes)

## Auth

- **App account (sync):** Better Auth with Drizzle adapter (`apps/server/src/lib/auth.ts`). Email/password. Routes at `/api/auth/**`.
- **Minecraft account:** Microsoft account login handled by `packages/minecraft`. Used for launching Minecraft and skin access.

## tRPC

- Server init + context: `apps/server/src/trpc/index.ts`
- Root router: `apps/server/src/trpc/router.ts` — exports `AppRouter` type
- Sub-routers: `apps/server/src/trpc/routers/`
- Desktop client: `apps/desktop/src/renderer/src/lib/trpc.ts` — imports `AppRouter` type from `@formallauncher/server/trpc`
- Mounted at `/trpc/*` on the Hono server
- Instance procedures: `list`, `get`, `upsert`, `delete`, `push` (sync upload), `pull` (sync download)

## Sync Model

- Syncs: instance metadata, mod lists (with enabled/disabled + versions), modpack version info, resource packs, config files, icons
- No binary file sync — mod and resource pack JARs are downloaded from Modrinth directly by the desktop client
- Conflict resolution: last-write-wins based on `updatedAt` timestamps
- Push/pull sync via `instance.push` and `instance.pull` tRPC procedures
- Config file storage: individual files max 256KB, total per instance max 5MB, allowed extensions: `.json`, `.toml`, `.cfg`, `.properties`, `.yaml`, `.yml`, `.txt`, `.conf`, `.ini`
- Sync triggers: on login, on app startup (if logged in), debounced after mutations (10s), manual sync button
- Schemas: `SyncPushInputSchema`, `SyncPullResponseSchema`, `InstanceSyncDataSchema` in `packages/shared`

## Modrinth

- API calls happen from the Electron main process (not renderer)
- No server proxy — desktop talks to Modrinth directly
- Fully integrated: search, project details, version filtering, hash lookup, mod/resource pack/modpack install with dependency resolution

## Features

**Fully implemented:**
- Multi-instance management (create, configure, launch, import from Prism Launcher)
- Modpack instances from Modrinth (download, extract, install with dependency resolution)
- Mod search and installation from Modrinth (search, version filtering, auto-dependency install)
- Resource pack search and installation from Modrinth
- Skin editing (upload, variant toggle, cape selection)
- Microsoft account login for Minecraft (device code flow, token refresh)
- Custom Minecraft launch library (version download, Java resolution, Fabric support, native extraction)
- Modrinth API integration (search, project details, versions, hash lookup — called directly from desktop)
- Server sync (bidirectional push/pull of instance metadata, mod lists, config files, modpack versions, resource packs, icons; last-write-wins conflict resolution; sync on login/startup/mutations + manual trigger)

## Environment Variables

Set in `apps/server/.env` (see `.env.example`):

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Secret for Better Auth session signing
- `BETTER_AUTH_URL` — Base URL for auth callbacks (e.g., `http://localhost:3000`)

## Release Process

To publish a new release:
1. Update `version` in `apps/desktop/package.json`
2. Commit the change
3. Create and push a version tag:
   ```bash
   git tag v<version>
   git push origin v<version>
   ```
4. GitHub Actions builds Windows (x64), macOS (x64 + arm64), and Linux (x64) automatically and publishes to GitHub Releases.

The `GH_TOKEN` (GITHUB_TOKEN) secret is provided automatically by GitHub Actions — no manual secret setup needed.

## Key Conventions

- Zod schemas live in `packages/shared/src/schemas/` — both desktop and server import from here
- Zustand for all client-side state (`apps/desktop/src/renderer/src/store/`)
- Shared package exports raw TypeScript — no build step, consumed directly by bundlers
- ShadCN components: `apps/desktop/src/renderer/src/components/ui/`
- `cn()` utility: `apps/desktop/src/renderer/src/lib/utils.ts`
