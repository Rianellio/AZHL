# AZHL Platform — Event-Driven Architecture & Event Catalog (Design Only)

**Status: design document only.** No `EventBus` implementation, publisher, or consumer described
here exists yet. This document is the concrete event catalog that
[backend-architecture.md](./backend-architecture.md) §4–§5 promised but only sketched (7 starter
events, illustrating the envelope/interface shape) — this doc is the full catalog for
implementation to build against, in the same target-state spirit as
[database-erd.md](./database-erd.md) and [api-specification.md](./api-specification.md). Nothing
here is authorized to build ahead of its feature's phase in [roadmap.md](./roadmap.md).

This document does not redefine the `DomainEvent` envelope or the `EventBus` interface — both are
already specified in [backend-architecture.md](./backend-architecture.md) §4 and used exactly as
written. It does not redefine module boundaries — §2 of that same document is still authoritative
for who owns what. What's new here: every event that crosses a module boundary in this platform,
fully specified, plus the shared policy framework (retry/priority/persistence/idempotency tiers)
that makes documenting 35 events tractable without reinventing a policy per event.

**Each entry's "Producer" is not just documentation.** Per
[ADR-002: Event Bus Trust Model](../docs/adr/ADR-002-event-bus-trust.md), the Producer named for
each event below is the source data for `EVENT_PUBLISHER_ALLOWLIST` — the enforced, technical
allow-list of which module may actually publish that event type. This catalog and that allow-list
describe one fact each; keep them in sync (ADR-002's Tradeoffs section recommends generating the
allow-list from this document, or a shared source, rather than hand-maintaining both).

Primary owner: **Chief Architect** + **Backend Engineer** agents.

---

## Table of contents

