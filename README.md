# FormalLauncher

A Minecraft launcher with full Modrinth integration, multi-instance management, skin editing, and Microsoft account login. Built with Electron, React, and a sync server for cross-device instance management.

## Features

- **Multi-instance management** — Create, configure, and launch multiple Minecraft instances. Import from Prism Launcher.
- **Modrinth integration** — Search and install mods, resource packs, and modpacks with automatic dependency resolution.
- **Microsoft account login** — Authenticate via device code flow with automatic token refresh.
- **Skin editing** — Upload skins, toggle variants, and select capes.
- **Cross-device sync** — Bidirectional push/pull of instance metadata, mod lists, config files, and more via a sync server.
- **Fabric support** — Download and launch with Fabric loader.

## Architecture

```
Desktop (Electron) <── tRPC ──> Server (Hono) <── Drizzle ──> PostgreSQL
       |
       ├── Modrinth API (called from main process)
       ├── Microsoft Auth (via packages/minecraft)
       └── packages/minecraft (launch, auth utilities)
```

## Project Structure

```
apps/
  desktop/     Electron + Vite + React + Tailwind + Zustand
  server/      Bun + Hono + tRPC + Better Auth + Drizzle ORM
packages/
  shared/      Zod schemas and TypeScript types (no build step)
  minecraft/   Minecraft launching, Microsoft auth, and utilities
```

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Electron, Vite, React 19, Tailwind CSS v4, Zustand |
| UI components | ShadCN (new-york) |
| API | tRPC v11 (end-to-end type safety) |
| Data fetching | TanStack React Query |
| Server | Bun, Hono |
| Auth | Better Auth (app accounts), Microsoft OAuth (Minecraft) |
| Database | PostgreSQL, Drizzle ORM |
| Validation | Zod |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime
- PostgreSQL database

### Setup

1. Clone the repository and install dependencies:

   ```bash
   bun install
   ```

2. Configure environment variables in `apps/server/.env` (see `apps/server/.env.example`):

   ```
   DATABASE_URL=postgresql://...
   BETTER_AUTH_SECRET=your-secret
   BETTER_AUTH_URL=http://localhost:3000
   ```

3. Set up the database:

   ```bash
   cd apps/server
   bun run db:push
   ```

4. Start the development servers:

   ```bash
   bun run dev:server    # Start sync server on port 3000
   bun run dev:desktop   # Start Electron in dev mode
   ```

### Other Commands

```bash
bun run typecheck        # Typecheck all packages
bun run build:desktop    # Build desktop app

# Database (from apps/server/)
bun run db:generate      # Generate Drizzle migrations
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio
```

## Sync

Instance data syncs between desktop clients through the server. This includes instance metadata, mod lists (with enabled/disabled state and versions), modpack info, resource packs, config files, and icons.

Mod and resource pack binaries are **not** synced — they're downloaded directly from Modrinth by each client. Conflict resolution uses last-write-wins based on `updatedAt` timestamps.

Sync runs automatically on login, on startup, and after mutations (debounced), with a manual trigger available.

## License

All rights reserved.
