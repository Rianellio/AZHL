# Roadmap

The authoritative phase list for AZHL. Scope questions ("is this in the current phase?") are
gated against this document, owned by the **Product Manager** agent. Do not build ahead of the
current phase; see [engineering-principles.md](./engineering-principles.md) on why speculative
features are avoided, and [product-vision.md](./product-vision.md) for the full feature
narrative these phases implement.

Status legend: **IN PROGRESS** (current pass) · PLANNED · FUTURE.

---

## Phase 0 — Foundation **(IN PROGRESS)**

**Ships:** pnpm + Turborepo monorepo scaffold; `packages/config`, `packages/types`,
`packages/utils` (real); `packages/database` with the Phase 1 Prisma schema and seed script;
`packages/ui` scaffold with one example primitive; `apps/admin` and `apps/mobile-api` as
bootable scaffolds with README only; `.github/workflows/ci.yml`; `docker-compose.yml`; Husky +
commitlint for Conventional Commits; root `README.md`; the full `.claude/` knowledge base and
all 12 agent definitions; local git init (no remote).

**Prerequisites:** none — this is the starting point.

**Primary agents:** Chief Architect (monorepo/package boundaries), DevOps Engineer (CI, Docker,
tooling), Database Engineer (schema/seed), Product Manager (roadmap + phase docs).

---

## Phase 1 — League Hub **(IN PROGRESS)**

**Ships:** `apps/web` fully implemented — design system applied (Tailwind theme, restyled
shadcn components, `Shell`/`Nav`/`Footer`), Home, Standings, Schedule, Game Center (box score),
News list + detail, and `app/api/v1/{standings,schedule,news}` route handlers backed by
`lib/server/services/*`.

**Prerequisites:** Phase 0 complete (`packages/database`, `packages/types`, `packages/utils`,
`packages/config`, and the shared UI primitive all in place).

**Primary agents:** Frontend Engineer (pages/components), Backend Engineer (services + API
routes), UI/UX Architect (design system application), Sports Data Engineer (standings/schedule
correctness), Animation Engineer (motion), QA Engineer (verification pass).

---

## Phase 2 — Teams & Players

**Ships:** Team pages, rosters, player profiles.

**Prerequisites:** Phase 1's data layer (`Team`, `Player`) extended with fuller roster/profile
fields; Phase 1's page/routing conventions established and reused.

**Primary agents:** Frontend Engineer, Database Engineer (schema extension), Sports Data
Engineer (roster/position domain rules), UI/UX Architect.

---

## Phase 3 — Stats & History

**Ships:** Stats center, playoffs (bracket/coverage), awards, league history.

**Prerequisites:** Phase 2's player/team data; a game-event or stats data model built on top of
Phase 1's `Game`/`Standing` models.

**Primary agents:** Sports Data Engineer (stats computation correctness), Backend Engineer,
Database Engineer, Frontend Engineer.

---

## Phase 4 — Accounts

**Ships:** Auth (Auth.js goes from scaffolded to real), player/team dashboards; `apps/admin`
becomes a real, working admin panel for content and roster management.

**Prerequisites:** Phases 1–3 data models stable enough to expose write paths; Auth.js scaffold
from Phase 0 wired to real session/user flows.

**Primary agents:** Security Engineer (auth design, session handling), Backend Engineer,
Frontend Engineer (apps/admin UI), Database Engineer (user/session schema), QA Engineer.

---

## Phase 5 — Discovery & Media

**Ships:** Search, notifications, photo gallery, video highlights, sponsor placements;
Cloudinary integration goes live (the swappable adapter built in Phase 0 gets real
credentials/usage — see [future-services.md](./future-services.md)).

**Prerequisites:** Phase 1's news/content model; the Cloudinary adapter contract defined in
Phase 0 and left unprovisioned until now.

**Primary agents:** Backend Engineer, Frontend Engineer, DevOps Engineer (Cloudinary
provisioning), UI/UX Architect (media-heavy layouts), Security Engineer (search/notification
data exposure review).

---

## Future

**Ships:** `apps/mobile-api` becomes real (implements the REST contract documented in
[future-services.md](./future-services.md)); ticketing; merchandise/shop; live streaming;
Vercel and GitHub remotes go live for real deployment and collaboration (see
[github-strategy.md](./github-strategy.md) for the go-live trigger conditions).

**Prerequisites:** Phase 4 auth (ticketing/shop need real accounts and payment-adjacent trust
boundaries); Phase 5 media pipeline (streaming builds on the Cloudinary/media groundwork);
`app/api/v1/*` proven stable enough to be worth mirroring in `apps/mobile-api`.

**Primary agents:** Chief Architect (mobile-api contract, deployment topology), DevOps Engineer
(Vercel/GitHub go-live), Security Engineer (payment/ticketing trust boundaries), Backend
Engineer.

---

## How this list is used

Every non-trivial task should be traceable to a bullet in the current phase's "Ships" line. If
it isn't, either the task is out of scope right now (flag it, don't build it — see
[MASTER_SYSTEM_PROMPT.md](./MASTER_SYSTEM_PROMPT.md) rule 5) or this roadmap is out of date and
the Product Manager agent should update it before work proceeds.
