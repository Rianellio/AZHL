# AZHL Platform — Production Observability Architecture (Design Only)

**Status: design document only.** No logger, metric, trace, dashboard, or alert described here is
implemented. This document is the full observability design that
[backend-architecture.md](./backend-architecture.md) §13 (Logging) and
[bullmq-architecture.md](./bullmq-architecture.md) §14 (per-queue monitoring) only partially
sketched — this doc is the platform-wide superset: every log, metric, trace, health check, and
alert across every module, not just queues. It doesn't re-decide the `correlationId`
propagation model already established in
[backend-architecture.md](./backend-architecture.md) §4/§13 or the audit-log design in
[database-erd.md](./database-erd.md) §11/[security-architecture.md](./security-architecture.md)
§14 — both are load-bearing inputs here, not redesigned. Nothing here is authorized to provision
ahead of its feature's phase in [roadmap.md](./roadmap.md).

Primary owner: **DevOps Engineer** + **Backend Engineer** agents, with **Security Engineer**
reviewing §3/§8 (traces and error reports are exactly the kind of place PII/secrets accidentally
leak).

---

## Table of contents

1. [How these pieces fit together](#1-how-these-pieces-fit-together)
2. [Logging](#2-logging)
3. [Request tracking](#3-request-tracking)
4. [Metrics](#4-metrics)
5. [Prometheus](#5-prometheus)
6. [Grafana](#6-grafana)
7. [Tracing](#7-tracing)
8. [Error reporting](#8-error-reporting)
9. [Health checks](#9-health-checks)
10. [Alerting](#10-alerting)
11. [Audit logs](#11-audit-logs)
12. [Performance monitoring](#12-performance-monitoring)
13. [Future: distributed tracing](#13-future-distributed-tracing)

---

## 1. How these pieces fit together

Four distinct signal types, each answering a different question, deliberately not merged into one
system:

| Signal | Answers | Tool |
|---|---|---|
| **Logs** (§2) | "What exactly happened, in this one request/job?" | Structured JSON → log aggregator |
| **Metrics** (§4/§5) | "How is the system behaving, in aggregate, over time?" | Prometheus |
| **Traces** (§7) | "Where did the time go, across every step of one specific request?" | OpenTelemetry |
| **Errors** (§8) | "What broke, and how many people did it affect?" | Sentry-style aggregator |

All four are tied together by the same `correlationId`
([backend-architecture.md](./backend-architecture.md) §4/§13) — one identifier, generated once per
inbound request or triggering event, threaded through every log line, every trace span, every job,
and every error report it causes. This is the single design decision that makes "why did this user's
action fail" answerable by looking things up once, in any of the four systems, rather than
correlating timestamps by hand across all of them.

---

## 2. Logging

Restates and extends [backend-architecture.md](./backend-architecture.md) §13:

- **Structured JSON, one object per line** — every field machine-parseable, never a formatted
  string a human has to regex apart. Minimum fields on every line: `timestamp`, `level`,
  `message`, `correlationId`, `module` (which of
  [backend-architecture.md](./backend-architecture.md) §2's modules emitted it), plus
  event-specific fields (`eventId`, `jobId`, `userId` where applicable).
- **Levels**, restated: `debug` (local dev only, never shipped to production's aggregator),
  `info` (normal operation — request completed, event published/consumed, job succeeded), `warn`
  (recovered automatically — a retried job, a dropped P0 event per
  [event-catalog.md](./event-catalog.md) §2.2), `error` (needs a human, eventually surfaces in §8).
- **Never logged, on any level, by any module** — restated as a hard line from
  [security-architecture.md](./security-architecture.md): passwords/hashes, refresh/access token
  values, API keys, 2FA secrets/backup codes, full credit-card-adjacent data (not applicable yet,
  but the rule holds pre-emptively for Commerce, [backend-architecture.md](./backend-architecture.md)
  §2). A log line needing to reference one of these logs its *presence*, never its *value*
  (`"passwordResetToken": "[present]"`, not the token itself).
- **Sink:** stdout in local dev (zero setup, human-readable); a real aggregator in production
  (concrete choice — Axiom/Grafana Loki/Datadog — deferred to implementation time, not decided
  here) behind the same `Logger` interface [backend-architecture.md](./backend-architecture.md)
  §13 already specifies, so the sink is a configuration change, never a code change.
- **Retention:** operational logs (`info`/`warn`/`error`) kept on a cost-bounded rolling window
  (e.g. 30–90 days, tuned at implementation time); this is explicitly *not* the platform's
  accountability record — that's §11's `audit_logs`, retained far longer and immutable, precisely
  so a compliance/legal retention need is never accidentally dependent on the operational log
  aggregator's cost-driven rolling window.

---

## 3. Request tracking

- **Every inbound request is assigned a `correlationId` at the earliest possible point** — read
  from an incoming `X-Request-Id` (or W3C `traceparent`, §7/§13) header if the caller already
  supplies one (a mobile client retrying a request should be able to carry its own ID through),
  generated fresh otherwise.
- **Propagated through the entire lifecycle of that request**: every log line it causes (§2), the
  domain event(s) it triggers as that event's own `correlationId`
  ([backend-architecture.md](./backend-architecture.md) §4 — an HTTP request that ends in
  publishing `game.finished` hands its `correlationId` to that event, so the whole downstream fan-out
  to Statistics/Notifications/Analytics traces back to the one request that started it), and any
  BullMQ job enqueued as a result ([bullmq-architecture.md](./bullmq-architecture.md) §14 already
  specified this for queue-level monitoring; this section is the platform-wide version of the same
  rule).
- **Returned to the caller** in the response (`X-Request-Id` header) — so a user/support ticket
  reporting "this specific request failed" can hand back an ID that's immediately look-up-able
  across every signal in §1's table, not just logs.

---

## 4. Metrics

Two complementary methodologies, applied to the two kinds of thing this platform has:

- **RED method for every request-serving surface** (API routes, per
  [api-specification.md](./api-specification.md)): **R**ate (requests/sec, per route), **E**rrors
  (error rate, per route, per status-code class), **D**uration (latency histogram, per route —
  feeds §12's percentiles).
- **USE method for every resource** (Postgres, Redis, each BullMQ queue, each worker pool):
  **U**tilization (connection pool usage, CPU/memory per worker instance), **S**aturation (queue
  depth already specified in [bullmq-architecture.md](./bullmq-architecture.md) §14, DB connection
  pool wait time), **E**rrors (failed queries, failed jobs, connection failures).
- **Business metrics, not just infrastructure ones** — a platform-specific layer neither method
  covers by default: games played per day, notifications sent per channel
  ([event-catalog.md](./event-catalog.md) §10), active live-game viewers (feeding
  [backend-architecture.md](./backend-architecture.md) §8's Realtime Gateway capacity planning),
  media uploads processed ([storage-architecture.md](./storage-architecture.md) §4/§5). These
  matter because a technically-healthy system that's silently processing zero real business activity
  is still broken from the product's perspective — infrastructure metrics alone wouldn't catch that.

---

## 5. Prometheus

- **Every deployable exposes its own `/metrics` endpoint** in Prometheus's text exposition format
  — `apps/web`, the BullMQ worker deployment
  ([bullmq-architecture.md](./bullmq-architecture.md) §2), and (Future phase) `apps/admin`/
  `apps/mobile-api` each expose their own, scraped independently — consistent with every app being
  its own deployable per [architecture.md](./architecture.md)'s blast-radius reasoning.
- **`/metrics` is never publicly reachable** — it exposes internal topology, request volume, and
  business-activity counts that a public endpoint shouldn't leak (an unauthenticated observer could
  infer real-time site traffic, or worse, exactly when a live game is drawing a crowd, from a public
  metrics feed). Scraped only from Prometheus's own network position (internal network / IP
  allowlist / auth on the scrape itself), never exposed the way the actual public API is.
- **Metric naming** follows Prometheus convention (`azhl_http_requests_total`,
  `azhl_queue_depth{queue="media.video.process"}`, `azhl_notifications_sent_total{channel="email"}`)
  — a consistent `azhl_` prefix and label-based dimensions (queue name, route, channel) rather than
  a different metric name per dimension value, so Grafana queries (§6) can aggregate/filter instead
  of hardcoding a panel per queue.

---

## 6. Grafana

- **One dashboard per module** ([backend-architecture.md](./backend-architecture.md) §2 — Identity,
  Competition, Game Operations, Statistics, Content, Media, Notifications, Analytics), each showing
  that module's own RED/USE metrics — matches the module boundary everywhere else in this design
  series, so "which dashboard do I check" is never ambiguous.
- **One platform-overview dashboard**: aggregate request rate/error rate across all of `apps/web`,
  overall queue health (rolled up from [bullmq-architecture.md](./bullmq-architecture.md) §14's
  per-queue metrics), Postgres/Redis top-line health — the first thing an on-call engineer opens,
  designed to answer "is anything on fire" in one glance before drilling into a module-specific
  dashboard.
- **One BullMQ-specific dashboard**: every queue from
  [bullmq-architecture.md](./bullmq-architecture.md) §16's index, depth/failure-rate/oldest-waiting-job
  per queue, DLQ size per queue — the operational complement to Bull Board's own UI (Bull Board
  shows individual jobs; this dashboard shows trends over time, which Bull Board itself doesn't).
- **Dashboards are provisioned as code** (Grafana's JSON dashboard-as-code model), version
  controlled alongside the rest of the platform — a dashboard is infrastructure, not a
  hand-clicked artifact that only exists in one person's browser.

---

## 7. Tracing

- **OpenTelemetry SDK**, instrumenting every deployable — vendor-neutral instrumentation now,
  regardless of which backend (§13) eventually ingests the traces, so the *code* never needs to
  change if the trace *backend* does (same swappable-adapter philosophy as every other pluggable
  piece in this series — Storage, Event Bus, Logger sink).
- **One trace per inbound request**, with a span for: the route handler itself, the module
  function it calls ([backend-architecture.md](./backend-architecture.md) §3 rule 2), the
  database query it issues, and — critically — a span for any domain event published as a result,
  even though that event's *consumers* run asynchronously and outside this trace's synchronous
  request/response window (§13 covers stitching those back together once Kafka exists).
- **`correlationId` (§3) *is* the trace ID** — not a separate identifier maintained in parallel.
  One ID, meaning the same thing in every system in §1's table, is what keeps this whole design
  from becoming four different correlation schemes that all have to be manually cross-referenced.
- **Sampling:** trace every request at low real-world traffic volumes (Stage 1); once volume makes
  100% tracing costly, sample (e.g. trace 100% of errors/slow requests, a smaller percentage of
  fast successful ones) — a tuning decision for implementation time, not fixed here, since it
  depends on real traffic this design can't predict.

---

## 8. Error reporting

- **Every unhandled exception, in any module, in any deployable, is captured** with: the
  `correlationId` (§3), a source-map-resolved stack trace (readable file/line, not a minified
  bundle offset), the module name, and enough request/job context to reproduce — **and nothing
  else**: no request body, no user PII beyond a `userId` reference (never email/name inline in the
  error payload), no secrets — the exact same "never log a secret" rule from §2 applies with even
  more force here, since error-reporting tools are frequently the least access-controlled part of
  an observability stack.
- **Errors are grouped/deduplicated by stack signature**, not reported as N identical individual
  incidents for what is really one bug firing N times — a flood of a thousand identical errors
  should read as "one issue, occurred 1000 times," not bury the on-call engineer under noise that
  looks like a thousand different problems.
- **Release/deploy tracking:** every captured error is tagged with the deploy/commit it occurred
  under, so a spike immediately after a specific deploy is visually obvious (correlates with
  [github-strategy.md](./github-strategy.md)'s commit/PR history) rather than requiring manual
  timestamp correlation against a deploy log.
- **Feeds §10's alerting** — a new, previously-unseen error signature, or a known one crossing a
  volume threshold, is exactly the kind of thing that should page, not just accumulate silently in
  a dashboard nobody's watching.

---

## 9. Health checks

- **Liveness vs. readiness, kept distinct** (the same distinction container orchestrators — and
  Vercel's own health-check model — already expect): **liveness** answers "is this process alive
  at all" (a trivial, dependency-free check — if this fails, the process itself needs restarting);
  **readiness** answers "is this instance currently able to serve real traffic" (checks its actual
  dependencies: can it reach Postgres, can it reach Redis) — an instance can be alive but not
  ready (e.g. Redis is briefly unreachable), and should be pulled from the load balancer's rotation
  in that state without being killed and restarted for a problem restarting won't fix.
- **Every deployable exposes both** — `apps/web`, the worker deployment
  ([bullmq-architecture.md](./bullmq-architecture.md) §2), and future `apps/admin`/`apps/mobile-api`
  each independently, matching the same per-app independence
  [architecture.md](./architecture.md) already establishes for everything else.
- **The worker deployment's readiness check additionally confirms it can reach every queue it's
  configured to serve** — a worker that's up but has silently lost its Redis connection to one
  specific queue should report not-ready, not appear healthy while quietly not processing anything.

---

## 10. Alerting

One alerting *policy*, referenced by every domain that needs to alert — restated as a
consolidation of the alert-worthy conditions already named piecemeal in
[bullmq-architecture.md](./bullmq-architecture.md) §14, [event-catalog.md](./event-catalog.md)
§2.3, and [security-architecture.md](./security-architecture.md), rather than each maintaining its
own separate alerting logic:

| Severity | Response | Example trigger |
|---|---|---|
| **Page (wake someone up)** | Immediate, on-call | Readiness check failing platform-wide; a `Strict`-retry-policy queue's DLQ receives an entry ([bullmq-architecture.md](./bullmq-architecture.md) §4); backup verification fails ([bullmq-architecture.md](./bullmq-architecture.md) §11); error rate crosses a hard threshold |
| **Ticket (business hours)** | Investigated same/next business day | A `Standard`-policy queue's failure rate creeping up but not yet critical; a new (not-yet-triaged) error signature with low volume |
| **Log only (no notification)** | Reviewed during normal dashboard checks | Best-effort job failures ([bullmq-architecture.md](./bullmq-architecture.md) §4); a dropped P0 event ([event-catalog.md](./event-catalog.md) §2.2 — expected, self-healing behavior, not an incident) |

- **Every page includes the `correlationId`/trace link (§3/§7) of a representative failing
  request**, not just "error rate is high" — an on-call engineer's first action shouldn't be
  reproducing the problem from scratch.
- **Alert fatigue is treated as a real failure mode of the alerting system itself** — a threshold
  that pages too often for a condition that turns out to self-heal (§2.3 of
  [event-catalog.md](./event-catalog.md)) gets *demoted* to ticket or log-only, not left paging
  indefinitely "just in case." An alert nobody trusts is worse than no alert.

---

## 11. Audit logs

Fully designed already in [database-erd.md](./database-erd.md) §11 and
[security-architecture.md](./security-architecture.md) §14 — not redesigned here, only placed in
this document's larger picture: `audit_logs` is the one signal in §1's table that is **not**
operational observability. It answers "who is accountable for this," a compliance/security
question, on a retention timeline decoupled from §2's cost-bounded operational log window,
immutable, admin-only — restated here only so it isn't mistaken for "just another log stream" when
read alongside everything else in this document.

---

## 12. Performance monitoring

- **Latency percentiles (p50/p95/p99), not averages, per route** — an average hides exactly the
  slow-tail experience that matters most (a p99 spike affects real users even when the average
  looks fine); fed by §4's Duration histograms, visualized in §6's per-module dashboards.
- **Slow-query logging:** any Postgres query exceeding a threshold (e.g. 200ms) is logged with its
  `correlationId` and the module/service function that issued it — the concrete mechanism that
  turns "the API feels slow sometimes" into "this specific query, called from this specific
  service function, is the one to fix."
- **Core Web Vitals for the actual public website** — this platform is a real user-facing site,
  not just an API; LCP/INP/CLS (Largest Contentful Paint / Interaction to Next Paint / Cumulative
  Layout Shift) are tracked via real-user monitoring (RUM), not just synthetic lab tests, since
  real device/network variance is exactly what a synthetic check in a data center misses.
- **Synthetic uptime/availability checks** from outside the platform's own infrastructure (a
  third-party or independently-hosted prober hitting the public site/API on an interval) — the one
  check that catches a failure mode every internally-hosted signal in this document structurally
  can't: the entire platform being unreachable from the outside world.

---

## 13. Future: distributed tracing

Everything in §7 already works today, in Stage 1's single-process modular monolith, because a
trace's spans all originate from one process. The real distributed-tracing question arrives at
[backend-architecture.md](./backend-architecture.md) §5's Stage 3 (Kafka, module extraction):

- **W3C Trace Context propagates through Kafka message headers**, not just HTTP headers — an event
  published to Kafka carries its `traceparent` (§7, the same value as `correlationId`) as a
  message header, so a consumer running in a *different* service, picking the message up
  *asynchronously*, still attaches its own processing span to the *same* trace the original HTTP
  request started — turning "an HTTP request → an event → three independent services reacting to
  it" into one connected trace instead of four disconnected ones correlated only by matching IDs
  in separate log searches.
- **This is exactly why `correlationId`/trace-ID was designed as one value threading through logs,
  events, and jobs from day one** (§1, §3) — Stage 3 doesn't need a new tracing scheme
  retrofitted onto old data; it needs the existing one carried one hop further, through a
  transport (Kafka headers) that didn't exist yet at Stage 1.
- **Not designed further here** — the concrete backend (Jaeger, Tempo, a vendor APM) and sampling
  strategy at real microservice scale are implementation-time decisions once
  [backend-architecture.md](./backend-architecture.md) §5's migration is actually underway, not
  fixed speculatively now.
