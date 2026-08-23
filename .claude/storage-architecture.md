# AZHL Platform — Storage Architecture (Design Only)

**Status: design document only.** No bucket, path, or storage policy described here is
provisioned. This document is the complete storage design that
[backend-architecture.md](./backend-architecture.md) §7 (the `MediaStorage` interface) and
[security-architecture.md](./security-architecture.md) §17 (MinIO's security posture) only
partially sketched — this doc covers the rest: bucket layout, naming, compression, versioning,
public/private policy, and CDN preparation. It doesn't re-decide anything those two documents
already settled (the interface shape, Cloudinary as the Stage 1/Phase 5 concrete adapter, MinIO as
the local-dev/self-hosted-parity option) — only builds on top of it. Nothing here is authorized to
provision ahead of its feature's phase in [roadmap.md](./roadmap.md).

Primary owner: **Backend Engineer** + **DevOps Engineer** agents, with **Security Engineer**
reviewing §7/§8 before any real upload path ships (per
[future-services.md](./future-services.md)'s existing Cloudinary go-live checklist).

---

## Table of contents

1. [Buckets](#1-buckets)
2. [Folder structure](#2-folder-structure)
3. [Naming convention](#3-naming-convention)
4. [Image compression](#4-image-compression)
5. [Video storage](#5-video-storage)
6. [File versioning](#6-file-versioning)
7. [Public vs. private files](#7-public-vs-private-files)
8. [Signed URLs](#8-signed-urls)
9. [Backup strategy](#9-backup-strategy)
10. [CDN preparation](#10-cdn-preparation)
11. [Future scalability](#11-future-scalability)

---

## 1. Buckets

Four buckets, each with a distinct trust/lifecycle profile — not one bucket with folders
pretending to separate them, since bucket-level policy (public/private, replication, retention) is
where the real security/operational boundary should live:

| Bucket | Purpose | Public? |
|---|---|---|
| `azhl-media-raw` | Freshly-uploaded originals, before processing (§4/§5) completes | Never |
| `azhl-media-public` | Final, processed renditions attached to **published** content | Served via CDN (§10), origin never exposed directly |
| `azhl-media-private` | Renditions attached to **unpublished/draft** content, or anything an admin needs to preview before it's public | Never — signed URL only (§8) |
| `azhl-backups` | Supplementary object-storage exports (`platform.backup.export`, [bullmq-architecture.md](./bullmq-architecture.md) §11) | Never |

A `media_assets` row ([database-erd.md](./database-erd.md) §9) moves from `raw` → `public` or
`private` as part of the processing pipeline (§4/§5), and from `private` → `public` at the moment
its owning content is actually published — never the reverse silently; unpublishing moves it back
to `private`, handled by the same event ([event-catalog.md](./event-catalog.md) `news.unpublished`)
that already exists for this.

---

## 2. Folder structure

Object keys are structured, not flat, mirroring the exact relation columns
[database-erd.md](./database-erd.md) §9 already gives `media_assets` (`team_id`, `player_id`,
`game_id`, `news_article_id`):

```
{entityType}/{entityId}/{assetId}/{variant}.{ext}
```

Examples: `teams/{teamId}/{assetId}/card.webp`, `players/{playerId}/{assetId}/full.webp`,
`news/{articleId}/{assetId}/poster.jpg`, `games/{gameId}/{assetId}/720p.mp4`.

- **Why entity-first, not date-first (`2026/07/…`):** the platform's actual access pattern is
  always "give me media for this team/player/game/article" — never "give me everything uploaded
  in July." A date-first layout optimizes for an access pattern this platform doesn't have; an
  entity-first layout means listing a prefix already answers the real question.
- **`{variant}`** is the specific rendition (§4/§5) — never a version number (§6 handles
  versioning at a different layer entirely, not via the path).

---

## 3. Naming convention

- **`{assetId}` is the `media_assets.id` (cuid) — never the original filename, never a
  user-suppliable string.** Restated from
  [security-architecture.md](./security-architecture.md) §18 because it's as much a storage-design
  rule as a security one: an opaque, server-generated key sidesteps path-traversal attempts, avoids
  filename collisions, and means an object's key alone leaks nothing about its content.
- **`{variant}` is a fixed, closed set per media type** (§4/§5), not a free-form string — so a
  listing of a given asset's variants is always predictable and a bug can't accidentally create an
  unbounded number of them.
- **Extensions match real content, decided at processing time** (§4/§5) — never trusted from the
  original upload's filename or declared type, consistent with
  [security-architecture.md](./security-architecture.md) §18's file-signature-verification rule.

---

## 4. Image compression

- **WebP as the primary served format** — broad current browser support, meaningfully smaller than
  JPEG/PNG at equivalent visual quality. **AVIF is the natural next upgrade**, not adopted at Stage
  1 only because its encoding cost is higher and the gain over WebP is marginal until real
  bandwidth/cost pressure justifies it — revisit once traffic volume makes the tradeoff worth
  measuring, not on a schedule.
- **A JPEG fallback variant is generated only if real traffic data ever shows a legacy-browser need
  for it** — not produced speculatively for every image by default; three formats per image
  triples processing cost and storage for a case that may never materialize.
- **Fixed variant set, matching actual UI usage** (not "generate every conceivable size"):
  `thumbnail` (small — list/grid contexts), `card` (medium — article/roster card contexts), `full`
  (largest — detail-page hero contexts). Adding a fourth variant later is cheap (§11); starting
  with more than the UI actually uses today is waste.
- **Quality target ~80–85** (standard modern web-performance guidance — the point past which
  additional quality is imperceptible to most viewers but meaningfully increases file size) —
  tune once real images and real devices are available to judge against, this is a starting point
  not a law.
- **This is exactly the work `media.image.process`** ([bullmq-architecture.md](./bullmq-architecture.md)
  §6) performs — this section specifies *what* that queue's job produces; that document specifies
  *how it's queued/retried*.

---

## 5. Video storage

- **A single web-friendly rendition at Stage 1** (H.264/MP4, one resolution/bitrate target) — this
  is a deliberate, previously-stated scope limit
  ([bullmq-architecture.md](./bullmq-architecture.md) §7 explicitly declined to design a
  multi-rendition ladder "further here"), restated rather than quietly expanded now. Adaptive
  bitrate streaming (HLS/DASH, multiple renditions) is real future scalability (§11), not a Stage 1
  requirement — most of this platform's video content (highlight clips, interviews) doesn't need
  adaptive streaming's complexity to be watchable.
- **A poster-frame thumbnail image is always generated alongside the video** — stored as a normal
  image variant (§4's pipeline) at the same `{entityType}/{entityId}/{assetId}/poster.webp` path,
  so video assets get a real preview image everywhere the UI needs one without special-casing
  video in every consuming component.
- **Videos live in the same bucket/path scheme as images** (§1/§2) — no separate "video bucket."
  Nothing about trust/access policy differs by media type, only by publish state (§7), so
  splitting buckets by type would add a dimension with no actual policy difference behind it.

---

## 6. File versioning

Two independent mechanisms, doing two different jobs — conflating them is a common mistake worth
avoiding explicitly:

- **Content versioning (the one that matters for the product): every "replacement" is a new,
  immutable object with a new `assetId`, never an in-place overwrite of an existing key.**
  Replacing a team's logo, for instance, creates a new `media_assets` row (optionally carrying a
  `replaces_media_asset_id` self-reference for history/rollback) and a new object at a new path;
  the old row gets `deleted_at` set (already the schema's soft-delete design,
  [database-erd.md](./database-erd.md) §9) but its underlying object is *not* immediately deleted
  (§9 below). This means a URL, once issued, never silently starts pointing at different content —
  a real content-integrity property, not just a nice-to-have.
- **Bucket versioning (a safety net, not a feature): enable native object-storage versioning
  (MinIO/S3-compatible) on every bucket anyway**, purely as protection against an *accidental*
  overwrite or delete (an operator error, a bug) — since content versioning (above) means the
  application should never legitimately overwrite a key, any version history bucket-versioning
  ever surfaces is itself a signal something went wrong and is worth investigating, not a normal
  product feature being exercised.

---

## 7. Public vs. private files

Refines, rather than contradicts, [security-architecture.md](./security-architecture.md) §17's
"buckets are private by default, no public-read bucket policy, ever" — that rule is correct and
unchanged for `azhl-media-raw` and `azhl-media-private` (§1). It needs one explicit refinement for
`azhl-media-public`: a public sports website's published photos/videos are *meant* for anonymous
public display, and requiring a fresh signed URL for every view of every published image would be
both impractical and pointless (there's no secret to protect in a photo already shown on a public
news article).

The resolution is the standard pattern, not a contradiction of the earlier rule: **`azhl-media-public`
itself still has no direct public-read bucket policy — the origin stays private. What's public is
the CDN (§10) in front of it**, using an Origin Access Identity/Control-style restriction so the
storage origin only ever accepts requests from the CDN, never directly from the internet. The
result is the same outcome §17 was protecting against (no directly-exposed storage endpoint) with
the practical behavior public content actually needs (a stable, cacheable, non-expiring public
URL for anything actually published).

| Bucket | Read access |
|---|---|
| `azhl-media-raw` | Never — processing pipeline only |
| `azhl-media-public` | Via CDN only; origin rejects direct requests |
| `azhl-media-private` | Signed URL only, short expiry (§8) |
| `azhl-backups` | Never — restore procedure only |

---

## 8. Signed URLs

Two distinct signed-URL use cases, already partly designed in
[backend-architecture.md](./backend-architecture.md) §7 for the first:

- **Signed *upload* URLs** (existing design, restated): a client uploads directly to
  `azhl-media-raw`, bypassing the API server for the file bytes themselves
  ([api-specification.md](./api-specification.md) §10's `upload-url` endpoint). Short expiry
  (5–15 minutes) — long enough for a real upload, short enough that a leaked/logged URL is
  worthless soon after.
- **Signed *read* URLs** (new here): for previewing an asset in `azhl-media-private` — an editor
  reviewing a draft article's not-yet-public image, for instance. Expiry bounded to a single
  editing session's reasonable length (e.g. 1 hour), scoped to exactly one object, never a
  bucket-wide credential.
- **Never a long-lived or non-expiring signed URL, for either use case** — if a workflow seems to
  need one, that's a sign the asset should be reclassified as public (§7) and served via CDN
  instead, not a reason to weaken the expiry.

---

## 9. Backup strategy

Distinct from — and a companion to — [bullmq-architecture.md](./bullmq-architecture.md) §11's
*database* backup verification job; this section is specifically about the object store's own
durability. The same encrypted/access-restricted/not-retained-indefinitely posture this section
establishes is reused, not reinvented, by
[ADR-003: Redis Security Architecture](../../docs/adr/ADR-003-redis-security.md) §9 for
`azhl-redis-critical`'s BullMQ persistence backups — one backup-security policy, applied
consistently across every place this platform persists something.

- **Soft-deleted assets are not immediately hard-deleted from storage.** `media_assets.deleted_at`
  being set (§6) removes the asset from the application's view, but the underlying object is kept
  for a grace period (e.g. 30 days) before a cleanup job
  ([bullmq-architecture.md](./bullmq-architecture.md) §13-style scheduled job, added to that
  catalog's `platform.cleanup.*` family when this is implemented) actually removes it — cheap
  insurance against an accidental delete becoming unrecoverable the same second it happens.
- **Cross-region/cross-provider replication** for `azhl-media-public` and `azhl-media-private` —
  MinIO's bucket replication (to a second MinIO cluster or to a cloud object store) if MinIO is
  ever the production choice; Cloudinary's own durability guarantees if it remains the Stage
  1/Phase 5 adapter (per [future-services.md](./future-services.md)) — either way, the concrete
  provider decision doesn't change this section's requirement: published media should survive a
  single region/provider outage.
- **`azhl-backups`** ([bullmq-architecture.md](./bullmq-architecture.md) §11) itself lives in a
  *different* provider/region than the primary media buckets where practical — a backup that lives
  next to the thing it's backing up doesn't protect against the failure modes that actually matter
  (a whole-provider or whole-region incident).

---

## 10. CDN preparation

- **The CDN is the public-facing surface for `azhl-media-public`; the storage origin is never
  reachable directly from the internet** (§7's resolution). Cloudinary already includes CDN
  distribution as part of the same service ([future-services.md](./future-services.md)); if MinIO
  is ever the production origin instead, a CDN (Cloudflare/CloudFront/Bunny — concrete choice
  deferred, not decided here) sits in front of it using an Origin Access Control pattern.
- **Cache headers are set per variant at processing time** (§4/§5's pipeline) — long
  `max-age`/`immutable` on every object, since §6's content-versioning design means a given
  `assetId`+`variant` path's content *never changes* once written; there's nothing to
  revalidate, so an aggressive, long-lived cache header is not just safe but correct.
- **Cache invalidation is asset-scoped, event-driven, not needed for content changes (only for
  removal):** because content is immutable per path (§6), the only time a CDN cache entry needs
  active invalidation is `media.deleted`
  ([event-catalog.md](./event-catalog.md) §9) — a small job purges that specific asset's CDN edge
  cache entries on that event, rather than any kind of broad/periodic cache-clearing.
- **Signed CDN URLs are a documented future option, not needed at Stage 1** — some CDNs support
  their own signed-URL layer (e.g. CloudFront signed URLs) as an alternative to origin-level
  signing (§8) for private content served through a CDN rather than directly from storage; not
  needed today since `azhl-media-private` (§1) is small-volume, low-traffic admin-preview content
  that doesn't need CDN acceleration at all yet.

---

## 11. Future scalability

- **Lifecycle policies** (storage-tier transitions — e.g. moving assets attached to seasons more
  than N years old to a cheaper/colder storage class) are a real cost-optimization lever once
  total stored volume justifies the added complexity of tiered retrieval latency — not worth
  designing further until there's real multi-season volume to measure against.
- **Per-module bucket separation beyond Media** — `azhl-backups` (§1) already establishes that not
  every bucket belongs to the Media module; as other modules develop their own storage needs
  (e.g. a future Analytics data-export bucket), each gets its own bucket under the same
  ownership/naming discipline this document establishes, rather than everything accumulating in
  Media's buckets by default.
- **A fourth image variant, or a second video rendition,** is a low-cost addition precisely
  because §2's path scheme and §4/§5's fixed-variant-set design already anticipate more variants
  being added later — this is additive, not a redesign, the same "additive by default" discipline
  [api-specification.md](./api-specification.md) and
  [security-architecture.md](./security-architecture.md) §4 already apply to their own domains.
- **Storage cost/quota monitoring** belongs in the observability design
  ([observability-architecture.md](./observability-architecture.md)), not duplicated here — flagged
  as a cross-reference rather than redesigned in two places.
