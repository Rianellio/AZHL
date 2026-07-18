# Future Services

Architectural detail for the capabilities listed in [roadmap.md](./roadmap.md)'s Phase 5 and
Future phases, written now so implementation later doesn't require re-deciding shape from
scratch. **Nothing in this doc is built yet.** It exists to preserve intent, not to authorize
early work — see [engineering-principles.md](./engineering-principles.md) on why business logic
for these apps/features stays deferred even though the shape is decided. Primary agents:
Chief Architect (contracts/topology), DevOps Engineer (provisioning), Security Engineer
(trust boundaries), Backend Engineer.

## `apps/mobile-api` (Future phase)

Intended to become a standalone, headless REST service — not a Next.js site — implementing the
same contract `apps/web`'s `app/api/v1/*` route handlers already establish today (see
[architecture.md](./architecture.md)'s services→RSC/API pattern and
[api-guidelines.md](./api-guidelines.md) for the response/error shape). Concretely:

- **Contract mirroring, not duplication.** `apps/mobile-api` calls the same
  `lib/server/services/*`-equivalent logic that backs `apps/web`'s API routes today. By the time
  this phase arrives, that logic should be stable enough to extract into a shared internal
  package if two real API surfaces need it (this is exactly the "2+ consumers" promotion rule
  from [engineering-principles.md](./engineering-principles.md) applied to service logic, not
  just UI components) — Chief Architect makes that promotion call when the phase starts, not
  before.
- **Versioning.** `app/api/v1/*` is already versioned by convention; `apps/mobile-api` adopts
  the same `/v1/` prefix and the same breaking-change policy (a breaking response-shape change
  ships as `/v2/`, old versions stay live until mobile clients migrate) rather than inventing a
  separate scheme.
- **Why it isn't just `apps/web`'s API routes reused directly:** deploy independence and blast
  radius, per [architecture.md](./architecture.md)'s app-boundary rationale — a mobile-only
  outage or a mobile-specific auth/rate-limit posture shouldn't be coupled to the public site's
  deploys.
- Until this phase, `apps/mobile-api` stays a bootable scaffold with a README documenting this
  intended contract — no runtime logic.

## `apps/admin` (Phase 4)

Becomes a real, working Next.js app for content and roster management once Phase 4 (Accounts)
starts, per [roadmap.md](./roadmap.md). What goes real at that point:

- Auth-gated dashboards using the Auth.js session model finalized in Phase 4 (Security Engineer
  owns session/auth design — see [agents/security-engineer.md](./agents/security-engineer.md)).
- Team/roster/content management screens that write through the same
  `lib/server/services/*` pattern `apps/web` uses for reads — `apps/admin` does not get its own
  parallel data-access layer; it consumes the same services (extended with write operations as
  needed) so business logic has exactly one implementation.
- Its own build/deploy target, independent of `apps/web`'s release cadence, per the blast-radius
  rationale in [architecture.md](./architecture.md).

Until Phase 4, `apps/admin` stays a bootable scaffold with a README — no admin routes, no
placeholder dashboards, no auth UI wired to nothing.

## Ticketing (Future phase)

Deferred until after Phase 4 auth exists, because ticketing requires real user accounts and a
payment-adjacent trust boundary that Security Engineer needs to design deliberately rather than
retrofit. Expected shape: a `Ticket`/`Order` domain modeled in `packages/database` alongside the
existing league schema, service functions under a new `lib/server/services/ticketing.service.ts`
in whichever app owns the storefront experience (likely `apps/web`, to be confirmed by Chief
Architect when the phase starts), and a payment provider integration treated the same way
Cloudinary is today: an adapter behind an env-var contract, not a hard dependency baked into
business logic.

## Merchandise / shop (Future phase)

Same deferred-until-Phase-4-auth reasoning as ticketing, and likely shares infrastructure with
it (checkout flow, payment provider adapter, order history tied to the same user accounts).
Product catalog data is a new domain in `packages/database`; no shape is pre-decided beyond
"it will follow the same services-are-the-source-of-truth pattern every other domain does."

## Live streaming (Future phase)

Builds on the Phase 5 media pipeline (Cloudinary) rather than starting from nothing — the
adapter contract and media-handling conventions established when Cloudinary goes live (below)
are the intended foundation for streaming infrastructure decisions, not a separate system.
Concrete provider/CDN choice is explicitly not decided yet; this is intentional, since locking
that in now would be exactly the kind of guess-shaped-by-unfinished-requirements
[engineering-principles.md](./engineering-principles.md) warns against.

## Cloudinary go-live plan (Phase 5)

Phase 0 already defines a swappable media adapter behind an env-var contract with no live
account or real keys touched (see the confirmed decisions in the Phase 0 scaffold). Going live
in Phase 5 means:

1. Provision a real Cloudinary account and credentials (DevOps Engineer), stored as real
   environment variables — never committed, `.env.example` keeps placeholder values only, per
   Chief Architect's "never approve committing real credentials" rule.
2. Point the existing adapter at real credentials; the adapter interface itself should not need
   to change if it was designed correctly in Phase 0 — if it does need to change, that's a sign
   the Phase 0 adapter contract needs revisiting, not a routine config swap.
3. Wire the photo gallery, video highlights, and any other Phase 5 media features to the now-live
   adapter.
4. Security Engineer reviews signed-upload/access-control configuration before any user-facing
   upload path ships.

## Vercel go-live plan (Future phase)

`vercel.json` and deployment docs are prepared in Phase 0 but no live project is provisioned.
Going live means:

1. Provision one Vercel project per deployable app (`apps/web` first; `apps/admin` and
   `apps/mobile-api` when their phases make them real), matching the multi-app deploy
   independence described in [architecture.md](./architecture.md) — not one project serving all
   apps.
2. **Preview deployments**: connect each Vercel project to the GitHub remote (see
   [github-strategy.md](./github-strategy.md)'s go-live checklist — this depends on the remote
   existing first) so every PR against `develop` gets an automatic preview URL; `main` deploys to
   production on merge.
3. **Env var strategy**: environment variables are scoped per Vercel environment (Development /
   Preview / Production), never shared across apps' projects even where a variable name matches,
   and real secrets (database URL, Cloudinary keys, Auth.js secret) are entered directly in
   Vercel's dashboard/CLI, never committed — `.env.example` remains the documentation of what
   variables exist, not where real values live.
4. DevOps Engineer owns this rollout and updates [architecture.md](./architecture.md) and this
   doc once it's live, so "prepare, don't provision" language here is corrected to reflect
   reality.

## GitHub remote go-live plan

Covered in full in [github-strategy.md](./github-strategy.md)'s go-live checklist. Referenced
here because it's a prerequisite for the Vercel preview-deployment flow above — sequencing
matters: GitHub remote first, then Vercel connection, then Cloudinary/payment provider
credentials as their respective phases arrive.
