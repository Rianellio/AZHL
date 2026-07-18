# Architecture

Stack, monorepo layout, and the core patterns every app/package in AZHL follows. See
[roadmap.md](./roadmap.md) for phasing, [coding-standards.md](./coding-standards.md) for code
conventions, and [api-guidelines.md](./api-guidelines.md) for the REST contract this doc
introduces.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | RSC-first; client components are the exception, not the default |
| Database | PostgreSQL + Prisma | Schema lives in `packages/database`, see [database-guidelines.md](./database-guidelines.md) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) | Themed per [design-system.md](./design-system.md) |
| Animation | `motion` (Framer Motion successor) | Tokens and rules in [animation-guidelines.md](./animation-guidelines.md) |
| Fonts | Self-hosted variable fonts via `next/font` | No external font requests, zero layout shift |
| Auth | Auth.js | Scaffolded now, wired to real dashboards in Phase 4 |
| Package management | pnpm workspaces + Turborepo | Enabled via Corepack, no global install required |
| Rendering strategy | ISR (time-based + on-demand `revalidateTag`) | Not experimental PPR — see [Revalidation strategy](#revalidation-strategy) |

## Monorepo layout

```
AZHL/
  .claude/                      # engineering knowledge base (this doc lives here)
  apps/
    web/                        # public site — the only app with real business logic in Phase 1
      src/
        app/
          (site)/                # route groups for home, standings, schedule, game center, news
          api/
            v1/
              standings/route.ts
              schedule/route.ts
              news/route.ts
        components/
          ui/                    # shadcn primitives, themed (see component-library.md)
          layout/                # Shell, Nav, Footer
          league/                # StandingsTable, ScheduleList, ScoreCard, StatTile, ArticleCard
        lib/
          server/
            services/            # ALL business logic — single source of truth, see below
              standings.service.ts
              schedule.service.ts
              news.service.ts
          client/                # client-only helpers (hooks, formatters that need `use client`)
    admin/                       # future admin panel — scaffold + README only in Phase 1
    mobile-api/                  # future standalone mobile API — scaffold + README only
  packages/
    database/                    # Prisma schema, generated client, seed script — real, shared
    ui/                          # scaffold; promote a component here only once 2+ apps consume it
    config/                      # shared tsconfig base, eslint config, prettier config
    types/                       # shared domain DTOs (League, Team, Game, ...) consumed by all apps
    utils/                       # small framework-agnostic helpers actually used by apps/web
  .github/workflows/ci.yml
  docker-compose.yml             # local Postgres
  turbo.json
  pnpm-workspace.yaml
```

Each app is an independent Next.js (or, for `mobile-api`, a future standalone) deployable.
Packages are pure libraries: no app is allowed to import another app's internals, only
`packages/*`.

## The services → RSC / API pattern

This is the single most important architectural rule in the repo: **`lib/server/services/*`
holds all business logic and is the only thing allowed to talk to Prisma.** Everything else —
Server Components and route handlers alike — calls into services and does no data-fetching or
business logic of its own.

Two consumers, one implementation:

1. **React Server Components** call service functions **directly**, in-process. No HTTP
   self-fetch, no `fetch('/api/v1/...')` from the server. This is the whole point of RSC: the
   render pass and the data access happen in the same server context, so calling a service
   function is just a function call, not a network round trip.
2. **Route handlers** under `app/api/v1/*` call the *same* service functions and adapt the
   result into the REST response shape defined in [api-guidelines.md](./api-guidelines.md).
   This is the versioned contract that `apps/mobile-api` and, later, `apps/admin` will consume
   once they're real.

A service function is framework-agnostic: it takes plain arguments, returns plain data (DTOs
from `packages/types`), and throws typed errors. It never imports `next/navigation`,
`NextRequest`, or anything from `app/`.

```ts
// apps/web/src/lib/server/services/standings.service.ts
import { db } from "@azhl/database";
import type { StandingDTO } from "@azhl/types";

export async function getStandingsBySeason(seasonId: string): Promise<StandingDTO[]> {
  const rows = await db.standing.findMany({
    where: { seasonId },
    include: { team: true },
    orderBy: [{ points: "desc" }, { wins: "desc" }],
  });

  return rows.map(toStandingDTO);
}
```

Called directly from a Server Component (no fetch, no waterfall):

```ts
// apps/web/src/app/(site)/standings/page.tsx
import { getStandingsBySeason } from "@/lib/server/services/standings.service";

export default async function StandingsPage() {
  const standings = await getStandingsBySeason(CURRENT_SEASON_ID);
  return <StandingsTable standings={standings} />;
}
```

Called from the versioned route handler that backs the public REST contract:

```ts
// apps/web/src/app/api/v1/standings/route.ts
import { NextResponse } from "next/server";
import { getStandingsBySeason } from "@/lib/server/services/standings.service";

export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get("seasonId") ?? CURRENT_SEASON_ID;
  const standings = await getStandingsBySeason(seasonId);
  return NextResponse.json({ data: standings });
}
```

If business logic (filtering, sorting, derived fields, validation) ever appears inside a page
component or a route handler, that's a bug — it belongs in the service. Route handlers are thin
adapters; pages are thin renderers.

## Why `apps/admin` and `apps/mobile-api` are separate apps, not folders

It would be simpler short-term to add `/admin` routes and an `/api/mobile` namespace inside
`apps/web`. AZHL deliberately does not do this, for three reasons:

- **Blast radius.** A bug, a bad deploy, or a dependency upgrade in the admin panel should never
  be able to take down or slow down the public site (or vice versa). Separate apps means
  separate build artifacts and separate failure domains.
- **Deploy independence.** The public site needs to ship fast and often (news, scores). The
  admin panel and mobile API will have entirely different release cadences, review
  requirements, and eventually different auth/security postures (see the Security Engineer
  agent). Coupling their deploys to `apps/web`'s would force them onto the same schedule.
  Multi-app Vercel/CI setups let each app be built, tested, and deployed independently via
  Turborepo's dependency graph.
- **Different runtime shape.** `apps/admin` is another Next.js app with its own auth-gated
  dashboards. `apps/mobile-api` is not a website at all — it's intended to become a
  headless API-only service. Bundling either into `apps/web`'s Next.js app would mean shipping
  admin-only or mobile-only code paths (and their dependencies) to the public site's bundle.

Both scaffold apps exist today only as bootable placeholders with READMEs stating their
intended interface and "not yet implemented — see roadmap.md." They do not get real logic until
their respective phases.

## Naming and import conventions

- Workspace packages are published under the `@azhl/` scope: `@azhl/database`, `@azhl/types`,
  `@azhl/utils`, `@azhl/ui`, `@azhl/config`.
- Apps import from packages, never the reverse. Packages never import from `apps/*`.
- Apps do not import each other's source. If two apps need the same logic, it belongs in a
  package (`packages/types` for shapes, `packages/utils` for pure helpers) or, for
  business/data logic, stays app-specific until it's genuinely shared (see the promotion rule
  in [component-library.md](./component-library.md), which applies to logic packages too — do
  not pre-emptively extract).
