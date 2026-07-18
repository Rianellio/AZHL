# @azhl/types

Shared TypeScript domain types (DTOs), independent of Prisma's generated types. This is the
contract `apps/web` (and later `apps/admin`, `apps/mobile-api`) build against — it decouples
the public API/UI shape from the database schema in `packages/database`, so the schema can
evolve without breaking every consumer in lockstep.

Only Phase 1 entities are defined today: League, Season, Team, Player (minimal), Game,
Standing, NewsArticle, plus the shared API envelope. See
[`.claude/erd.md`](../../.claude/erd.md) for the full future data model.
