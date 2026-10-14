# AzHL — Azerbaijan Hockey League

A premium hockey league platform in the visual and experiential territory of NHL.com,
Formula1.com, Apple, Linear, and Vercel — dark, minimal, large type, cinematic motion, high
contrast, fast.

This is a multi-app Turborepo monorepo built for long-term scalability from day one. **Start
here:** [`.claude/CLAUDE.md`](.claude/CLAUDE.md) is the entry point to the full engineering
knowledge base (architecture, design system, roadmap, coding standards, and the 12-agent AI
engineering team in `.claude/agents/`). Read it before making architectural decisions.

## What's real vs. scaffold right now

Only `apps/web` (the public site) has real business logic. `apps/admin` and `apps/mobile-api`
are minimal, bootable scaffolds. See [`.claude/roadmap.md`](.claude/roadmap.md) for the full
phase plan — we're in **Phase 0 (foundation) / Phase 1 (League Hub)**.

## Prerequisites

- Node.js >= 20
- pnpm (`npm install -g pnpm`, or `corepack enable` if you have write access to your Node
  install directory)
- Docker Desktop (for local Postgres) — optional if you point `DATABASE_URL` at another
  Postgres instance

## Setup

```bash
pnpm install

# Start local Postgres
docker compose up -d

# Configure environment — Next.js and Prisma each auto-load .env from their OWN directory,
# not the monorepo root, so create both (see .env.example for the full list of keys):
cp .env.example packages/database/.env   # only needs DATABASE_URL
cp .env.example apps/web/.env
# edit both if your local Postgres differs from the docker-compose defaults

# Apply migrations and seed realistic Phase 1 data
pnpm db:migrate
pnpm db:seed

# Run the public site
pnpm --filter @azhl/web dev
# -> http://localhost:3000
```

## Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | Runs `dev` in every app (web on :3000, admin on :3001, mobile-api on :3002) |
| `pnpm build` | Builds every app/package via Turborepo |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Runs across the whole workspace |
| `pnpm format` / `pnpm format:check` | Prettier, workspace-wide |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio` | Prisma workflows for `packages/database` |
| `pnpm --filter @azhl/web dev` | Run a single app/package (Turborepo filter syntax) |

## Monorepo layout

```
apps/
  web/          public site — real, Phase 1
  admin/        future admin panel — scaffold only, see apps/admin/README.md
  mobile-api/   future mobile API — scaffold only, see apps/mobile-api/README.md
packages/
  database/     Prisma schema, client, seed
  types/        shared domain DTOs
  utils/        small, actually-used framework-agnostic helpers
  ui/           cross-app UI primitives (promote-on-2nd-consumer rule)
  config/       shared tsconfig / eslint / prettier
```

## Infrastructure status (prepare, don't provision)

Nothing external is connected yet — this is a deliberate, confirmed decision, not an
oversight:

- **Git**: local repository only. No GitHub remote exists. `.github/workflows/ci.yml` is
  ready but won't run until a remote is connected. See
  [`.claude/github-strategy.md`](.claude/github-strategy.md) for the branch strategy
  (`main`/`develop`/`feature/*`), Conventional Commits format, and the go-live checklist.
- **Vercel**: `apps/web/vercel.json` is ready; no project is connected, no deployment exists.
- **Cloudinary**: env vars are documented in `.env.example`; no account/keys are wired in —
  media handling is a swappable adapter for a later phase.

When you're ready to connect any of these, see
[`.claude/future-services.md`](.claude/future-services.md).

## Local commit hooks

`pnpm install` runs `husky` (via the `prepare` script), which enables a `commit-msg` hook that
enforces [Conventional Commits](.claude/github-strategy.md) via commitlint.
