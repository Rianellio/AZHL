# API Guidelines

REST conventions for `apps/web/src/app/api/v1/*` — the versioned contract that today serves
`apps/web`'s own client-side needs (if any) and, from the Future phase onward, `apps/mobile-api`
and `apps/admin`. Owned by the **Backend Engineer** agent. See
[architecture.md](./architecture.md#the-services--rsc--api-pattern) for why route handlers exist
alongside direct RSC service calls rather than instead of them, and
[coding-standards.md](./coding-standards.md#error-handling-boundaries) for where error mapping
happens in the request lifecycle.

## Versioning policy

- Every route lives under `app/api/v1/*`. `v1` is a real, permanent path segment, not a
  placeholder — there is no unversioned API.
- **Additive, backward-compatible changes** (new optional query param, new field in a response)
  ship into `v1` directly. **Breaking changes** (removing/renaming a field, changing a status
  code's meaning, changing pagination shape) require a new `app/api/v2/*` tree; `v1` keeps working
  unchanged until every consumer (which, once `apps/mobile-api` is real, includes external
  clients) has migrated off it. Do not silently break `v1` because "nothing internal uses it yet"
  — the whole point of versioning it from day one is to never have to make that judgment call
  under pressure later.
- A route handler's only job is version-appropriate response shaping. Business logic differences
  between versions (if any ever arise) still live in services, parameterized — not duplicated
  service code per API version.

## Request/response shape

Every `v1` endpoint returns `ApiResponse<T>` as defined in `packages/types/src/api.ts` — this is
the single shared type, not re-declared per route:

```ts
export interface ApiSuccess<T> {
  data: T;
  meta?: { page?: number; pageSize?: number; total?: number };
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

- Success responses always have a top-level `data` key — never return a bare array or bare object
  at the response root. This keeps every endpoint extensible with `meta` without a breaking
  change later.
- Error responses always have a top-level `error` key with `code` (a stable, machine-readable
  string, `SCREAMING_SNAKE_CASE`, e.g. `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`),
  `message` (human-readable, safe to show in a UI or log), and optional `details` (structured
  data for the specific error — e.g. field-level validation failures). `details` never contains
  raw internal error objects, stack traces, or Prisma error internals — see
  [coding-standards.md](./coding-standards.md#error-handling-boundaries) on the route handler's
  job of translating a typed service error into this shape.
- Route handlers never mix the two — a response is either `ApiSuccess<T>` or `ApiError`, never a
  response with both `data` and `error` present, and the HTTP status code always agrees with which
  branch was returned (2xx ⇔ `data`, 4xx/5xx ⇔ `error`).

## Status codes

| Status | Meaning | Example |
|---|---|---|
| `200` | Successful read | `GET /api/v1/standings` |
| `201` | Resource created (future write endpoints, Phase 4+) | `POST /api/v1/news` (admin, future) |
| `400` | Malformed request (bad query param shape) | `?page=notanumber` |
| `404` | Resource not found | `GET /api/v1/news/does-not-exist` |
| `422` | Well-formed request, semantically invalid (validation failure on a future write) | Missing required field on create |
| `500` | Unhandled/unexpected error | Database unreachable |

Route handlers must not return `200` with an `error` body, or a non-2xx with a `data` body — pick
the status that matches the branch of `ApiResponse<T>` being returned.

## Pagination

List endpoints that can grow unbounded (`schedule`, `news`) are paginated; endpoints returning a
bounded, small set (`standings` — one row per team in a season, capped by league size) are not.

- Query params: `page` (1-indexed, default `1`), `pageSize` (default `20`, capped server-side at
  `100`).
- Response `meta` echoes back `page`, `pageSize`, and `total` (total row count for the filtered
  query, so a client can compute total pages without a second request).
- Services accept `{ page, pageSize }` (or equivalent `skip`/`take`) as plain arguments and are
  responsible for the actual `LIMIT`/`OFFSET` (Prisma `skip`/`take`) logic — the route handler
  only parses query params into that shape and passes them through; it does not compute offsets
  itself.

## Route handlers are thin

A route handler under `app/api/v1/*` does exactly three things: parse/validate the request (query
params, path params, and — for future write endpoints — body), call the matching service
function, and shape the result into `ApiResponse<T>` with the right status. No filtering, sorting,
joining, or derived-field computation belongs in a route handler — that's business logic, and
business logic lives in `lib/server/services/*` per
[architecture.md](./architecture.md#the-services--rsc--api-pattern). If a route handler's body is
more than ~15-20 lines, that's usually a sign logic leaked into it that belongs in the service.

```ts
// apps/web/src/app/api/v1/news/route.ts
import { NextResponse } from "next/server";
import { listNewsArticles } from "@/lib/server/services/news.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

  const { articles, total } = await listNewsArticles({ page, pageSize });
  return NextResponse.json({ data: articles, meta: { page, pageSize, total } });
}
```

## Future consumers

`apps/mobile-api` (Future phase) does not reimplement standings/schedule/news logic — it either
proxies to `apps/web`'s `v1` contract or, once it's a real standalone service, imports the same
`lib/server/services/*` logic relocated to a shared location if/when it needs to run
out-of-process from `apps/web` (a decision deferred to when `apps/mobile-api` actually goes real —
see [future-services.md](./future-services.md)). Either way, the `v1` REST shape documented here
is the stable contract it's built against, which is exactly why versioning and a consistent error
shape are non-negotiable starting now, not retrofitted later.

`apps/admin` (Phase 4) consumes the same `v1` read endpoints for its own dashboards and adds
authenticated write endpoints (`POST`/`PATCH`/`DELETE`) under the same `app/api/v1/*` namespace,
gated by Auth.js session/role checks — those write routes follow every convention on this page
(response shape, status codes, thin-handler rule) plus the auth requirements the Security Engineer
agent defines when Phase 4 starts.
