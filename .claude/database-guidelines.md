# Database Guidelines

Prisma modeling conventions, migration workflow, and seeding policy for `packages/database`.
Owned by the **Database Engineer** agent. See [erd.md](./erd.md) for the full entity-relationship
documentation (Phase 1 implemented + future entities) and
[architecture.md](./architecture.md#the-services--rsc--api-pattern) for why `packages/database`'s
client is only ever imported from `lib/server/services/*`.

## Modeling conventions

The schema at `packages/database/prisma/schema.prisma` is the source of truth these conventions
describe — read it directly for exact current fields; this doc documents the *pattern*, not a
copy of the schema that can drift out of sync.

- **Models are PascalCase, singular** (`League`, `Season`, `Team`, `Player`, `Game`, `Standing`,
  `NewsArticle`) — matches Prisma convention and how the generated client types read in
  TypeScript (`prisma.game.findMany`, type `Game`).
- **Fields are camelCase** (`startTime`, `homeTeamId`, `colorPrimary`), matching
  [coding-standards.md](./coding-standards.md#naming)'s TypeScript naming rules — the schema and
  the application code should never need a mental translation step between them.
- **Every model maps to a plural snake_case table** via `@@map` (`@@map("leagues")`,
  `@@map("news_articles")`) — Postgres tables read in standard SQL-land casing regardless of what
  the Prisma/TS layer looks like, and stay consistent for anyone querying the database directly
  (migrations review, ad hoc debugging, future BI tooling).
- **Relation fields are explicit, not implicit.** Every relation declares both sides
  (`Team.players: Player[]` and `Player.team: Team` + `Player.teamId: String`) so the generated
  client and the schema itself are self-documenting about cardinality — never rely on Prisma's
  implicit many-to-many shorthand for a relation that has (or will plausibly get) attributes of
  its own.
- **IDs are `cuid()`**, not auto-increment integers — collision-resistant, sortable-enough,
  and safe to generate client-side later if a future write path needs it (e.g. optimistic UI in
  `apps/admin`).
- **Enums for closed, small state sets** (`GameStatus`, `PlayerPosition`) rather than free-text
  columns with app-level validation — the database itself rejects an invalid status, one less
  thing a service has to guard against.
- **`createdAt`/`updatedAt` on every mutable model** (`@default(now())` / `@updatedAt`) except
  `Standing`, which is fully derived and only needs `updatedAt` (see below) — there's no
  meaningful "created" moment for a row that's recomputed wholesale each time.
- **Doc comments (`///`) on non-obvious models**, e.g. `Standing`'s "derived/materialized... not
  hand-edited" comment and `Player`'s "minimal Phase 1 shape" note — these travel with the schema
  file itself so they survive even outside `.claude/`.

## Migration workflow

- **`pnpm --filter database exec prisma migrate dev --name <description>`** for every schema
  change during local development — this generates a real SQL migration file under
  `packages/database/prisma/migrations/` and applies it to your local database in one step.
- **Never hand-edit a generated migration file.** If a migration came out wrong (wrong column
  type, missing index), the fix is to change `schema.prisma` and run `migrate dev` again to
  generate a *new* migration that corrects it — not to edit SQL that's already been generated
  and (potentially) applied elsewhere. Hand-edited migrations are the single most common cause of
  a dev/prod schema drift bug.
- **`prisma migrate deploy`** is the non-interactive, no-schema-diffing command used in CI/
  production — it only applies migrations that already exist on disk, never generates new ones.
  This is what `.github/workflows/ci.yml` and any future deploy pipeline run.
- Every schema change is one migration, one commit, following
  [github-strategy.md](./github-strategy.md)'s commit conventions — don't bundle an unrelated
  schema change into a feature commit.

## Seeding policy

`packages/database/prisma/seed.ts` is **idempotent** — safe to run repeatedly against the same
database without creating duplicates or erroring. This is achieved entirely through
`upsert` keyed on each model's natural unique constraint (`League.slug`, `Team.abbreviation`,
`Player`'s composite `teamId_jerseyNumber`, `NewsArticle.slug`, `Standing`'s composite
`seasonId_teamId`), never `create`-only logic guarded by a manual "does this exist" check. New
seed data added later follows the same pattern: pick the model's real unique constraint, `upsert`
on it. The one exception is `Game`, seeded with plain `create` — games don't have a natural unique
key in Phase 1 (a rematch on the same day is legitimate schedule data), so the seed script is only
safe to run once per empty database today; if re-run idempotency for `Game` becomes necessary
later (e.g. a `pnpm db:reset` workflow that reseeds without dropping the DB first), add a
synthetic unique key (`seasonId + homeTeamId + awayTeamId + startTime`) rather than leaving it
`create`-only.

## Indexing guidance

Every index in the schema exists to serve a real, known query pattern from
`lib/server/services/*` — not speculative "might need it later" indexing:

- **`Season(leagueId, isCurrent)`** — services resolve "the current season for this league" on
  nearly every page; this is a covering index for that lookup.
- **`Game(seasonId, startTime)`** — the schedule service's primary query shape: all games in a
  season, ordered/filtered by date range. Compound so a season filter plus a date range both hit
  the index.
- **`Game(homeTeamId)` / `Game(awayTeamId)`** — future team-schedule lookups ("all games for this
  team") in Phase 2, added now since the columns already exist and the cost of the index is
  negligible against Phase 1's write volume.
- **`Player(teamId)`** — roster lookups by team.
- **`Standing(seasonId, rank)`** — the standings service's exact query shape: all standings for a
  season, pre-sorted by rank.
- **`NewsArticle(publishedAt)`** — the news list service's default ordering (most recent first)
  and future date-range filtering.

When adding a new query pattern, check whether an existing index already covers it (a compound
index covers queries on its leading column(s) alone) before adding a new one — extra indexes cost
write performance and storage for no benefit if they're redundant with what's already there.

## Soft vs. hard delete

Phase 1 uses **hard deletes with cascading relations** (`onDelete: Cascade` from `League` →
`Season` → `Game`/`Standing`, and `Team` → `Player`) because nothing in Phase 1 is
user-generated content that needs an audit trail or an "undo" — league/season/team/player data is
admin-seeded/managed, and deleting a team should genuinely remove its dependent rows rather than
leave orphaned games pointing at a soft-deleted team.

This will need revisiting starting **Phase 4 (Accounts)**, once `User`-authored content and
moderation exist (see [erd.md](./erd.md#future--not-yet-migrated) for `User`/`Role`) — at that
point, soft deletes (a `deletedAt` column + query-level filtering) become the right default for
anything a user creates or that needs to support moderation/recovery. Do not add soft-delete
columns to Phase 1 models pre-emptively; it's dead complexity until there's a real user-generated-
content model to apply it to.

## See also

[erd.md](./erd.md) is the full entity-relationship reference — every Phase 1 field, every future
entity, and the relationships between them, including the ones (`PlayoffSeries`, `Award`,
`MediaAsset`, etc.) this schema will grow into.
