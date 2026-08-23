# AZHL Platform — REST API Specification (Design Only)

**Status: design document only.** No route handler, middleware, or validation schema described
here is implemented. The three routes that exist today (`GET /api/v1/standings`,
`/schedule`, `/news`) are real but minimal — unpaginated, no query params, exactly matching
[api-guidelines.md](./api-guidelines.md)'s documented contract at Phase 1. This document is the
**target-state catalog** every future endpoint (including richer versions of those three) is
built against, the same way [backend-architecture.md](./backend-architecture.md) and
[database-erd.md](./database-erd.md) are target-state, not yet-built. It does not authorize
building anything ahead of its feature's phase in [roadmap.md](./roadmap.md).

This document **extends** [api-guidelines.md](./api-guidelines.md) — the envelope shape
(`ApiSuccess<T>`/`ApiError`/`ApiResponse<T>`, already real at `packages/types/src/api.ts`),
versioning policy, and status-code table defined there are not repeated in full, only
referenced. Every table/field named below is the one designed in
[database-erd.md](./database-erd.md); every module boundary and auth model is the one designed in
[backend-architecture.md](./backend-architecture.md).

Primary owner: **Backend Engineer** agent, with **Security Engineer** for §2's auth model.

---

## Table of contents

1. [Conventions (read this before any endpoint below)](#1-conventions)
2. [Authentication](#2-authentication)
3. [Users](#3-users)
4. [Teams](#4-teams)
5. [Players](#5-players)
6. [Games](#6-games)
7. [Standings](#7-standings)
8. [Statistics](#8-statistics)
9. [News](#9-news)
10. [Media](#10-media)
11. [Sponsors](#11-sponsors)
12. [Notifications](#12-notifications)
13. [Audit Logs](#13-audit-logs)
14. [Full endpoint index](#14-full-endpoint-index)
15. [Consumer-specific notes](#15-consumer-specific-notes)

---

## 1. Conventions

Stated once; every endpoint section below only calls out where it differs.

### 1.1 Versioning

Unchanged from [api-guidelines.md](./api-guidelines.md): every endpoint lives under
`/api/v1/*` (this doc writes it as `/v1/*` for brevity). Additive changes ship into `v1`;
breaking changes require `/v2/*`, with `v1` kept live until every known consumer has migrated.
**Extension for third-party/public API consumers** (Future phase, once external clients hold API
keys): a deprecated version is additionally announced via a `Deprecation: true` and
`Sunset: <date>` response header (per the emerging HTTP `Sunset` header convention) for at least
90 days before removal, since an external consumer can't be coordinated with the way an internal
one can.

### 1.2 Response envelope

Every endpoint returns `ApiResponse<T>` exactly as defined at `packages/types/src/api.ts` and
documented in [api-guidelines.md](./api-guidelines.md):

```ts
interface ApiSuccess<T> { data: T; meta?: { page?: number; pageSize?: number; total?: number } }
interface ApiError { error: { code: string; message: string; details?: unknown } }
type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

This document does not repeat that shape per endpoint — each endpoint below names only what `T`
is.

### 1.3 Authentication levels

A short vocabulary used in every endpoint's **Auth** line, so "who can call this" is scannable at
a glance rather than re-explained each time:

| Level | Meaning |
|---|---|
| **Public** | No credentials required |
| **Authenticated** | Any valid session (browser) or access token (mobile/API) — no specific role |
| **Self** | Authenticated, and the resource must belong to the caller (or the caller is `ADMIN`) |
| **Role: EDITOR+** | Authenticated with the `EDITOR` or `ADMIN` role (per [database-erd.md](./database-erd.md#4-identity-schema)'s `roles`/`permissions` tables) |
| **Role: ADMIN** | Authenticated with the `ADMIN` role only |
| **API Key** | Server-to-server / third-party public-API caller, authenticated by API key rather than a user session (Future phase) |

Every non-`Public` level is resolved by API-layer middleware into an `AuthContext` before a
module's function is ever called, per
[backend-architecture.md](./backend-architecture.md) §11–§12 — no endpoint below checks
credentials itself.

### 1.4 Pagination

Unchanged from [api-guidelines.md](./api-guidelines.md): list endpoints that can grow unbounded
take `page` (1-indexed, default `1`) and `pageSize` (default `20`, capped at `100`) query params,
and echo `page`/`pageSize`/`total` in the response's `meta`. Endpoints returning a small, bounded
set (e.g. `standings` — one row per team) are not paginated, called out per endpoint.

### 1.5 Sorting

New convention, not yet in [api-guidelines.md](./api-guidelines.md) — added here since this doc is
the first to specify multiple sortable list endpoints:

- Query param `sort`, a single field name; prefix with `-` for descending
  (`?sort=-points` = points descending). Default sort is documented per endpoint.
- Only fields explicitly listed as "Sortable fields" for that endpoint are accepted; any other
  value is a `400 VALIDATION_ERROR` (bad request, not a silent fallback to default — a caller
  relying on a typo'd sort field should find out immediately, not get quietly-wrong results).

### 1.6 Filtering

- Simple, flat query params per filterable field — no bracket/query-language syntax
  (`?filter[x]=y`), matching this API's actual scale. This also matches the real, already-existing
  pattern in the codebase (`/schedule?team=<slug>`) rather than inventing a new convention.
- Each endpoint documents its own accepted filter params; unrecognized params are ignored (not an
  error) so old clients don't break when a new filter is added, consistent with the "additive
  changes stay in v1" versioning policy.

### 1.7 Validation

- Every request body and query-param set is validated against a schema before reaching a module
  (Zod, per [backend-architecture.md](./backend-architecture.md) §15) — a `400` for a malformed
  request (wrong type, unparseable value) versus a `422` for a well-formed but semantically invalid
  one (a slug that already exists, a `teamId` that doesn't exist), matching
  [api-guidelines.md](./api-guidelines.md)'s existing status-code table exactly.
- Field-level validation rules are listed inline in each endpoint's **Request Body** section
  (type, required/optional, length/format constraints) rather than in a separate schema file —
  this document is the source those future Zod schemas are written from.

### 1.8 Standard error catalog

Extends [api-guidelines.md](./api-guidelines.md)'s partial table into the full set this spec uses:

| `code` | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 or 422 | Request shape or semantics invalid — see §1.7 |
| `UNAUTHORIZED` | 401 | No valid credentials presented |
| `FORBIDDEN` | 403 | Valid credentials, insufficient role/ownership (§1.3) |
| `NOT_FOUND` | 404 | Resource doesn't exist (or is soft-deleted, per [database-erd.md](./database-erd.md)) |
| `CONFLICT` | 409 | Violates a unique constraint (e.g. a slug already in use) |
| `RATE_LIMITED` | 429 | Caller exceeded the rate limit for this endpoint/API key (§1.9) |
| `INTERNAL_ERROR` | 500 | Unhandled failure — never exposes internals, per [api-guidelines.md](./api-guidelines.md) |

Every endpoint below lists only the error codes *beyond* this standard set that it can uniquely
produce; assume `VALIDATION_ERROR`/`UNAUTHORIZED`/`NOT_FOUND`/`INTERNAL_ERROR` are always possible
unless the endpoint is `Public` + read-only, in which case `UNAUTHORIZED`/`FORBIDDEN` don't apply.

### 1.9 Rate limiting

Per [backend-architecture.md](./backend-architecture.md) §8/§16: a Redis-backed sliding-window
limiter sits in front of every endpoint, scoped per-IP for `Public` endpoints and per-user/per-API-key
for authenticated ones. Specific limits are an operational tuning decision deferred to
implementation time, not fixed in this design doc — what's fixed here is that every write endpoint
(`POST`/`PATCH`/`PUT`/`DELETE`) is rate-limited more strictly than reads, and that a limited
request always gets `429 RATE_LIMITED`, never a silent drop.

---

## 2. Authentication

OAuth provider callback routes (`/api/auth/*`) are managed entirely by Auth.js per
[architecture.md](./architecture.md) and are **not** part of this custom `v1` catalog — only the
endpoints below are hand-designed REST surface, for flows Auth.js doesn't cover itself (mobile
token issuance) or that need a stable contract independent of the auth library's own routes.

### `POST /v1/auth/register`
- **Description:** Create a new `FAN` account with email/password (the credentials-based signup
  path; OAuth signup goes through Auth.js's own flow instead).
- **Auth:** Public
- **Request Body:** `{ email: string (required, valid email, unique), password: string (required, min 10 chars), displayName: string (required, 2–60 chars) }`
- **Response:** `ApiSuccess<{ user: UserDTO }>` — `201`
- **Status Codes:** `201` created · `409` email already registered · `422` weak password
- **Errors beyond standard:** `CONFLICT` (`email` already in use)

### `POST /v1/auth/login`
- **Description:** Exchange credentials for a session (web) or an access + refresh token pair
  (mobile/API), per [backend-architecture.md](./backend-architecture.md) §11.
- **Auth:** Public
- **Request Body:** `{ email: string (required), password: string (required), client: "web" | "mobile" (required — determines whether a cookie session or a token pair is issued) }`
- **Response:** `ApiSuccess<{ user: UserDTO } | { user: UserDTO; accessToken: string; refreshToken: string; expiresIn: number }>` — shape depends on `client`
- **Status Codes:** `200` · `401` bad credentials
- **Errors beyond standard:** `UNAUTHORIZED` (wrong password — deliberately the same code/message
  as "email not found," never revealing which, to avoid account enumeration)

### `POST /v1/auth/refresh`
- **Description:** Exchange a valid refresh token for a new access token (mobile/API only — web
  sessions renew via Auth.js's own cookie mechanism, not this endpoint).
- **Auth:** Public (the refresh token itself *is* the credential)
- **Request Body:** `{ refreshToken: string (required) }`
- **Response:** `ApiSuccess<{ accessToken: string; expiresIn: number }>`
- **Status Codes:** `200` · `401` expired/revoked/unknown token
- **Errors beyond standard:** `UNAUTHORIZED` (`token_expired` / `token_revoked` distinguished in
  `error.details`, since a client needs to know "prompt re-login" vs. "retry silently")

### `POST /v1/auth/logout`
- **Description:** Revoke the current session (web) or refresh token (mobile).
- **Auth:** Authenticated
- **Request Body:** none (web) · `{ refreshToken: string }` (mobile, to revoke that specific token)
- **Response:** `ApiSuccess<null>`
- **Status Codes:** `200`

### `POST /v1/auth/verify-email`
- **Description:** Consume an email verification token (Auth.js `verification_tokens`, per
  [database-erd.md](./database-erd.md)).
- **Auth:** Public
- **Request Body:** `{ token: string (required) }`
- **Response:** `ApiSuccess<null>`
- **Status Codes:** `200` · `400` invalid/expired token

### `GET /v1/auth/me`
- **Description:** The caller's own identity and roles — what every client app calls once at
  startup to know who's logged in.
- **Auth:** Authenticated
- **Response:** `ApiSuccess<UserDTO & { roles: string[] }>`
- **Status Codes:** `200` · `401` no/expired session

---

## 3. Users

### `GET /v1/users`
- **Description:** List user accounts (admin user-management screen).
- **Auth:** Role: ADMIN
- **Query params:** `page`, `pageSize` (§1.4); `sort`: `createdAt` (default, desc), `email`;
  filter: `role` (role name), `q` (search by email/display name, case-insensitive substring)
- **Response:** `ApiSuccess<UserSummaryDTO[]>` with `meta`
- **Status Codes:** `200`

### `GET /v1/users/{id}`
- **Description:** One user's admin-facing detail.
- **Auth:** Role: ADMIN, or Self
- **Response:** `ApiSuccess<UserDTO>`
- **Status Codes:** `200` · `404`

### `PATCH /v1/users/{id}`
- **Description:** Update profile fields.
- **Auth:** Self (own profile fields only) or Role: ADMIN (any field, any user)
- **Request Body:** `{ displayName?: string (2–60 chars) }` — email/password changes go through
  dedicated Auth.js-backed flows, not this generic patch, since they need re-verification
- **Response:** `ApiSuccess<UserDTO>`
- **Status Codes:** `200` · `403` (a non-admin attempting to edit another user) · `422`

### `DELETE /v1/users/{id}`
- **Description:** Soft-delete an account (`deleted_at`, per [database-erd.md](./database-erd.md)'s
  `users` design — never a hard delete).
- **Auth:** Role: ADMIN
- **Response:** `ApiSuccess<null>`
- **Status Codes:** `200` · `404`

### `PUT /v1/users/{id}/roles`
- **Description:** Replace a user's full set of role assignments (`user_roles`, per
  [database-erd.md](./database-erd.md)).
- **Auth:** Role: ADMIN
- **Request Body:** `{ roles: string[] (required, each must be an existing role name) }`
- **Response:** `ApiSuccess<{ roles: string[] }>`
- **Status Codes:** `200` · `422` (unknown role name)
- **Errors beyond standard:** `VALIDATION_ERROR` with `details.unknownRoles`

---

## 4. Teams

### `GET /v1/teams`
- **Description:** All teams in the league — matches today's Teams directory page.
- **Auth:** Public
- **Query params:** none (bounded set — league size, not paginated, per §1.4); `sort`: `name`
  (default), `abbreviation`
- **Response:** `ApiSuccess<TeamSummaryDTO[]>`
- **Status Codes:** `200`

### `GET /v1/teams/{slug}`
- **Description:** One team's detail.
- **Auth:** Public
- **Response:** `ApiSuccess<TeamDTO>`
- **Status Codes:** `200` · `404`

### `POST /v1/teams`
- **Description:** Create a team (admin CMS).
- **Auth:** Role: ADMIN
- **Request Body:** `{ name: string (required, 2–60), city: string (required), abbreviation: string (required, 2–4 uppercase letters, unique), colorPrimary/colorSecondary/colorAccent: string (required, hex color) }`
- **Response:** `ApiSuccess<TeamDTO>` — `201`
- **Status Codes:** `201` · `409` (abbreviation/slug already taken) · `422`
- **Errors beyond standard:** `CONFLICT`

### `PATCH /v1/teams/{id}`
- **Description:** Update a team's details.
- **Auth:** Role: ADMIN
- **Request Body:** any subset of `POST`'s fields
- **Response:** `ApiSuccess<TeamDTO>`
- **Status Codes:** `200` · `404` · `409` · `422`

### `DELETE /v1/teams/{id}`
- **Description:** Soft-delete a team (per [database-erd.md](./database-erd.md), a team can fold/
  rebrand — its history must remain queryable).
- **Auth:** Role: ADMIN
- **Response:** `ApiSuccess<null>`
- **Status Codes:** `200` · `404`

### `GET /v1/teams/{slug}/players`
- **Description:** A team's roster.
- **Auth:** Public
- **Query params:** filter: `position` (`C`/`LW`/`RW`/`D`/`G`)
- **Response:** `ApiSuccess<PlayerSummaryDTO[]>`
- **Status Codes:** `200` · `404` (unknown team slug)

### `GET /v1/teams/{slug}/games`
- **Description:** A team's full schedule (played + upcoming).
- **Auth:** Public
- **Query params:** `page`, `pageSize`; filter: `status` (`SCHEDULED`/`LIVE`/`FINAL`/`POSTPONED`),
  `season` (season id, defaults to current)
- **Response:** `ApiSuccess<GameDTO[]>` with `meta`
- **Status Codes:** `200` · `404`

---

## 5. Players

### `GET /v1/players`
- **Description:** League-wide player directory.
- **Auth:** Public
- **Query params:** `page`, `pageSize`; `sort`: `fullName` (default), `jerseyNumber`; filter:
  `team` (team slug), `position`
- **Response:** `ApiSuccess<PlayerSummaryDTO[]>` with `meta`
- **Status Codes:** `200`

### `GET /v1/players/{id}`
- **Description:** One player's profile.
- **Auth:** Public
- **Response:** `ApiSuccess<PlayerDTO>`
- **Status Codes:** `200` · `404`

### `POST /v1/players`
- **Description:** Add a player to a roster (admin CMS).
- **Auth:** Role: ADMIN
- **Request Body:** `{ personId: string (required, existing person), teamId: string (required), jerseyNumber: number (required, 1–99, unique per team), position: "C"|"LW"|"RW"|"D"|"G" (required) }`
- **Response:** `ApiSuccess<PlayerDTO>` — `201`
- **Status Codes:** `201` · `409` (jersey number already taken on that team) · `422`
- **Errors beyond standard:** `CONFLICT`

### `PATCH /v1/players/{id}`
- **Description:** Update roster details (jersey number, position) or transfer to another team —
  a `teamId` change on this endpoint is exactly what publishes `player.transferred`
  ([backend-architecture.md](./backend-architecture.md) §4) after the write commits.
- **Auth:** Role: ADMIN
- **Request Body:** any subset of `{ teamId, jerseyNumber, position }`
- **Response:** `ApiSuccess<PlayerDTO>`
- **Status Codes:** `200` · `404` · `409` · `422`

### `DELETE /v1/players/{id}`
- **Description:** Soft-delete (player leaves the league entirely — distinct from a transfer,
  which is a `PATCH`).
- **Auth:** Role: ADMIN
- **Response:** `ApiSuccess<null>`
- **Status Codes:** `200` · `404`

### `GET /v1/players/{id}/stats`
- **Description:** A player's season-by-season stat lines (`player_season_stats`, or
  `goalie_season_stats` if the player is a goaltender — the response discriminates by shape).
- **Auth:** Public
- **Query params:** filter: `season` (defaults to all seasons the player has a stat line for)
- **Response:** `ApiSuccess<PlayerSeasonStatsDTO[]>`
- **Status Codes:** `200` · `404`

---

## 6. Games

### `GET /v1/games`
- **Description:** Schedule/results — the richer, paginated/filterable successor to today's
  unpaginated `GET /v1/schedule`.
- **Auth:** Public
- **Query params:** `page`, `pageSize`; `sort`: `startTime` (default, asc); filter: `season`
  (defaults to current), `team` (slug — matches either home or away), `status`,
  `from`/`to` (ISO date range on `startTime`)
- **Response:** `ApiSuccess<GameDTO[]>` with `meta`
- **Status Codes:** `200`

### `GET /v1/games/{id}`
- **Description:** One game's box-score detail (Game Center).
- **Auth:** Public
- **Response:** `ApiSuccess<GameDTO & { events: GameEventDTO[] }>`
- **Status Codes:** `200` · `404`

### `POST /v1/games`
- **Description:** Schedule a new game (admin CMS).
- **Auth:** Role: ADMIN
- **Request Body:** `{ seasonId: string (required), homeTeamId: string (required), awayTeamId: string (required, ≠ homeTeamId), startTime: string (required, ISO datetime, future), venue: string (required) }`
- **Response:** `ApiSuccess<GameDTO>` — `201`
- **Status Codes:** `201` · `422` (home === away, or a past `startTime`)

### `PATCH /v1/games/{id}`
- **Description:** Update game status/score — marking a game `FINAL` here is what publishes
  `game.finished` after commit ([backend-architecture.md](./backend-architecture.md) §4).
- **Auth:** Role: ADMIN
- **Request Body:** `{ status?: "SCHEDULED"|"LIVE"|"FINAL"|"POSTPONED", homeScore?: number, awayScore?: number, period?: number }`
- **Response:** `ApiSuccess<GameDTO>`
- **Status Codes:** `200` · `404` · `422` (e.g. a score set while `status` is `SCHEDULED`)

### `GET /v1/games/{id}/events`
- **Description:** Play-by-play (`game_events`, per [database-erd.md](./database-erd.md)).
- **Auth:** Public
- **Query params:** `page`, `pageSize` (a long game's event log can be large); `sort`:
  `occurredAt` (default, asc)
- **Response:** `ApiSuccess<GameEventDTO[]>` with `meta`
- **Status Codes:** `200` · `404`

### `POST /v1/games/{id}/events`
- **Description:** Record a live event (goal, penalty, period boundary) — the write that
  publishes `game.goal_scored` (or the matching event type) immediately after commit.
- **Auth:** Role: ADMIN
- **Request Body:** `{ type: string (required, closed set: "goal"|"penalty"|"period_start"|"period_end"|...), occurredAt: string (required, ISO datetime), playerId?: string (required for "goal"/"penalty"), detail?: object (event-specific fields, e.g. penalty minutes) }`
- **Response:** `ApiSuccess<GameEventDTO>` — `201`
- **Status Codes:** `201` · `404` (unknown game) · `422`

---

## 7. Standings

### `GET /v1/standings`
- **Description:** Current season's standings — the richer successor to today's real
  (unpaginated, unfiltered) `GET /v1/standings`.
- **Auth:** Public
- **Query params:** none required; filter: `season` (defaults to current); not paginated (bounded
  by league size, per §1.4); `sort`: `points` (default, desc), `wins`, `goalsFor`,
  `goalsAgainst`, `diff` — matches the sortable columns on the actual `/standings` page today
- **Response:** `ApiSuccess<StandingDTO[]>`
- **Status Codes:** `200`

---

## 8. Statistics

### `GET /v1/stats/players`
- **Description:** Skater leaderboards — goals/assists/points, matching the actual `/stats` page's
  Players section.
- **Auth:** Public
- **Query params:** `category` (required: `goals`|`assists`|`points`); filter: `season` (defaults
  to current); `limit` (default `5`, max `50` — a leaderboard, not a full paginated list, so this
  uses a simple cap rather than full `page`/`pageSize` pagination)
- **Response:** `ApiSuccess<PlayerLeaderboardEntryDTO[]>` — **empty array, not an error, if every
  value is currently zero** (matches the actual `/stats` page's "no fake leaders" behavior,
  per the standing product rule that a tie at zero has no real leader to report)
- **Status Codes:** `200` · `422` (unknown `category`)

### `GET /v1/stats/goalies`
- **Description:** Goaltending leaderboard (wins, by default).
- **Auth:** Public
- **Query params:** `category` (`wins`|`gaa`|`savePercentage`|`shutouts`, default `wins`); filter:
  `season`; `limit` (as above)
- **Response:** `ApiSuccess<GoalieLeaderboardEntryDTO[]>`
- **Status Codes:** `200` · `422`

### `GET /v1/stats/teams`
- **Description:** Team-level leaderboards (goals for/against; power play/penalty kill once those
  are ever trackable, per [database-erd.md](./database-erd.md)'s note that no schema field exists
  for PP/PK yet).
- **Auth:** Public
- **Query params:** `category` (required: `goalsFor`|`goalsAgainst`); filter: `season`; `limit`
- **Response:** `ApiSuccess<TeamLeaderboardEntryDTO[]>`
- **Status Codes:** `200` · `422`

---

## 9. News

### `GET /v1/news`
- **Description:** Article list — the richer, paginated successor to today's real (unpaginated)
  `GET /v1/news`.
- **Auth:** Public (published articles only; a `deleted_at`/unpublished article never appears here
  regardless of caller, except per the `Role: EDITOR+` variant below)
- **Query params:** `page`, `pageSize`; `sort`: `publishedAt` (default, desc); filter: `category`
  (category slug)
- **Response:** `ApiSuccess<NewsArticleSummaryDTO[]>` with `meta`
- **Status Codes:** `200`

### `GET /v1/news/{slug}`
- **Description:** One article's full body.
- **Auth:** Public
- **Response:** `ApiSuccess<NewsArticleDTO>`
- **Status Codes:** `200` · `404`

### `POST /v1/news`
- **Description:** Create an article (admin CMS) — publishing it (see `PATCH`) is what emits
  `news.published`.
- **Auth:** Role: EDITOR+
- **Request Body:** `{ title: string (required, 4–140), excerpt: string (required, ≤280), body: string (required), categoryIds: string[] (optional), publishedAt?: string (ISO datetime — omit to save as a draft) }`
- **Response:** `ApiSuccess<NewsArticleDTO>` — `201`
- **Status Codes:** `201` · `409` (slug collision, derived from title) · `422`

### `PATCH /v1/news/{id}`
- **Description:** Edit a draft or published article; setting `publishedAt` on a previously-unpublished
  article is the write that triggers `news.published`.
- **Auth:** Role: EDITOR+
- **Request Body:** any subset of `POST`'s fields
- **Response:** `ApiSuccess<NewsArticleDTO>`
- **Status Codes:** `200` · `404` · `409` · `422`

### `DELETE /v1/news/{id}`
- **Description:** Soft-delete/retract an article (per [database-erd.md](./database-erd.md),
  editorial retraction is reversible).
- **Auth:** Role: EDITOR+
- **Response:** `ApiSuccess<null>`
- **Status Codes:** `200` · `404`

### `GET /v1/news/categories`
- **Description:** The managed category list, for filter UIs.
- **Auth:** Public
- **Response:** `ApiSuccess<NewsCategoryDTO[]>`
- **Status Codes:** `200`

---

## 10. Media

### `GET /v1/media`
- **Description:** Media library listing — used by the admin CMS and any future gallery page.
- **Auth:** Public (only non-deleted assets)
- **Query params:** `page`, `pageSize`; filter: `team`, `player`, `game`, `newsArticle` (any one
  ID — matches [database-erd.md](./database-erd.md)'s nullable relation columns)
- **Response:** `ApiSuccess<MediaAssetDTO[]>` with `meta`
- **Status Codes:** `200`

### `GET /v1/media/{id}`
- **Description:** One asset's metadata.
- **Auth:** Public
- **Response:** `ApiSuccess<MediaAssetDTO>`
- **Status Codes:** `200` · `404`

### `POST /v1/media/upload-url`
- **Description:** Request a signed direct-to-storage upload URL
  ([backend-architecture.md](./backend-architecture.md) §7 — the client uploads the file bytes
  straight to Cloudinary, never through this API).
- **Auth:** Role: EDITOR+
- **Request Body:** `{ contentType: string (required, allow-listed MIME types only), folder: string (required, closed set matching the relation it'll attach to) }`
- **Response:** `ApiSuccess<{ uploadUrl: string; assetId: string }>`
- **Status Codes:** `200` · `422` (disallowed content type)

### `POST /v1/media`
- **Description:** Finalize an asset's metadata after the client's direct upload succeeds — the
  write that publishes `media.uploaded`.
- **Auth:** Role: EDITOR+
- **Request Body:** `{ assetId: string (required, from upload-url), caption?: string, credit?: string, teamId?/playerId?/gameId?/newsArticleId?: string (exactly one, optional) }`
- **Response:** `ApiSuccess<MediaAssetDTO>` — `201`
- **Status Codes:** `201` · `404` (unknown `assetId` — upload never completed or URL expired) · `422`

### `DELETE /v1/media/{id}`
- **Description:** Soft-delete an asset.
- **Auth:** Role: EDITOR+
- **Response:** `ApiSuccess<null>`
- **Status Codes:** `200` · `404`

---

## 11. Sponsors

### `GET /v1/sponsors`
- **Description:** Public sponsor/partner listing (Home page strip, League page).
- **Auth:** Public
- **Query params:** filter: `tier` (`official`|`partner`), `team` (team slug, for team-specific
  sponsors)
- **Response:** `ApiSuccess<SponsorDTO[]>`
- **Status Codes:** `200`

### `POST /v1/sponsors`
- **Description:** Add a sponsor (admin CMS).
- **Auth:** Role: ADMIN
- **Request Body:** `{ name: string (required), logoUrl: string (required, URL), tier: "official"|"partner" (required), teamId?: string (optional), link?: string (optional, URL) }`
- **Response:** `ApiSuccess<SponsorDTO>` — `201`
- **Status Codes:** `201` · `422`

### `PATCH /v1/sponsors/{id}`
- **Description:** Update a sponsor's details.
- **Auth:** Role: ADMIN
- **Request Body:** any subset of `POST`'s fields
- **Response:** `ApiSuccess<SponsorDTO>`
- **Status Codes:** `200` · `404` · `422`

### `DELETE /v1/sponsors/{id}`
- **Description:** Soft-delete (a lapsed sponsorship stays visible on historical season pages,
  per [database-erd.md](./database-erd.md)).
- **Auth:** Role: ADMIN
- **Response:** `ApiSuccess<null>`
- **Status Codes:** `200` · `404`

---

## 12. Notifications

### `GET /v1/notifications`
- **Description:** The caller's own notification inbox.
- **Auth:** Self
- **Query params:** `page`, `pageSize`; `sort`: `createdAt` (default, desc); filter: `unreadOnly`
  (boolean)
- **Response:** `ApiSuccess<NotificationDTO[]>` with `meta`
- **Status Codes:** `200`

### `PATCH /v1/notifications/{id}/read`
- **Description:** Mark one notification read.
- **Auth:** Self
- **Response:** `ApiSuccess<NotificationDTO>`
- **Status Codes:** `200` · `404` · `403` (attempting to mark another user's notification)

### `PATCH /v1/notifications/read-all`
- **Description:** Mark every unread notification read (the "clear all" action).
- **Auth:** Self
- **Response:** `ApiSuccess<{ updated: number }>`
- **Status Codes:** `200`

### `GET /v1/notifications/preferences`
- **Description:** The caller's own channel/topic opt-in settings.
- **Auth:** Self
- **Response:** `ApiSuccess<NotificationPreferenceDTO[]>`
- **Status Codes:** `200`

### `PUT /v1/notifications/preferences`
- **Description:** Replace the caller's full preference set.
- **Auth:** Self
- **Request Body:** `{ preferences: { channel: "email"|"push"; topic: string; enabled: boolean }[] (required) }`
- **Response:** `ApiSuccess<NotificationPreferenceDTO[]>`
- **Status Codes:** `200` · `422` (unknown `topic`)

---

## 13. Audit Logs

### `GET /v1/audit-logs`
- **Description:** Full accountability trail — who changed what, across every module
  ([database-erd.md](./database-erd.md) §11). Admin-only, and the one resource in this entire
  catalog with no non-admin read path at all — an audit log is only meaningful to the people
  responsible for oversight.
- **Auth:** Role: ADMIN
- **Query params:** `page`, `pageSize`; `sort`: `createdAt` (default, desc); filter: `actorId`,
  `resourceType`, `resourceId`, `from`/`to` (ISO date range)
- **Response:** `ApiSuccess<AuditLogDTO[]>` with `meta`
- **Status Codes:** `200`

### `GET /v1/audit-logs/{id}`
- **Description:** One audit entry's full detail (before/after diff, if captured).
- **Auth:** Role: ADMIN
- **Response:** `ApiSuccess<AuditLogDTO>`
- **Status Codes:** `200` · `404`

**No `POST`/`PATCH`/`DELETE` exists for this resource anywhere in this catalog.** Audit log rows
are written exclusively by the Analytics module consuming domain events
([backend-architecture.md](./backend-architecture.md) §16) — never by direct API write, from any
consumer, at any auth level, including `ADMIN`. An API that could edit its own audit trail would
defeat the entire point of having one.

---

## 14. Full endpoint index

| Method | Path | Auth | Domain |
|---|---|---|---|
| POST | `/v1/auth/register` | Public | Authentication |
| POST | `/v1/auth/login` | Public | Authentication |
| POST | `/v1/auth/refresh` | Public | Authentication |
| POST | `/v1/auth/logout` | Authenticated | Authentication |
| POST | `/v1/auth/verify-email` | Public | Authentication |
| GET | `/v1/auth/me` | Authenticated | Authentication |
| GET | `/v1/users` | Role: ADMIN | Users |
| GET | `/v1/users/{id}` | Role: ADMIN / Self | Users |
| PATCH | `/v1/users/{id}` | Self / Role: ADMIN | Users |
| DELETE | `/v1/users/{id}` | Role: ADMIN | Users |
| PUT | `/v1/users/{id}/roles` | Role: ADMIN | Users |
| GET | `/v1/teams` | Public | Teams |
| GET | `/v1/teams/{slug}` | Public | Teams |
| POST | `/v1/teams` | Role: ADMIN | Teams |
| PATCH | `/v1/teams/{id}` | Role: ADMIN | Teams |
| DELETE | `/v1/teams/{id}` | Role: ADMIN | Teams |
| GET | `/v1/teams/{slug}/players` | Public | Teams |
| GET | `/v1/teams/{slug}/games` | Public | Teams |
| GET | `/v1/players` | Public | Players |
| GET | `/v1/players/{id}` | Public | Players |
| POST | `/v1/players` | Role: ADMIN | Players |
| PATCH | `/v1/players/{id}` | Role: ADMIN | Players |
| DELETE | `/v1/players/{id}` | Role: ADMIN | Players |
| GET | `/v1/players/{id}/stats` | Public | Players |
| GET | `/v1/games` | Public | Games |
| GET | `/v1/games/{id}` | Public | Games |
| POST | `/v1/games` | Role: ADMIN | Games |
| PATCH | `/v1/games/{id}` | Role: ADMIN | Games |
| GET | `/v1/games/{id}/events` | Public | Games |
| POST | `/v1/games/{id}/events` | Role: ADMIN | Games |
| GET | `/v1/standings` | Public | Standings |
| GET | `/v1/stats/players` | Public | Statistics |
| GET | `/v1/stats/goalies` | Public | Statistics |
| GET | `/v1/stats/teams` | Public | Statistics |
| GET | `/v1/news` | Public | News |
| GET | `/v1/news/{slug}` | Public | News |
| POST | `/v1/news` | Role: EDITOR+ | News |
| PATCH | `/v1/news/{id}` | Role: EDITOR+ | News |
| DELETE | `/v1/news/{id}` | Role: EDITOR+ | News |
| GET | `/v1/news/categories` | Public | News |
| GET | `/v1/media` | Public | Media |
| GET | `/v1/media/{id}` | Public | Media |
| POST | `/v1/media/upload-url` | Role: EDITOR+ | Media |
| POST | `/v1/media` | Role: EDITOR+ | Media |
| DELETE | `/v1/media/{id}` | Role: EDITOR+ | Media |
| GET | `/v1/sponsors` | Public | Sponsors |
| POST | `/v1/sponsors` | Role: ADMIN | Sponsors |
| PATCH | `/v1/sponsors/{id}` | Role: ADMIN | Sponsors |
| DELETE | `/v1/sponsors/{id}` | Role: ADMIN | Sponsors |
| GET | `/v1/notifications` | Self | Notifications |
| PATCH | `/v1/notifications/{id}/read` | Self | Notifications |
| PATCH | `/v1/notifications/read-all` | Self | Notifications |
| GET | `/v1/notifications/preferences` | Self | Notifications |
| PUT | `/v1/notifications/preferences` | Self | Notifications |
| GET | `/v1/audit-logs` | Role: ADMIN | Audit Logs |
| GET | `/v1/audit-logs/{id}` | Role: ADMIN | Audit Logs |

56 endpoints total.

---

## 15. Consumer-specific notes

- **Public website (`apps/web`)** consumes almost everything above at `Public` or `Self` level;
  it never calls `Role: ADMIN`/`Role: EDITOR+` endpoints — those exist for `apps/admin`.
- **Admin CMS (`apps/admin`, Phase 4)** is the primary consumer of every write endpoint (`POST`/
  `PATCH`/`DELETE`) and of `/v1/audit-logs`. It reuses the exact same `v1` contract rather than a
  parallel admin-only API, per [api-guidelines.md](./api-guidelines.md)'s existing "same read
  endpoints, plus authenticated writes under the same namespace" decision.
- **Mobile app / public API (`apps/mobile-api`, Future phase)** is the reason `/v1/auth/login`
  branches on `client` and why `/v1/auth/refresh` exists at all — a browser doesn't need either,
  Auth.js's session cookie already covers it. Everything else in this catalog is consumed
  identically by mobile as by web; no mobile-specific endpoint shape exists anywhere in this
  design, deliberately, per [backend-architecture.md](./backend-architecture.md) §10's stance
  against a speculative BFF/gateway layer until a real shape mismatch appears.
- **Third-party public API consumers** (Future phase, API-key auth) get read-only access to the
  same `Public`-level endpoints in this catalog, scoped and rate-limited per key (§1.9) — no
  additional endpoints are needed to "expose" data publicly, since everything a third party would
  want is already `Public` by design; going live is a matter of API-key issuance and rate-limit
  policy, not new API surface.
