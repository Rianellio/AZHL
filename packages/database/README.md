# @azhl/database

Prisma schema, generated client, and seed script — the single source of truth for AZHL's
persisted data. Only `apps/web`'s `lib/server/services/*` should import from this package;
no other app or component queries Prisma directly. See
[`.claude/database-guidelines.md`](../../.claude/database-guidelines.md) and
[`.claude/erd.md`](../../.claude/erd.md).

## Local setup

1. `docker compose up -d` from the repo root (starts local Postgres — see root
   `docker-compose.yml`), or point `DATABASE_URL` at any Postgres instance.
2. Copy `.env.example` to `.env` at the repo root and set `DATABASE_URL`.
3. `pnpm db:migrate` — applies migrations.
4. `pnpm db:seed` — populates realistic Phase 1 mock data (1 league, 1 season, 6 teams, a
   full round-robin schedule, computed standings, 3 news articles).

Only the Phase 1 entity subset is modeled today: `League`, `Season`, `Team`, `Player`
(minimal), `Game`, `Standing`, `NewsArticle`. Everything else in the product vision is
documented in `.claude/erd.md` but not yet migrated.
