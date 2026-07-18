# apps/admin (scaffold)

Not yet implemented — this is a minimal, bootable Next.js app that exists so the workspace
boundary is settled now instead of retrofitted later. It has no admin business logic.

**Becomes real in Phase 4** (see [`.claude/roadmap.md`](../../.claude/roadmap.md)): score
entry, roster/lineup management, news publishing, and the auth-gated staff dashboards. At
that point it will consume `packages/database`, `packages/types`, and promoted components
from `packages/ui`, following the same services-layer pattern documented in
[`.claude/architecture.md`](../../.claude/architecture.md).

Runs on port 3001 (`pnpm --filter @azhl/admin dev`) to avoid colliding with `apps/web` on
3000 during local development.
