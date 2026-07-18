# Engineering Principles

Senior-engineering values for AZHL, grounded in concrete decisions already made in this repo —
not generic best-practice advice. See [architecture.md](./architecture.md) for the patterns
these principles justify, [roadmap.md](./roadmap.md) for phase discipline, and
[ai-workflow.md](./ai-workflow.md) for how the agents enforce these day to day.

## Avoid premature abstraction

The clearest example in this repo: `packages/ui` is a scaffold with exactly one example
primitive, not a component library. **A component is promoted from `apps/web` into
`packages/ui` only once a second app actually consumes it — not because it looks reusable, not
because "we'll need it eventually."** Until Phase 4 (`apps/admin` goes real), there is only one
real consumer of UI components, so there is nothing to share yet. Building a generalized,
themeable, prop-heavy component API against a single caller produces an abstraction shaped by
guesswork instead of by a second real usage — and guesses about reuse are usually wrong in ways
that cost more to unwind than writing the component twice would have. The same rule applies to
logic, not just components: see [architecture.md](./architecture.md)'s naming-and-import
conventions on when shared logic actually belongs in a package. Chief Architect is the arbiter
of promotion calls (see [agents/chief-architect.md](./agents/chief-architect.md)); "it feels
reusable" is not sufficient justification on its own.

## No speculative or half-finished features

`MASTER_SYSTEM_PROMPT.md` rule 5 is the operating version of this; this doc is the reasoning
behind it. AZHL does not ship routes, tables, or UI for functionality the current roadmap phase
doesn't call for, and it does not ship partial features gated behind dead code paths "for
later." Two concrete consequences:

- `apps/admin` and `apps/mobile-api` are bootable scaffolds with a README, not apps with unused
  routes or commented-out handlers waiting for Phase 4/Future. A scaffold states intent; it does
  not simulate the finished product.
- A feature that ships in Phase 1 ships complete for Phase 1's scope — including empty, loading,
  and error states (Product Manager's acceptance criteria enforce this, see
  [agents/product-manager.md](./agents/product-manager.md)) — rather than a happy-path version
  with edge cases deferred silently.

Half-finished code is worse than no code: it looks done, so it doesn't get flagged, and the next
person to touch it inherits an invisible gap.

## Trust internal guarantees; validate only at boundaries

Not every function needs to re-check what a typed, internal caller already guarantees.
`lib/server/services/*` functions trust their TypeScript-typed arguments and the shape Prisma
returns — they do not defensively re-validate data that already passed through a typed schema
and a typed ORM query. Validation effort goes where untrusted input actually enters the system:
`app/api/v1/*` route handlers parsing query params/request bodies, and (starting Phase 4)
Auth.js session/input handling reviewed by Security Engineer. Pushing validation to every layer
"just in case" adds noise without adding safety, and it obscures where the real trust boundary
is — which matters most exactly when something goes wrong at that boundary.

## Testing philosophy

Tests earn their keep by covering logic that's easy to get subtly wrong, not by maximizing line
coverage. Priority order: hockey domain logic (standings sort/tie-break, schedule/game state —
Sports Data Engineer's domain, see
[agents/sports-data-engineer.md](./agents/sports-data-engineer.md)) and `lib/server/services/*`
functions first, since they're the single source of truth every consumer depends on; page/route
integration next; visual/animation polish last, and only where `prefers-reduced-motion` or
accessibility behavior is the thing under test. QA Engineer owns test strategy and phase
verification; a feature is not "done" until its QA-defined verification passes, not just until
it compiles.

## Code review bar

Every non-trivial diff is checked against [coding-standards.md](./coding-standards.md) and
[architecture.md](./architecture.md) by the AI Code Reviewer before it's considered done (see
[ai-workflow.md](./ai-workflow.md)). The bar is not "does it work" — it's "does it match the
documented pattern, does it stay inside its app/package boundary, does it avoid introducing a
parallel convention where one already exists." A diff that works but invents a new way to do
something `architecture.md` already answers is a review failure, not a style nitpick.

## Why the monorepo boundary exists now, but app business logic doesn't

These two decisions look inconsistent until you separate "structure" from "content." The
monorepo boundary (`apps/web` / `apps/admin` / `apps/mobile-api` / `packages/*`) is cheap to
establish now and expensive to retrofit later: splitting a monolith into separately-deployable
apps after the fact means untangling shared state, shared build config, and accidental coupling
that accumulated for months. Setting the boundary on day one costs almost nothing — the scaffold
apps are a folder, a `package.json`, and a README — and the [architecture.md](./architecture.md)
section on blast radius and deploy independence is the full rationale.

Business logic inside those boundaries is the opposite trade. `apps/admin`'s actual admin
workflows and `apps/mobile-api`'s actual endpoint behavior depend on decisions AZHL hasn't made
yet — what Phase 4 auth/session model looks like, what Phase 1–3 data models stabilize into,
what a real mobile client actually needs from the API. Writing that logic now means writing it
against guesses, and guesses about unfinished product requirements are far more likely to be
wrong — and far more expensive to unwind — than a missing folder boundary would be to add later.
So: structure is cheap now and expensive later, and gets built early. Logic shaped by
requirements that don't exist yet is expensive now and gets deferred to its actual phase — see
[future-services.md](./future-services.md) for what's being deliberately *not* decided yet
versus what's already planned in detail for when those phases arrive.
