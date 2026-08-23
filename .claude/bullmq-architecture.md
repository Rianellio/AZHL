# AZHL Platform — BullMQ Architecture (Design Only)

**Status: design document only.** No queue, worker, or job handler described here is implemented.
This document is the deep dive [backend-architecture.md](./backend-architecture.md) §9 promised
but only sketched (a four-row starter table illustrating the Event-Bus-vs-BullMQ distinction) —
the same target-state relationship this doc's siblings
([database-erd.md](./database-erd.md), [api-specification.md](./api-specification.md),
[event-catalog.md](./event-catalog.md), [security-architecture.md](./security-architecture.md))
already have to their own parent sections. Nothing here is authorized to build ahead of its
feature's phase in [roadmap.md](./roadmap.md).

Primary owner: **Backend Engineer** + **DevOps Engineer** agents.

---

## Table of contents

1. [Recap: what BullMQ is for here, and what it isn't](#1-recap-what-bullmq-is-for-here-and-what-it-isnt)
2. [Workers](#2-workers)
3. [Queues](#3-queues)
4. [Retry](#4-retry)
5. [Dead Letter Queue](#5-dead-letter-queue)
6. [Image processing queue](#6-image-processing-queue)
7. [Video processing queue](#7-video-processing-queue)
8. [Email queue](#8-email-queue)
9. [Statistics queue](#9-statistics-queue)
10. [Notification queue](#10-notification-queue)
11. [Backups](#11-backups)
12. [Maintenance tasks](#12-maintenance-tasks)
13. [Cleanup jobs](#13-cleanup-jobs)
14. [Monitoring](#14-monitoring)
15. [Failure recovery](#15-failure-recovery)
16. [Full queue catalog index](#16-full-queue-catalog-index)

---

## 1. Recap: what BullMQ is for here, and what it isn't

Restated once from [backend-architecture.md](./backend-architecture.md) §9 because every section
below depends on it: **the Event Bus is cross-module, fire-and-forget broadcast; BullMQ is one
module's own reliable execution of its own work.** A module's event handler receives something off
the bus and, if the resulting work needs retry/backoff/concurrency control, enqueues a BullMQ job
to actually do it rather than doing it inline. Nothing in this document is a second event system —
every queue below either (a) belongs to one business module reacting to events it already
subscribes to, or (b) belongs to `platform`'s cross-cutting operational concerns (§11–§13), the
same split [database-erd.md](./database-erd.md) already draws for `system_settings`.

**Enqueueing is capability-gated, the same way publishing an event is.** Per
[ADR-002: Event Bus Trust Model](../docs/adr/ADR-002-event-bus-trust.md) §7, a module receives a
bound `enqueue()` function (from the same composition root that hands out bound event publishers)
scoped only to the queue(s) it owns — "every queue is owned by exactly one module" (§3, below) is
now a structural property, not a convention. Any job enqueued as a reaction to a domain event also
carries a signed Provenance Claim proving which module/event triggered it, verified by the worker
before the job handler runs (ADR-002 §5/§7).

---

## 2. Workers

- **Workers are their own deployable, not part of `apps/web`.** BullMQ workers are long-running
  Node processes that hold open Redis connections and process jobs continuously — fundamentally
  incompatible with Vercel's serverless function model (execution-time-limited, spun up per
  request). A new `apps/worker` (or, at smaller scale, a single worker process bundling every
  module's queues) is a small, separately-deployed, always-on Node service — its own build target,
  independent release cadence, same blast-radius reasoning
  [architecture.md](./architecture.md) already gives for why `apps/admin`/`apps/mobile-api` are
  separate apps rather than folders inside `apps/web`.
- **Every queue in this document lives in `azhl-redis-critical`** (Tier B), per
  [ADR-003: Redis Security Architecture](../../docs/adr/ADR-003-redis-security.md) §5 — never the
  cache-only `azhl-redis-cache` instance. The worker connects using the `azhl-bullmq` ACL user
  (ADR-003 §2), scoped to `bull:*` keys plus explicit per-script-hash allowances for BullMQ's own
  Lua scripts, never the unrestricted command set a default Redis user would have.
- **One worker process may serve multiple queues**, but heavy and light work are deliberately
  **not** mixed in the same worker pool:
  - A **light pool** (high concurrency, e.g. 20–50 concurrent jobs per instance) serves
    CPU-cheap, I/O-bound queues — email sending, notification routing, cleanup jobs.
  - A **heavy pool** (low concurrency, e.g. 1–4 per instance, scaled *horizontally* by adding
    instances rather than raising per-instance concurrency) serves CPU/memory-intensive queues —
    image and video processing (§6, §7). Mixing these means a video-transcoding spike starves
    email delivery; keeping them separate means scaling one never affects the other.
- **Workers are stateless and horizontally scalable** — any worker instance can pick up any job for
  the queues it's configured to serve; BullMQ's Redis-backed queue is what makes "add another
  worker instance" a capacity increase with zero coordination logic to write.
- **Graceful shutdown:** a worker being redeployed/scaled down finishes its currently-processing
  job(s) before exiting (BullMQ's built-in graceful-shutdown support) rather than being killed
  mid-job and forcing a retry for work that was nearly done.

---

## 3. Queues

- **Naming:** `<owner>.<resource>.<action>`, extending
  [backend-architecture.md](./backend-architecture.md) §9's `<module>.<action>` convention with an
  explicit owner segment now that `platform`-owned operational queues (§11–§13) exist alongside
  business-module queues — `notifications.email.send` (module: notifications) vs.
  `platform.cleanup.sessions` (no business module owns this).
- **One queue = one job *shape* and one retry/priority policy** (§4) — never a generic
  "do arbitrary work" queue with per-job-type branching inside a single handler; that hides
  different reliability needs behind one policy and makes §14's monitoring meaningless (a queue's
  depth/failure-rate graph should mean one specific thing).
- **Every queue is owned by exactly one module** (or `platform`), matching
  [backend-architecture.md](./backend-architecture.md) rule 1 — a queue is that module's own
  private implementation detail; no other module ever enqueues directly into it, **enforced by
  §1's bound-`enqueue()` mechanism**, not left as an unenforced convention
  ([ADR-002](../docs/adr/ADR-002-event-bus-trust.md) §7, remediating
  [security review finding L-4](../docs/security/09-security-architecture-review.md#l-4-no-queue-level-access-control-for-bullmq-enqueue-operations)).
  A module wanting another module's queue to run something publishes an event (§1) instead.

---

## 4. Retry

Extends [event-catalog.md](./event-catalog.md) §2.2's priority-tier framework with BullMQ's actual
mechanics — every queue's retry policy is one of these three, named per queue in §16 rather than
re-derived per queue:

| Policy | BullMQ config | Applies to |
|---|---|---|
| **Standard** | `attempts: 3`, `backoff: { type: "exponential", delay: 1000 }` (≈1s, 5s, 25s) | The default — most queues in this catalog |
| **Strict** | `attempts: 5`, exponential backoff up to a longer ceiling (1s…10m) | Email delivery, backup verification — silent failure here is a trust or data-safety problem, not just delay |
| **Best-effort** | `attempts: 1`, no backoff | Analytics export, non-critical cache-refresh work — losing one run has no real consequence and a retry storm isn't worth the resource cost |

A job's `attempts` is exhausted → it moves to the Dead Letter Queue (§5), never silently discarded,
**except** best-effort jobs, which log a `warn` and stop — consistent with
[event-catalog.md](./event-catalog.md) §2.2's reasoning for why the P0/RT-Live tier intentionally
has the weakest retry policy: a policy's strength should match the cost of failure, not be
maximized by default.

---

## 5. Dead Letter Queue

- **One DLQ per source queue** (`notifications.email.send.dlq`, not one shared catch-all DLQ) —
  keeps failure investigation scoped to one job shape, and keeps §14's per-queue monitoring
  meaningful.
- **A DLQ entry retains the full original job payload plus every failure's error message/stack
  from each attempt** — the point of a DLQ is diagnosing *why*, not just knowing *that*, something
  failed.
- **A job whose Provenance Claim fails verification** ([ADR-002](../docs/adr/ADR-002-event-bus-trust.md)
  §7) routes straight to the DLQ with a distinct, clearly-labeled failure reason
  ("provenance verification failed") — never silently processed, and not the same retry path as an
  ordinary transient failure (§4), since a failed provenance check means the job's claimed trigger
  could not be trusted at all, not merely that the attempt didn't succeed yet.
- **Nothing auto-replays from a DLQ.** A DLQ job is inert until a human (an on-call engineer, via
  the monitoring dashboard, §14) investigates the root cause and deliberately triggers a replay —
  auto-replay would just re-run the same failure in a loop for anything but a transient issue,
  and for a transient issue, §4's retry policy already handled it before the job ever reached the
  DLQ.
- **Replay is logged like any other privileged action** — who replayed which DLQ job, when — the
  same audit posture [security-architecture.md](./security-architecture.md) §14 already applies to
  every other administrative action.
- **Retention:** DLQ jobs are kept long enough for investigation (e.g. 30 days) then archived/purged
  by the cleanup jobs in §13 — a DLQ that grows forever becomes exactly the kind of noise that makes
  real failures harder to spot.

---

## 6. Image processing queue

- **Queue:** `media.image.process` · **Triggered by:** the `media.uploaded`
  ([event-catalog.md](./event-catalog.md) §9) event handler, for any asset whose type is a photo.
- **Work performed:** generate the size variants the site actually serves (thumbnail, card, full)
  rather than serving one original at every size; strip EXIF metadata
  ([security-architecture.md](./security-architecture.md) §18 — privacy, not just performance);
  verify the file's real signature matches its declared type (§18 again — this is where that check
  actually executes, not at upload-request time when only the *declared* type is known).
- **Retry:** Standard. **Priority:** Normal — a processed image appearing a few seconds after
  upload is never user-blocking (the upload confirmation doesn't wait on this).
- **Idempotency:** re-running this job for the same `assetId` must produce the same output
  variants, not append duplicates — keyed by `assetId`, safe to reprocess.
- **Concurrency:** heavy pool (§2), but the *lightest* member of it — image resizing is far cheaper
  than video transcoding, so this queue can run at a higher per-instance concurrency than §7 within
  the same heavy-pool deployment.

---

## 7. Video processing queue

- **Queue:** `media.video.process` · **Triggered by:** `media.uploaded` for video assets.
- **Work performed:** transcode to the rendition set the platform actually serves (at minimum one
  web-friendly resolution/bitrate; more renditions is a real future scalability question, not
  designed further here), extract a poster-frame thumbnail, run the same file-signature
  verification as §6.
- **Retry:** Standard, but with a **lower `attempts` ceiling in practice than the config suggests**
  is worth calling out — a transcode that fails is far more likely to be a genuinely malformed
  input file than a transient blip, so a worker should fail *fast* to the DLQ rather than burn
  several minutes of CPU time retrying the same doomed job three times. (Concretely: still
  `attempts: 3` per the Standard policy for consistency, but transcoding failures are prioritized
  for quick human triage precisely because they're rarely self-correcting.)
- **Priority:** Normal, but resource-isolated (§2's heavy pool, lowest concurrency of anything in
  this catalog) — a video processing spike must never be able to starve the light pool serving
  email/notifications.
- **Idempotency:** keyed by `assetId`, same as §6.
- **This is the queue most likely to need horizontal worker scaling first** — flagged here for
  §16's index and for whoever provisions the worker deployment: budget for scaling *instance
  count* on this specific queue before any other.

---

## 8. Email queue

- **Queue:** `notifications.email.send` · **Triggered by:** the Notification queue's routing step
  (§10), never directly by another module.
- **Provider adapter, same swappable-interface philosophy as Storage/Event Bus**
  ([backend-architecture.md](./backend-architecture.md) §7): an `EmailProvider` interface
  (`send(to, template, data)`), concrete adapter TBD at implementation time (Postmark/SendGrid/
  Resend are all reasonable, TBD not decided in this design pass) — the job handler codes against
  the interface, never a specific provider's SDK directly.
- **Templates** are versioned, named assets (not inline strings built per-call) so a template
  change doesn't require a code change in every place that sends that email.
- **Bounce/complaint handling:** the provider's webhook (a bounce, a spam complaint) is itself
  ingested as a job on a small `notifications.email.bounce` queue — on a hard bounce or complaint,
  the corresponding `identity` user's email-channel `notification_preferences`
  ([database-erd.md](./database-erd.md) §10) is set to disabled, so the platform stops trying to
  send to a address that's provably bad, rather than repeating the same failure indefinitely.
- **Retry:** Strict (§4) — an undelivered password-reset or breaking-news email is a real problem,
  not just a UX inconvenience, matching
  [security-architecture.md](./security-architecture.md) §6's rate-limit reasoning for the same
  endpoints from the other direction.
- **Idempotency:** business-key dedup on `(userId, templateId, referenceId)`
  ([event-catalog.md](./event-catalog.md) §2.4) — the same principle that protects against a
  duplicate `notification.requested` applies one layer deeper here too, in case retries at *this*
  layer are what would otherwise cause a double-send.
- **Password-reset emails specifically:** the job payload never carries the raw reset token as a
  plain field — it's encrypted with JPEK (Job Payload Encryption Key) before enqueue and decrypted
  only by this queue's handler immediately before composing the email, and the job is configured
  with `removeOnComplete: true` so the encrypted field doesn't linger in Redis after a successful
  send. See [ADR-003: Redis Security Architecture](../../docs/adr/ADR-003-redis-security.md) §7–§8
  for the full reasoning — this is the concrete queue where that design applies.

---

## 9. Statistics queue

- **Queue:** `statistics.recompute` · **Triggered by:** `game.finished`, `season.started`,
  `season.finished` ([event-catalog.md](./event-catalog.md) §6, §5).
- **Debounced by design, using BullMQ job IDs, not a separate mechanism:** the job is enqueued with
  a **deterministic job ID keyed on `seasonId`** (e.g. `recompute:{seasonId}`). Adding a job with an
  ID that's already queued-and-waiting is a no-op in BullMQ — so if five games finish within the
  same minute on a busy game day, the standings recompute for that season runs **once**, not five
  times, with zero custom debounce logic to write or maintain.
- **Retry:** Standard. **Priority:** Normal (P1 events trigger it, but the recompute itself isn't
  live-latency-sensitive — a few seconds' delay recomputing standings after a game ends is
  invisible to users, unlike the live in-game events in §7/§8 of
  [event-catalog.md](./event-catalog.md)).
- **Idempotency:** inherently idempotent by construction — recomputing a season's standings from
  `games`/`game_events` is a pure function of that data, safe to run any number of times with the
  same result, which is exactly why [database-erd.md](./database-erd.md) calls `standings` "derived,
  never hand-edited."
- **This queue is also the mechanism behind [event-catalog.md](./event-catalog.md) §2.3's
  self-healing reconciliation job** — the same handler, additionally triggered on a scheduled
  repeatable interval (nightly), independent of any event, is what closes the gap if a
  `game.finished` event was ever permanently lost.

---

## 10. Notification queue

Two-tier structure, not one flat queue — this is the orchestration layer between the
event-catalog's `notification.requested` (a request to consider notifying someone) and the
channel-specific delivery queues (§8 for email; a `notifications.push.send` queue for push,
same shape, provider TBD):

- **Tier 1 — `notifications.process`:** consumes `notification.requested`
  ([event-catalog.md](./event-catalog.md) §10). Looks up the target user's
  `notification_preferences` ([database-erd.md](./database-erd.md) §10), decides which channel(s)
  apply, renders the message context, and enqueues into the appropriate Tier 2 queue(s). Does
  **not** send anything itself.
- **Tier 2 — `notifications.email.send` (§8) / `notifications.push.send`:** the actual
  channel-specific delivery, one queue per channel, each with its own provider adapter and its own
  bounce/failure handling.
- **Why two tiers instead of one:** a channel's delivery failure (an email provider outage)
  should never block or slow down the *decision* of who else needs notifying through a channel
  that's working fine — isolating "decide" from "deliver" means Tier 1 stays fast and reliable even
  when one Tier-2 channel is having a bad day.
- **Retry:** Tier 1 is Standard (a routing decision, cheap to retry); Tier 2 channels each use
  their own policy (§8's Strict for email).
- **Idempotency:** Tier 1 dedups on `(userId, topic, referenceId)`
  ([event-catalog.md](./event-catalog.md) §2.4/§10) before ever enqueueing a Tier 2 job — the
  earliest point this can be caught, so a duplicate never even reaches a channel-specific queue.

---

## 11. Backups

BullMQ's role here is **verification and supplementary export, not the primary backup mechanism
itself** — the primary mechanism is the managed Postgres provider's own automated backup/point-in-time-recovery
feature (an infrastructure/DevOps-Engineer-owned decision, not an application job), since
reinventing database backup at the application layer would be reinventing something the hosting
platform already does more reliably.

- **`platform.backup.verify`** (scheduled, e.g. daily): calls the hosting provider's API to confirm
  today's automated backup actually completed successfully, and pages on-call if it didn't or if
  the check itself can't reach the provider — the entire point being that a silently-failing
  backup, discovered only when a restore is needed, is a worse outcome than a loud daily check.
- **`platform.backup.export`** (scheduled, nightly, optional supplementary layer): exports specific
  high-value tables (e.g. `identity.users`, `competition.*`) to object storage (§17 of
  [security-architecture.md](./security-architecture.md)'s MinIO/Cloudinary-adapter world) as a
  second, independent safety net beyond the managed provider's own backup — deliberately not a
  replacement for it, a belt-and-suspenders addition.
- **Restore-drill reminder, not an automated restore:** actually testing a restore is a staged,
  usually-manual exercise (per the real operational principle that "an untested backup isn't a
  backup") — this job's scope is limited to creating a recurring reminder/ops ticket, not
  performing a live restore against anything automatically.
- **Retry:** Strict for `backup.verify` (a missed check is exactly the kind of silent failure this
  job exists to prevent); Standard for `backup.export`.

---

## 12. Maintenance tasks

General scheduled (BullMQ repeatable jobs), not event-triggered — `platform`-owned since none of
these belong to one business module:

- **`platform.maintenance.stats-reconciliation`** — the nightly full-recompute pass already
  described in §9's last bullet.
- **`platform.maintenance.db-health-check`** — a lightweight scheduled check of table
  bloat/index health on the highest-write-volume tables flagged for partitioning in
  [database-erd.md](./database-erd.md) §14 (`game_events`, `audit_logs`) — Postgres autovacuum
  handles routine cleanup itself; this job's job is surfacing *when a human should look*, not
  replacing autovacuum.
- **`platform.maintenance.secret-rotation-reminder`** — a scheduled nudge tied to
  [security-architecture.md](./security-architecture.md) §15's rotation policy (annually, or
  sooner) — creates an ops reminder, does not rotate a secret automatically, since rotating a
  signing key or DB credential automatically without a coordinated cutover is itself a risk.
- **Retry:** Best-effort for the health-check/reminder jobs (missing one run and catching it next
  time has no real cost); Standard for anything that mutates data.

---

## 13. Cleanup jobs

Every one of these exists to keep a table from growing unbounded with rows that have no further
value once past a threshold — matching the specific cleanup needs already flagged (but not
scheduled) in [database-erd.md](./database-erd.md):

| Queue | Cleans up | Threshold |
|---|---|---|
| `platform.cleanup.sessions` | `identity.sessions` | Past `expires` |
| `platform.cleanup.verification-tokens` | `identity.verification_tokens` | Past `expires`, or already consumed |
| `platform.cleanup.refresh-tokens` | `identity.refresh_tokens` | Past `expires_at`, or `revoked_at` set and older than a short grace window (kept briefly post-revocation for reuse-detection forensics, per [security-architecture.md](./security-architecture.md) §2) |
| `platform.cleanup.notifications` | `notifications.notifications` | `read_at` set and older than a retention window (per [database-erd.md](./database-erd.md) §10's note that retention, not partitioning, is the right answer here) |
| `platform.cleanup.dlq-archive` | Every queue's DLQ (§5) | Older than the investigation retention window |
| `platform.cleanup.rate-limit-keys` | *(not actually needed — Redis TTL already expires these natively, per [backend-architecture.md](./backend-architecture.md) §8; listed here only to explicitly rule it out rather than leave it ambiguous)* | — |

- **Retry:** Standard. **Priority:** Normal — none of these are user-facing or time-sensitive.
- **Idempotency:** every one of these is a `DELETE ... WHERE <threshold condition>` — naturally
  idempotent; running it twice in a row deletes nothing the second time.

---

## 14. Monitoring

- **Bull Board** (or equivalent), per [backend-architecture.md](./backend-architecture.md) §9 —
  the operational dashboard over every queue's depth, in-flight count, failure rate, and DLQ
  contents, without building custom tooling.
- **Metrics tracked per queue:** current depth (waiting + active), age of the oldest waiting job
  (the single best "are we falling behind" signal — a queue can have high throughput and still be
  falling behind if arrival rate exceeds it), failure rate over a rolling window, DLQ size.
- **Alert thresholds** (concrete starting points, tune once real traffic exists): oldest-waiting-job
  age exceeds a queue-appropriate ceiling (seconds for §6/§7's media queues, minutes for §8's
  email, since urgency differs by queue); failure rate exceeds ~10% over 15 minutes; any DLQ
  receives a new entry at all for `Strict`-policy queues (§4) — a Strict queue's whole point is
  that exhausting its retries should be rare and always worth a look.
- **Every job's logs carry the triggering event's `correlationId`**
  ([backend-architecture.md](./backend-architecture.md) §13/§4) — so an on-call engineer can trace
  "this `game.finished` event" all the way through Statistics' recompute job, Notifications' Tier
  1/Tier 2 jobs, and Analytics' consumption, as one connected trace instead of four unrelated log
  lines.

---

## 15. Failure recovery

- **DLQ replay** (§5) is the standard recovery path for a job that failed after exhausting
  retries — always manual, always logged, only after the root cause is understood (a bad payload,
  a since-fixed bug, a since-recovered third-party outage).
- **Poison messages:** a job that fails identically and immediately on every attempt (a malformed
  payload no retry will ever fix) is exactly what the DLQ is *for* — the fix is investigating and
  either correcting the data and replaying, or, if the job type itself was wrong, discarding it
  deliberately (a logged decision, not a silent drop). §4's retry ceiling exists specifically so a
  poison message costs at most a few seconds of retries before landing where a human can see it,
  not an infinite loop.
- **Circuit breaking for flaky third-party dependencies:** if the email provider (§8) or a media
  transcoding dependency starts failing broadly (not just one job's input, but the dependency
  itself), a worker should detect a failure-rate spike and pause pulling new jobs from that specific
  queue for a cooldown window rather than burning through every queued job's retries against a
  dependency that's currently down — the queue holds the backlog safely (that's what a durable
  queue is for) while the breaker waits for the dependency to recover, then resumes.
- **Idempotency is the precondition every recovery strategy above depends on**
  ([event-catalog.md](./event-catalog.md) §2.4) — replay, retry, and even the eventual move to
  Kafka's at-least-once delivery
  ([backend-architecture.md](./backend-architecture.md) §5) are only safe because every job/handler
  in this catalog is designed to produce the same result whether it runs once or three times.

---

## 16. Full queue catalog index

| Queue | Owner | Retry policy | Priority |
|---|---|---|---|
| `media.image.process` | Media | Standard | Normal |
| `media.video.process` | Media | Standard | Normal (resource-isolated, heavy pool) |
| `notifications.process` | Notifications | Standard | Normal |
| `notifications.email.send` | Notifications | Strict | Normal |
| `notifications.email.bounce` | Notifications | Standard | Normal |
| `notifications.push.send` | Notifications | Strict | Normal |
| `statistics.recompute` | Statistics | Standard | Normal |
| `platform.backup.verify` | Platform | Strict | Normal |
| `platform.backup.export` | Platform | Standard | Normal |
| `platform.maintenance.stats-reconciliation` | Platform | Standard | Normal (scheduled) |
| `platform.maintenance.db-health-check` | Platform | Best-effort | Normal (scheduled) |
| `platform.maintenance.secret-rotation-reminder` | Platform | Best-effort | Normal (scheduled) |
| `platform.cleanup.sessions` | Platform | Standard | Normal (scheduled) |
| `platform.cleanup.verification-tokens` | Platform | Standard | Normal (scheduled) |
| `platform.cleanup.refresh-tokens` | Platform | Standard | Normal (scheduled) |
| `platform.cleanup.notifications` | Platform | Standard | Normal (scheduled) |
| `platform.cleanup.dlq-archive` | Platform | Standard | Normal (scheduled) |

17 queues (each with its own DLQ per §5, not separately listed).
