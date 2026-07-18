# CLAUDE.md — AZHL Engineering Knowledge Base

This is the entry point to `.claude/`, the permanent engineering knowledge base for AZHL. Read
this file first in any session — human or AI — before touching code.

## What AZHL is

AZHL is a premium hockey league platform: a public web experience for standings, schedules,
game centers, and news, backed by a real Postgres/Prisma data layer, built as a multi-app
monorepo from day one (public site, future admin panel, future mobile API, shared packages) so
the architecture doesn't need a rewrite as the product grows. The visual and experiential bar is
NHL.com, Formula1.com, Apple, Linear, and Vercel — dark, minimal, large type, cinematic motion,
high contrast, fast — see [product-vision.md](./product-vision.md) for the full pillars.

## How the monorepo is organized

```
AZHL/
  apps/
    web/          # public site — real, fully built starting Phase 1
    admin/        # future admin panel — scaffold + README only until Phase 4
    mobile-api/   # future mobile API — scaffold + README only until Future phase
  packages/
    database/     # Prisma schema, client, seed — real, shared
    types/        # shared domain DTOs — real, shared
    utils/        # small framework-agnostic helpers — real, shared
    ui/           # scaffold — promoted to real once 2+ apps need a component
    config/       # shared tsconfig / eslint / prettier bases — real, shared
  .github/workflows/ci.yml   # ready, unused until a GitHub remote exists
  docker-compose.yml         # local Postgres, requires Docker Desktop to run
```

This is a summary. For the authoritative stack decisions, the services→RSC/API pattern, and why
each app boundary exists, see [architecture.md](./architecture.md) — do not re-derive
architecture from first principles when that file already answers the question.

## How to work in this repo

**Never invent architecture if documentation already exists.** Before designing a data model,
API shape, component pattern, or file layout, check whether `.claude/` already answers it. If it
does, follow it. If it's silent on your specific case, extend the existing pattern rather than
introducing a new one, and update the relevant doc so the next session doesn't have to
re-decide. Architecture questions that cross app/package boundaries belong to the Chief
Architect agent; scope questions ("is this in the current phase?") belong to the Product
Manager agent and [roadmap.md](./roadmap.md).

Every AI session working in this repo should treat
[MASTER_SYSTEM_PROMPT.md](./MASTER_SYSTEM_PROMPT.md) as governing context — it states the
non-negotiable operating rules and scopes this repo to AZHL exclusively.

## The 12 agents

`.claude/agents/` holds 12 specialized subagent definitions — the permanent AI engineering team
for this repo. Each owns a slice of the system and a subset of these docs. Route work to the
agent whose domain it falls in rather than solving everything generically; see
[ai-workflow.md](./ai-workflow.md) for full routing rules and collaboration flow. The roster:

| Agent | Primary ownership |
|---|---|
| Chief Architect | `architecture.md`, cross-cutting decisions, arbitration |
| Product Manager | `roadmap.md`, scope/phase gating, acceptance criteria |
| UI/UX Architect | `design-system.md`, accessibility, visual consistency |
| Frontend Engineer | `apps/web` (later `apps/admin`) pages/components |
| Backend Engineer | `lib/server/services/*`, `app/api/v1/*` |
| Database Engineer | `packages/database`, `database-guidelines.md` |
| Animation Engineer | `animation-guidelines.md`, motion implementation |
| Sports Data Engineer | hockey domain logic (standings, schedule, stats) |
| DevOps Engineer | CI, Docker Compose, Vercel/env strategy, releases |
| Security Engineer | auth, secrets, dependency risk, OWASP |
| QA Engineer | testing strategy, coverage, phase verification |
| AI Code Reviewer | pre-merge review against standards/architecture |

## Full document index

| Doc | Purpose |
|---|---|
| [MASTER_SYSTEM_PROMPT.md](./MASTER_SYSTEM_PROMPT.md) | Governing preamble for any AI session in this repo |
| [product-vision.md](./product-vision.md) | What AZHL is, who it's for, aesthetic pillars, full feature list by phase |
| [roadmap.md](./roadmap.md) | Authoritative phase list, prerequisites, agent involvement per phase |
| [engineering-principles.md](./engineering-principles.md) | Senior-engineering values grounded in concrete AZHL examples |
| [ai-workflow.md](./ai-workflow.md) | How the 12 agents collaborate, routing, arbitration |
| [github-strategy.md](./github-strategy.md) | Branch strategy, commit format, PR process, remote go-live plan |
| [future-services.md](./future-services.md) | Architectural detail for mobile-api, admin, ticketing, shop, streaming, Cloudinary/Vercel/GitHub go-live |
| [architecture.md](./architecture.md)* | Stack, monorepo layout, services→RSC/API pattern, app boundaries, conventions |
| [design-system.md](./design-system.md) | Palette, type scale, spacing, motion principles, glassmorphism rules |
| [component-library.md](./component-library.md) | `packages/ui` and `apps/web` component inventory and usage patterns |
| [coding-standards.md](./coding-standards.md) | TS conventions, naming, error handling, testing expectations |
| [api-guidelines.md](./api-guidelines.md) | REST conventions for `app/api/v1/*`, versioning, response/error shape |
| [database-guidelines.md](./database-guidelines.md) | Prisma modeling conventions, migration workflow, seeding policy |
| [erd.md](./erd.md) | Entity-relationship diagram and schema documentation for `packages/database` |
| [animation-guidelines.md](./animation-guidelines.md) | Motion tokens, `prefers-reduced-motion`, performance budget |

All documents above are complete as of the Phase 0/1 foundation pass. If you spot a doc that
contradicts the actual code (e.g. a token name, file path, or API shape that changed since),
code wins — fix the doc rather than the working implementation, and flag it to the Chief
Architect agent if the drift looks intentional rather than a stale doc.
