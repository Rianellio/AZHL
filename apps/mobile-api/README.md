# apps/mobile-api (scaffold)

Not yet implemented — a minimal, bootable Next.js app holding only a `GET /api/v1/health`
proof-of-boot route. No business logic lives here yet.

`apps/web`'s `app/api/v1/*` route handlers (backed by `lib/server/services/*`) are the real,
authoritative API surface today. When a native mobile client is actually built, this app
becomes the dedicated API gateway — see
[`.claude/future-services.md`](../../.claude/future-services.md) for the intended REST
contract, versioning approach, and how it will share `packages/database` and `packages/types`
with `apps/web` without duplicating business logic.

Runs on port 3002 (`pnpm --filter @azhl/mobile-api dev`).
