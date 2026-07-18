# AI Workflow

How the 12 agents in [`.claude/agents/`](./agents/) collaborate. See
[CLAUDE.md](./CLAUDE.md) for the roster summary and
[MASTER_SYSTEM_PROMPT.md](./MASTER_SYSTEM_PROMPT.md) for the operating rules every agent holds
regardless of role. This doc is the routing and process layer on top of both.

## Routing rules

Route a task to the agent whose domain owns it, rather than solving it generically from
whichever agent happened to be invoked. If a task spans domains, start with the primary owner
below and let that agent pull in collaborators per its own Collaboration Rules section.

| Task looks like... | Route to |
|---|---|
| Cross-app/package decisions, new dependencies, arbitration | [agents/chief-architect.md](./agents/chief-architect.md) |
| "Is this in scope right now," acceptance criteria, prioritization | [agents/product-manager.md](./agents/product-manager.md) |
| Visual/interaction consistency, accessibility, design tokens | [agents/ui-ux-architect.md](./agents/ui-ux-architect.md) |
| `apps/web` (later `apps/admin`) pages/components | [agents/frontend-engineer.md](./agents/frontend-engineer.md) |
| `lib/server/services/*`, `app/api/v1/*` | [agents/backend-engineer.md](./agents/backend-engineer.md) |
| Prisma schema, migrations, seed data | [agents/database-engineer.md](./agents/database-engineer.md) |
| Motion implementation, `prefers-reduced-motion`, performance budget | [agents/animation-engineer.md](./agents/animation-engineer.md) |
| Standings/schedule/stats correctness, hockey domain rules | [agents/sports-data-engineer.md](./agents/sports-data-engineer.md) |
| CI, Docker Compose, Vercel/env strategy, release process | [agents/devops-engineer.md](./agents/devops-engineer.md) |
| Auth, secrets, dependency risk, OWASP | [agents/security-engineer.md](./agents/security-engineer.md) |
| Test strategy, coverage, phase verification | [agents/qa-engineer.md](./agents/qa-engineer.md) |
| Pre-merge review of a diff | [agents/ai-code-reviewer.md](./agents/ai-code-reviewer.md) |

When it's genuinely unclear which agent owns a task, default to Chief Architect for
structural/technical ambiguity and Product Manager for scope ambiguity — do not guess and
proceed under a generic identity.

## Product Manager gates scope

No agent — including Chief Architect — starts non-trivial work without it being traceable to a
bullet in the current phase of [roadmap.md](./roadmap.md). Product Manager is the single
gatekeeper for "is this in scope right now"; every other agent's Collaboration Rules section
lists a check against Product Manager for exactly this reason. If a task appears to require
reaching into a later phase (e.g. real `apps/admin` logic before Phase 4), the correct move is
to flag it and stop, not to build a "temporary" version. See
[engineering-principles.md](./engineering-principles.md) on why speculative work is treated as
a defect, not a convenience.

## Plan before code

For any non-trivial change — anything touching more than one file, crossing an app/package
boundary, or introducing a new pattern — produce a short plan before writing code: what's
changing, which files, which doc(s) it must stay consistent with, and which agent(s) need to
sign off. Trivial, single-file, pattern-following changes don't need a formal plan, but still
need to be checked against the relevant doc in `.claude/` first (see
[CLAUDE.md](./CLAUDE.md)'s "documentation before invention" rule). A plan that turns out to
require a later-phase feature is a signal to stop and route to Product Manager, not a reason to
scope the plan down silently.

## AI Code Reviewer in the loop

AI Code Reviewer (see [agents/ai-code-reviewer.md](./agents/ai-code-reviewer.md)) has read-only
tool access by design — it reviews, it does not fix. It runs before work is considered done, not
as an optional final pass: every non-trivial diff is checked against
[coding-standards.md](./coding-standards.md) and [architecture.md](./architecture.md), and any
diff that crosses an app/package boundary is additionally flagged to Chief Architect regardless
of whether the reviewer finds a problem in it. A change that hasn't gone through this check is
not ready to hand back to the user as finished, even if it builds and runs.

## Chief Architect arbitrates disagreements

When two agents reach different conclusions on the same question — e.g. Frontend Engineer and
Backend Engineer disagree on which layer a piece of derived data belongs in, or Database
Engineer and Sports Data Engineer disagree on a schema shape — neither side unilaterally wins by
proceeding first. The question escalates to
[agents/chief-architect.md](./agents/chief-architect.md), which makes the call and records the
rationale in [architecture.md](./architecture.md) so the decision doesn't have to be re-litigated
next time the same question comes up. Product Manager retains final say on anything that is
actually a scope question wearing a technical disguise ("should we even build this now") rather
than a genuine architecture question ("given that we're building this, how should it be
structured").

## How this doc evolves

This routing table is only as good as its match to the actual agent roster and phase list.
When a phase transition changes what an agent owns (e.g. Frontend Engineer's scope expanding to
`apps/admin` in Phase 4, or Backend Engineer's scope expanding to `apps/mobile-api` in the
Future phase per [future-services.md](./future-services.md)), update the routing table in the
same change that updates [roadmap.md](./roadmap.md) — don't let this doc silently drift out of
sync with what agents actually do. If a 13th agent is ever added, it gets a row here and a row
in [CLAUDE.md](./CLAUDE.md)'s roster table in the same change, not a follow-up.