1. [Reminder: the rule this whole document exists to serve](#1-reminder-the-rule-this-whole-document-exists-to-serve)
2. [Policy framework (read before any event below)](#2-policy-framework)
3. [A note on `notification.requested`: command dressed as event](#3-a-note-on-notificationrequested-command-dressed-as-event)
4. [Event catalog — Identity](#4-event-catalog--identity)
5. [Event catalog — Competition](#5-event-catalog--competition)
6. [Event catalog — Game Operations](#6-event-catalog--game-operations)
7. [Event catalog — Statistics](#7-event-catalog--statistics)
8. [Event catalog — Content](#8-event-catalog--content)
9. [Event catalog — Media](#9-event-catalog--media)
10. [Event catalog — Notifications](#10-event-catalog--notifications)
11. [Full catalog index](#11-full-catalog-index)
12. [What Analytics and Audit Logs do with all of this](#12-what-analytics-and-audit-logs-do-with-all-of-this)

---

## 1. Reminder: the rule this whole document exists to serve

**Business modules must never communicate directly.** Every cross-module effect in this platform
happens because a module published one of the events below and another module chose, on its own,
to react. Game Operations does not know Statistics exists. Statistics does not call Game
Operations to ask "did anything happen?" — it only ever reacts to `game.finished`/`game.goal_scored`
arriving on the bus. If a future feature seems to need module A to call module B directly, that's
a sign either the interaction should be an event, or (per
[backend-architecture.md](./backend-architecture.md) §3 rule 2) it's a synchronous read that
belongs behind B's public interface — never a new direct dependency.

---

## 2. Policy framework

Defined once; every event in §4–§10 states only its **tier**, not a re-explanation of what the
tier means.

### 2.1 Priority tiers

| Tier | Meaning | Applies to |
|---|---|---|
| **P0 — Live** | Sub-second delivery matters; feeds an actively-open live-game UI | `game.started`, `game.goal_scored`, `game.penalty_called` |
| **P1 — High** | Should process within seconds; user- or trust-impacting | `game.finished`, `game.postponed`, `player.transferred`, `user.password_reset_requested`, `notification.requested` |
| **P2 — Normal** | Default — processes in the bus's normal throughput, no special latency guarantee | everything not listed above or below |

No P3/"low" tier exists in this catalog — a live sports platform has no event where "processes
whenever, hours later is fine" is actually true; if one is added later that genuinely fits that
description, add the tier then rather than forcing today's events into an unused one.

### 2.2 Retry policy tiers

| Tier | Policy | Applies to |
|---|---|---|
| **RT-Live** | At most **1** immediate retry, no backoff, then drop (no DLQ) | every **P0** event |
| **RT-Standard** | 3 attempts, exponential backoff (1s, 5s, 25s), then dead-letter queue + ops alert | the default — every event not listed under RT-Live or RT-Strict |
| **RT-Strict** | 5 attempts, backoff up to a longer ceiling (1s, 5s, 25s, 2m, 10m), then DLQ + **page**, not just log | `user.password_reset_requested`, `user.registered` (its welcome-email/verification side effect), `notification.requested` for security-relevant topics |

**Why P0 events get the *weakest* retry policy, not the strongest — this is deliberate, not an
oversight.** A live game's UI needs its *next* update more than it needs a guaranteed-delivered
*old* one — retrying a stale goal-scored event with backoff risks delivering out-of-order state to
a screen the user is watching live. The correct backstop for a dropped P0 event isn't
retry-until-success, it's **client-side reconciliation**: every P0 consumer (a live scoreboard
component, a live game page) also polls the authoritative current game state on a short interval
(e.g. every 15–30s) as a self-healing floor underneath the push-based fast path. Document this
explicitly per P0 consumer when implementation starts — it's what makes "drop after one retry"
safe rather than lossy.

### 2.3 Failure handling

- **RT-Standard/RT-Strict exhaustion** → the message moves to a dead-letter queue
  (BullMQ per module today, a `<topic>.dlq` Kafka topic later, per
  [backend-architecture.md](./backend-architecture.md) §5/§9) and fires an ops alert. A DLQ
  message is never silently dropped or auto-retried forever.
- **RT-Live exhaustion** → dropped, by design (§2.2) — logged at `warn`, not escalated, because the
  reconciliation floor is expected to correct it within one polling interval.
- **Self-healing read models:** any event whose consumer maintains a derived/materialized table
  (Statistics' `standings`, `player_season_stats`, etc. — see
  [database-erd.md](./database-erd.md) §7) should have a **scheduled reconciliation job**
  (BullMQ repeatable job) that recomputes the same read model directly from source tables
  (`games`, `game_events`) independent of the event stream, running infrequently (e.g. nightly).
  This means a permanently-lost `game.finished` event (DLQ exhausted, nobody noticed) self-heals
  by morning rather than leaving standings wrong indefinitely — a real production safety net for
  exactly the kind of "what if the bus drops something" question Stage 1's non-durable
  `InMemoryEventBus` raises.

### 2.4 Idempotency

- **Default:** every consumer checks the envelope's `DomainEvent.id`
  ([backend-architecture.md](./backend-architecture.md) §4) against a processed-IDs store (Redis
  `SET`, per [backend-architecture.md](./backend-architecture.md) §8) before acting, and skips if
  already seen. This alone handles Kafka's at-least-once redelivery (Stage 3).
- **Business-key idempotency (stronger, for specific events):** envelope-ID dedup only catches
  *exact* redelivery of the *same* message. It does **not** catch a producer that, after a partial
  failure, publishes a *new* event (new `id`) describing the *same* underlying fact. Events whose
  side effect is user-visible and annoying to duplicate (most notably anything feeding
  `notification.requested`/`notification.sent`) additionally dedup on a **business key** — e.g.
  `(userId, topic, referenceId)` for a notification, so a user is never sent "your team just
  scored" twice even if two slightly-different `game.goal_scored` events reference the same goal
  due to an upstream retry. Called out per event below where it applies.

### 2.5 Persistence

| Tier | Meaning |
|---|---|
| **Durable-independent** | The underlying fact already lives in a real table, independent of the bus — losing the *event* only delays/loses a *side effect* (a notification, a cache refresh), never the fact itself, and §2.3's reconciliation job closes even that gap |
| **Bus-only** | The event itself is the only record of "this happened"; nothing independently durable backs it |

Marked per event below. Nearly everything in this catalog is **durable-independent**, because
nearly every event corresponds to a row already being written in
[database-erd.md](./database-erd.md)'s schema as part of the same operation that triggers the
publish — this is intentional design, not luck: **publish only after the write that makes the fact
true has committed**, never before, so the source of truth never depends on the bus succeeding.

---

## 3. A note on `notification.requested`: command dressed as event

Worth flagging on its own, since it's semantically different from every other event in this
catalog even though it travels the same `EventBus`. `game.finished` announces a fact that already
happened — Game Operations doesn't care what (if anything) happens next. `notification.requested`
is different: another module publishes it specifically **because** it wants the Notifications
module to do something (decide channel, compose a message, send it). That's a *command* wearing
an *event*'s clothing — a common, generally-fine pattern (it keeps the publishing module from
having a direct dependency on Notifications, preserving rule 1), but worth naming explicitly so a
future reader doesn't assume every event in this catalog is equally "fire and forget, nobody's
depending on this being acted on." `notification.requested` is the one exception where a
publisher *does* have an expectation, even though the transport doesn't guarantee it the way a
direct function call would.

---

## 4. Event catalog — Identity

### `user.registered`
- **Producer:** Identity
- **Consumers:** Notifications (welcome email), Analytics
- **Payload:** `{ userId, email, displayName, registeredAt }`
- **Priority:** P1 · **Retry:** RT-Strict · **Persistence:** Durable-independent (`identity.users`
  row already committed)
- **Idempotency:** envelope-ID dedup sufficient — registration is a one-time fact per user

### `user.email_verified`
- **Producer:** Identity
- **Consumers:** Notifications, Analytics
- **Payload:** `{ userId, verifiedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `user.password_reset_requested`
- **Producer:** Identity
- **Consumers:** Notifications (send the reset email — this is the other clear
  command-flavored event alongside `notification.requested`, see §3's reasoning)
- **Payload:** `{ userId, email, resetToken (opaque, single-use), requestedAt, expiresAt }`
- **Priority:** P1 · **Retry:** RT-Strict (a silently-undelivered reset email is a support/security
  problem) · **Persistence:** Bus-only for the event itself, though the token's existence is
  tracked in `identity.verification_tokens` — **the token payload is sensitive**: never logged in
  full by any consumer, never included in `analytics.audit_logs` beyond "a reset was requested for
  user X at time Y"
- **Idempotency:** business-key dedup on `(userId)` within a short window (e.g. 5 minutes) — a
  user double-clicking "forgot password" shouldn't trigger two emails with two different valid
  tokens

### `user.password_changed`
- **Producer:** Identity
- **Consumers:** Notifications (security notice: "your password was changed"), Analytics
- **Payload:** `{ userId, changedAt }` — never the password or its hash, obviously
- **Priority:** P1 · **Retry:** RT-Strict · **Persistence:** Durable-independent

### `user.roles_changed`
- **Producer:** Identity
- **Consumers:** Analytics (audit trail — a role change is exactly the kind of thing
  `analytics.audit_logs` exists for, per [database-erd.md](./database-erd.md) §11)
- **Payload:** `{ userId, previousRoles, newRoles, changedByUserId, changedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent
  (`identity.user_roles` already committed)

### `user.deactivated`
- **Producer:** Identity
- **Consumers:** Notifications (cancel any pending sends to this user), Analytics
- **Payload:** `{ userId, deactivatedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent (`deleted_at`
  already set)

---

## 5. Event catalog — Competition

### `team.created`
- **Producer:** Competition
- **Consumers:** Statistics (initialize a zeroed standings row for the current season), Analytics
- **Payload:** `{ teamId, leagueId, name, slug, abbreviation, createdAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `team.updated`
- **Producer:** Competition
- **Consumers:** Analytics; no other module holds a denormalized copy of team display data today
  (per [backend-architecture.md](./backend-architecture.md) rule 2, anything needing current team
  info reads it live rather than caching a copy) — kept as an event anyway, not skipped, because a
  future consumer (e.g. a CDN cache-invalidation module) is exactly the kind of thing this bus
  exists to make addable without touching Competition
- **Payload:** `{ teamId, changedFields: string[], updatedAt }` — a diff-shaped payload (changed
  field names only, not full before/after) since most consumers only care *that* something
  changed, not the specifics; a consumer needing detail reads live via rule 2
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `team.deactivated`
- **Producer:** Competition
- **Consumers:** Statistics, Notifications (nothing to send here today, but a folded team is
  exactly the kind of fact a future "league news" auto-post would want), Analytics
- **Payload:** `{ teamId, deactivatedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `player.created`
- **Producer:** Competition
- **Consumers:** Statistics (initialize a zeroed season-stats row), Analytics
- **Payload:** `{ playerId, personId, teamId, jerseyNumber, position, createdAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `player.updated`
- **Producer:** Competition
- **Consumers:** Analytics
- **Payload:** `{ playerId, changedFields: string[], updatedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `player.transferred`
- **Producer:** Competition
- **Consumers:** Statistics (re-attribute in-progress season stats to the new team where the
  product wants that — a real design decision for whoever implements this, not decided here),
  Notifications (notify followers of both the old and new team), Analytics
- **Payload:** `{ playerId, previousTeamId, newTeamId, transferredAt }`
- **Priority:** P1 (user-visible, time-sensitive news) · **Retry:** RT-Standard · **Persistence:**
  Durable-independent

### `player.retired`
- **Producer:** Competition
- **Consumers:** Statistics, Notifications, Analytics
- **Payload:** `{ playerId, retiredAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `coach.assigned`
- **Producer:** Competition
- **Consumers:** Notifications, Analytics
- **Payload:** `{ coachId, personId, teamId, assignedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `season.started`
- **Producer:** Competition
- **Consumers:** Statistics (create zeroed standings rows for every team), Notifications,
  Analytics
- **Payload:** `{ seasonId, leagueId, label, startDate, endDate, startedAt }`
- **Priority:** P1 (drives real UI state changes — "no season yet" messaging across the whole
  platform flips on this one event) · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `season.finished`
- **Producer:** Competition
- **Consumers:** Statistics (finalize/freeze final standings), Content (auto-draft a season-recap
  prompt for an editor — a real, small, useful automation), Notifications, Analytics
- **Payload:** `{ seasonId, finishedAt }`
- **Priority:** P1 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `sponsor.added`
- **Producer:** Competition
- **Consumers:** Analytics
- **Payload:** `{ sponsorId, name, tier, teamId (nullable), addedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `sponsor.removed`
- **Producer:** Competition
- **Consumers:** Analytics
- **Payload:** `{ sponsorId, removedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

---

## 6. Event catalog — Game Operations

### `game.created`
- **Producer:** Game Operations
- **Consumers:** Notifications (schedule announcement, if the product wants that), Analytics
- **Payload:** `{ gameId, seasonId, homeTeamId, awayTeamId, startTime, venue, createdAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `game.started`
- **Producer:** Game Operations
- **Consumers:** Notifications (optional "game is live" push), Analytics — and, per
  [backend-architecture.md](./backend-architecture.md) §8, the Realtime Gateway, which relays it to
  Redis Pub/Sub for connected live-game UIs
- **Payload:** `{ gameId, startedAt }`
- **Priority:** **P0** · **Retry:** RT-Live · **Persistence:** Durable-independent (`games.status`
  already updated to `LIVE`)

### `game.finished`
- **Producer:** Game Operations
- **Consumers:** Statistics (recompute standings/season stats), Notifications, Analytics
- **Payload:** `{ gameId, seasonId, homeTeamId, homeTeamName, awayTeamId, awayTeamName, homeScore, awayScore, finishedAt }`
  — team names are denormalized into the payload (not just IDs) precisely so Notifications can
  compose "Qartal 4, Ulduz 2 — Final" without a synchronous callback into Competition, per
  [backend-architecture.md](./backend-architecture.md) rule 3/4
- **Priority:** P1 · **Retry:** RT-Standard (not RT-Live — by the time a game is *finished*, the
  live-latency argument no longer applies; a slightly-delayed standings recompute is fine) ·
  **Persistence:** Durable-independent

### `game.postponed`
- **Producer:** Game Operations
- **Consumers:** Notifications, Analytics
- **Payload:** `{ gameId, previousStartTime, reason (optional, free text), postponedAt }`
- **Priority:** P1 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `game.goal_scored`
- **Producer:** Game Operations
- **Consumers:** Notifications (live-alert subscribers), Analytics, Realtime Gateway (§8 fan-out,
  same as `game.started`)
- **Payload:** `{ gameId, gameEventId, teamId, playerId, playerName, period, gameClock, homeScoreAfter, awayScoreAfter, occurredAt }`
  — again denormalized (`playerName`) for the same reason as `game.finished`
- **Priority:** **P0** · **Retry:** RT-Live · **Persistence:** Durable-independent
  (`game_operations.game_events` row already committed, per
  [database-erd.md](./database-erd.md) §6 — this is the canonical example of "losing the *event*
  never loses the *fact*")

### `game.penalty_called`
- **Producer:** Game Operations
- **Consumers:** Notifications, Analytics, Realtime Gateway
- **Payload:** `{ gameId, gameEventId, teamId, playerId, playerName, infraction, minutes, period, gameClock, occurredAt }`
- **Priority:** **P0** · **Retry:** RT-Live · **Persistence:** Durable-independent

---

## 7. Event catalog — Statistics

Statistics is mostly a *consumer* (§6's events are what it reacts to), but it publishes its own
events after recomputing a read model — the "I've changed, anyone who cached me should refresh"
signal, which is what makes it a real CQRS read-model owner rather than a dead end.

### `standings.updated`
- **Producer:** Statistics
- **Consumers:** Analytics; a future edge-cache-invalidation module (`/standings`'s ISR tag,
  per [architecture.md](./architecture.md)'s revalidation strategy, is exactly what this event
  would trigger once that integration is built)
- **Payload:** `{ seasonId, updatedAt }` — deliberately thin; a consumer that needs the actual
  numbers reads them live (rule 2), this event is purely "go refresh your view of this"
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Bus-only (the durable fact is the
  `statistics.standings` rows themselves, already written before this publishes)

### `player_season_stats.updated`
- **Producer:** Statistics
- **Consumers:** Analytics, future cache-invalidation
- **Payload:** `{ seasonId, playerId, updatedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Bus-only

### `goalie_season_stats.updated`
- **Producer:** Statistics
- **Consumers:** Analytics, future cache-invalidation
- **Payload:** `{ seasonId, playerId, updatedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Bus-only

---

## 8. Event catalog — Content

### `news.published`
- **Producer:** Content
- **Consumers:** Notifications (breaking-news push/email to subscribed fans), Analytics
- **Payload:** `{ articleId, slug, title, excerpt, categoryIds, publishedAt }`
- **Priority:** P1 (fans expect near-immediate notification for breaking news) · **Retry:**
  RT-Standard · **Persistence:** Durable-independent

### `news.updated`
- **Producer:** Content
- **Consumers:** Analytics
- **Payload:** `{ articleId, changedFields: string[], updatedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `news.unpublished`
- **Producer:** Content
- **Consumers:** Notifications (retract a not-yet-delivered push if one is still queued —
  a real, small race worth designing for explicitly: check the BullMQ job for the corresponding
  `news.published` notification hasn't already fired before this arrives), Analytics
- **Payload:** `{ articleId, unpublishedAt }`
- **Priority:** P1 · **Retry:** RT-Standard · **Persistence:** Durable-independent

---

## 9. Event catalog — Media

### `media.uploaded`
- **Producer:** Media
- **Consumers:** Content (attach to an article, if the upload was initiated from that flow),
  Analytics
- **Payload:** `{ assetId, type: "photo"|"video", url, teamId?, playerId?, gameId?, newsArticleId?, uploadedByUserId, uploadedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

### `media.deleted`
- **Producer:** Media
- **Consumers:** Content (detach any reference to a now-removed asset), Analytics
- **Payload:** `{ assetId, deletedAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent

---

## 10. Event catalog — Notifications

### `notification.requested`
*(see §3 — this is the command-flavored one)*
- **Producer:** any module wanting a user notified (Competition, Game Operations, Content, Identity
  — never Notifications itself)
- **Consumers:** Notifications (the only consumer, by design — it decides channel/template/opt-in
  status and enqueues the actual send via its own BullMQ queue,
  [backend-architecture.md](./backend-architecture.md) §9)
- **Payload:** `{ userId, topic (e.g. "game.finished", "news.published"), referenceId (the ID of
  the thing this is about — a gameId, an articleId), context (small object with just enough
  denormalized data to compose a message — team names, article title), requestedAt }`
- **Priority:** P1 · **Retry:** RT-Strict · **Persistence:** Bus-only (this event *is* the request
  — there's no independent "request" row; what gets persisted is the resulting `notifications` row
  once Notifications acts on it)
- **Idempotency:** **business-key**, `(userId, topic, referenceId)` — this is the event where
  business-key dedup matters most in the whole catalog (§2.4); without it, a retried publisher
  double-notifying a user is the single most visible, most annoying failure mode this whole
  document is trying to design away

### `notification.sent`
- **Producer:** Notifications
- **Consumers:** Analytics
- **Payload:** `{ notificationId, userId, channel: "email"|"push", topic, sentAt }`
- **Priority:** P2 · **Retry:** RT-Standard · **Persistence:** Durable-independent
  (`notifications.notifications` row already committed)

### `notification.failed`
- **Producer:** Notifications
- **Consumers:** Analytics (and, practically, an ops alert — a failed send after
  `notification.requested`'s own RT-Strict exhaustion is exactly the kind of thing worth paging on
  if it clusters, per §2.3)
- **Payload:** `{ notificationId, userId, channel, topic, reason, failedAt }`
- **Priority:** P2 · **Retry:** RT-Standard (this event *reports* a failure, it doesn't need its
  own aggressive retry — the failure already happened) · **Persistence:** Durable-independent

---

## 11. Full catalog index

| Event | Producer | Priority | Retry | Persistence |
|---|---|---|---|---|
| `user.registered` | Identity | P1 | RT-Strict | Durable-independent |
| `user.email_verified` | Identity | P2 | RT-Standard | Durable-independent |
| `user.password_reset_requested` | Identity | P1 | RT-Strict | Bus-only |
| `user.password_changed` | Identity | P1 | RT-Strict | Durable-independent |
| `user.roles_changed` | Identity | P2 | RT-Standard | Durable-independent |
| `user.deactivated` | Identity | P2 | RT-Standard | Durable-independent |
| `team.created` | Competition | P2 | RT-Standard | Durable-independent |
| `team.updated` | Competition | P2 | RT-Standard | Durable-independent |
| `team.deactivated` | Competition | P2 | RT-Standard | Durable-independent |
| `player.created` | Competition | P2 | RT-Standard | Durable-independent |
| `player.updated` | Competition | P2 | RT-Standard | Durable-independent |
| `player.transferred` | Competition | P1 | RT-Standard | Durable-independent |
| `player.retired` | Competition | P2 | RT-Standard | Durable-independent |
| `coach.assigned` | Competition | P2 | RT-Standard | Durable-independent |
| `season.started` | Competition | P1 | RT-Standard | Durable-independent |
| `season.finished` | Competition | P1 | RT-Standard | Durable-independent |
| `sponsor.added` | Competition | P2 | RT-Standard | Durable-independent |
| `sponsor.removed` | Competition | P2 | RT-Standard | Durable-independent |
| `game.created` | Game Operations | P2 | RT-Standard | Durable-independent |
| `game.started` | Game Operations | **P0** | RT-Live | Durable-independent |
| `game.finished` | Game Operations | P1 | RT-Standard | Durable-independent |
| `game.postponed` | Game Operations | P1 | RT-Standard | Durable-independent |
| `game.goal_scored` | Game Operations | **P0** | RT-Live | Durable-independent |
| `game.penalty_called` | Game Operations | **P0** | RT-Live | Durable-independent |
| `standings.updated` | Statistics | P2 | RT-Standard | Bus-only |
| `player_season_stats.updated` | Statistics | P2 | RT-Standard | Bus-only |
| `goalie_season_stats.updated` | Statistics | P2 | RT-Standard | Bus-only |
| `news.published` | Content | P1 | RT-Standard | Durable-independent |
| `news.updated` | Content | P2 | RT-Standard | Durable-independent |
| `news.unpublished` | Content | P1 | RT-Standard | Durable-independent |
| `media.uploaded` | Media | P2 | RT-Standard | Durable-independent |
| `media.deleted` | Media | P2 | RT-Standard | Durable-independent |
| `notification.requested` | *(any module)* | P1 | RT-Strict | Bus-only |
| `notification.sent` | Notifications | P2 | RT-Standard | Durable-independent |
| `notification.failed` | Notifications | P2 | RT-Standard | Durable-independent |

35 events total.

---

## 12. What Analytics and Audit Logs do with all of this

**Analytics subscribes to every single event in this catalog** — it's the one module named as a
consumer on nearly every entry above, by design
([backend-architecture.md](./backend-architecture.md) §2: "if Analytics disappeared for an hour,
no other module's correctness would be affected"). It has no events of its own to publish; it's a
sink, not a participant in the request-serving graph.

**`analytics.audit_logs`** ([database-erd.md](./database-erd.md) §11) is populated from a specific
*subset* of this catalog — not everything, only events representing a **write performed by an
identifiable actor** worth being accountable for: `user.roles_changed`, `team.updated`,
`player.transferred`, `news.published`/`updated`/`unpublished`, `media.uploaded`/`deleted`,
`sponsor.added`/`removed`, and any future `ADMIN`/`EDITOR`-driven write. Purely system-derived
events (`standings.updated`, `*_stats.updated`) do **not** produce audit log rows — there's no
human actor to hold accountable for a recomputation, and logging every one would drown genuinely
actionable entries in noise. This filter lives in Analytics' own event-handler logic, not as a
special case anywhere else in the bus.