- Within `apps/web`, `@/*` is a path alias for `apps/web/src/*`. Cross-package imports always
  use the `@azhl/*` scope, never relative paths that reach outside the package.
- Service modules are named `<domain>.service.ts` and live only under `lib/server/services/`.
  Anything under `lib/server/` is guaranteed server-only (enforced with the `server-only`
  package) and can safely hold secrets, direct DB access, etc.

## Revalidation strategy

AZHL uses Incremental Static Regeneration, not experimental Partial Prerendering. Two
mechanisms, used for different kinds of change:

- **Time-based revalidation** (`export const revalidate = <seconds>` or `fetch`'s `next.revalidate`)
  for content that changes on a predictable cadence and where a short staleness window is
  acceptable: news list/detail pages (e.g. 5 minutes), standings on non-game days.
- **On-demand `revalidateTag`** for content that changes at a known moment and should update
  immediately: a service function that writes a game's final score or standing update calls
  `revalidateTag("standings")` / `revalidateTag("schedule")` right after the write, so the next
  request gets fresh data without waiting for the time-based window. Tags are assigned per
  domain (`"standings"`, `"schedule:<seasonId>"`, `"news"`, `"game:<gameId>"`) so an update to
  one game doesn't invalidate unrelated cached pages.

Rule of thumb: if a service mutates data that a page depends on, that service is responsible for
calling `revalidateTag` with the relevant tag(s) as part of the same operation — callers (route
handlers, future admin actions) should not have to remember to invalidate the cache themselves.
