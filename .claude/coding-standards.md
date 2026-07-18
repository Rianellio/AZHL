# Coding Standards

TypeScript, naming, error handling, and testing conventions that apply across every app and
package in AZHL. Owned by the **Chief Architect** agent, enforced in review by the **AI Code
Reviewer** agent. See [architecture.md](./architecture.md) for the services→RSC/API pattern this
doc assumes, [api-guidelines.md](./api-guidelines.md) for the REST error shape referenced below,
and [github-strategy.md](./github-strategy.md) for commit message format and branch conventions
(not duplicated here).

## TypeScript conventions

- **Strict mode everywhere.** Every `tsconfig.json` extends the shared base in
  `packages/config`, which has `strict: true` and every strict-family flag on
  (`noUncheckedIndexedAccess`, `noImplicitOverride`, etc.). No app or package weakens this
  locally.
- **No `any`.** Not even as a stopgap — use `unknown` and narrow, or model the actual type. If a
  third-party type is genuinely unknown, isolate the `unknown` at the boundary (e.g. the one line
  that parses a webhook payload) and convert to a real type immediately, don't let `any`/`unknown`
  leak past that line.
- **Prefer types over interfaces for data shapes** (DTOs, props, unions); use `interface` only
  for things meant to be extended/implemented (rare in this codebase — mostly relevant to
  `packages/ui` component prop contracts). Consistency matters more than the specific rule; don't
  mix both styles for the same kind of shape within one file.
- **Discriminated unions for state, not booleans.** A `Game`'s status is the `GameStatus` enum
  (`SCHEDULED | LIVE | FINAL | POSTPONED`) from `packages/database`'s Prisma schema, re-exported
  through `packages/types`; components and services switch on it exhaustively (a `default` case
  that throws, or a TypeScript exhaustiveness check) rather than chaining `if (isLive) ... else
  if (isFinal) ...` booleans.
- **No non-null assertions (`!`) as a substitute for real narrowing**, except in test fixtures or
  where a Prisma unique-key upsert guarantees a value the type system can't see (rare, and should
  carry a one-line comment explaining why it's safe).

## Naming

- **Files:** kebab-case for non-component files (`standings.service.ts`, `format-date.ts`);
  `PascalCase.tsx` for component files (`StandingsTable.tsx`), matching the exported component
  name.
- **Folders:** kebab-case, matching the directory conventions in
  [architecture.md](./architecture.md#monorepo-layout) (`lib/server/services`,
  `components/league`, etc.). Don't introduce a new top-level folder without checking whether an
  existing one already fits.
- **Variables/functions:** camelCase. **Types/interfaces/components/enums:** PascalCase.
  **Constants that are truly fixed** (config values, not just `const`-declared locals):
  SCREAMING_SNAKE_CASE (`CURRENT_SEASON_ID`).
- **Service functions** are named `verbNoun` (`getStandingsBySeason`, `createNewsArticle`), not
  generic CRUD verbs alone (`get`, `list`) — the name should read correctly at the call site with
  no surrounding context.
- **DTO types** in `packages/types` are named `<Entity>DTO` (`StandingDTO`, `GameDTO`), so it's
  visually obvious at an import site whether something is the wire/render shape or a Prisma model.

## Error handling boundaries

Three layers, three responsibilities — errors should be handled once, at the right layer, not
re-caught and re-thrown repeatedly:

1. **Services** (`lib/server/services/*`) throw typed errors for anything the caller needs to
   distinguish (`NotFoundError`, `ValidationError`) and let genuinely unexpected errors (a DB
   connection failure) propagate unchanged. Services never catch-and-swallow — a caller that
   can't tell "not found" from "silently returned nothing" can't render or respond correctly.
2. **Route handlers** (`app/api/v1/*`) catch errors from the service call and map them to the
   REST error shape defined in [api-guidelines.md](./api-guidelines.md) (`{ error: { code,
   message, details } }`) with the matching HTTP status. This is the *only* place a typed service
   error gets translated into an HTTP status — that mapping doesn't belong in the service (which
   has no concept of HTTP) or the component (which has no concept of status codes).
3. **Server Components** rely on Next.js's file-based error boundaries (`error.tsx`,
   `not-found.tsx`) rather than local `try`/`catch` scattered through page bodies. A service
   throwing `NotFoundError` for a missing game/article should be allowed to propagate up to
   `notFound()` (or a thin `try`/`catch` in the page that calls `notFound()`), not be caught and
   rendered as ad hoc inline error UI per page.

## Services are the source of truth

Restated because it's the most-violated rule under time pressure: **no component, page, or route
handler queries Prisma directly.** `lib/server/services/*` is the only code allowed to import
`@azhl/database`. If a page needs data that isn't served by an existing service function, add the
function to the relevant service — don't inline a `db.team.findMany(...)` in a page component "just
this once." See [architecture.md](./architecture.md#the-services--rsc--api-pattern) for the full
rationale (one implementation, two consumers: RSC pages and `app/api/v1/*` route handlers).

## Testing expectations

- **Services are the priority for unit tests** (Vitest) — they hold 100% of the business logic,
  so they're where a bug actually matters and where tests are cheapest to write (plain functions,
  no rendering). Standings computation and schedule/game state logic in particular are held to a
  high bar given how easy sports domain logic is to get subtly wrong (see the Sports Data
  Engineer agent).
- **Components get Testing Library (RTL) coverage** for behavior that isn't purely visual:
  keyboard interaction, ARIA state changes, conditional rendering branches (e.g. `ArticleCard`
  with/without a cover image). Pure presentational rendering isn't snapshot-tested by default —
  snapshot tests of markup tend to rot without catching real regressions.
- **End-to-end (Playwright)** coverage is a QA Engineer-owned, phase-gated addition — see
  [roadmap.md](./roadmap.md); not required for every PR in Phase 0/1, but the critical path (home
  → standings → schedule → a game → news → an article) should have E2E coverage before Phase 1 is
  considered done.
- Tests live next to the code they cover (`standings.service.test.ts` beside
  `standings.service.ts`), not in a parallel `__tests__` tree, so a moved/renamed source file's
  test is impossible to miss.

## Comment policy

Comments explain **why**, never **what** — the code already says what it does; a comment
restating it (`// increment i by 1`) is noise and gets removed in review. Reserve comments for:
non-obvious business rules (why `otLosses` counts toward `points` but not `wins`), why a
seemingly-simpler approach was rejected, and `TODO`s that reference a roadmap phase (`// TODO:
Phase 2 — extend with full player profile fields`) rather than a vague someday. Exported service
functions may carry a one-line JSDoc summary when the name alone doesn't convey intent, but this
is the exception, not a mandated header on every function.
