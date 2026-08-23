# External Security Knowledge Base — Anthropic Cybersecurity Skills

AZHL treats a sibling repository as an **external, read-only reference library** for
security-relevant implementation decisions — not a source of architecture to copy from, and not
part of AZHL's own knowledge base (`.claude/CLAUDE.md`'s index does not include it; this document
is the pointer to it, not a mirror of it).

**Location:** `../Anthropic-Cybersecurity-Skills` relative to the AZHL repo root (a sibling
checkout, not a subdirectory or submodule of this repo). If it isn't present at that path, skip
consultation and proceed on AZHL's own documented judgment — do not block on it.

## What it is

817 structured, individually-scoped skills spanning 29 security domains (offense, defense,
forensics, compliance, cloud, AppSec, identity), each mapped to OWASP Top 10 / OWASP API Top 10 /
MITRE ATT&CK / NIST CSF. Indexed at its root `index.json`
(`{name, description, domain, path}` per skill); each skill's actual content lives at
`skills/<name>/SKILL.md` (plus `references/`, `scripts/`, `assets/`).

**Read this warning before consulting anything in it:** the majority of its content is written
from an **offensive/red-team or forensic-investigator perspective** ("exploiting X," "hunting for
Y," "attacking Z") — this is a deliberate feature of the library (it teaches recognizing and
defending against real attacker technique), not a defect, but it means a skill's title is often
phrased as an attack, and the AZHL-relevant content is the **defensive control the attack implies**,
not the attack procedure itself. Never run offensive tooling described there against any AZHL
environment. Extract the underlying control, adapt it, and cite it — per the workflow below.

## When to consult it

Before making an implementation decision — not after, and not for routine work that doesn't touch
one of these areas — in any of: backend logic, authentication, authorization/RBAC, JWT, API
design, PostgreSQL, Redis, Docker, MinIO, BullMQ, Kafka, CI/CD, infrastructure, threat modeling, or
security review. This applies to both AZHL's real, implemented code and its design-only
architecture series (`backend-architecture.md` and siblings) — consulting before writing a *design*
decision is exactly as valuable as consulting before writing *code*, since AZHL's own security
review (`docs/security/09-security-architecture-review.md`) found its most serious gaps at the
design stage.

## Required workflow — never blind-copy, never apply every recommendation reflexively

1. **Select** the specific skill(s) relevant to the decision at hand, by name and path. Do not
   default to a single skill if the decision genuinely spans more than one domain (e.g. a JWT
   refresh-token endpoint touches both `implementing-jwt-signing-and-verification` and rate-limiting
   skills) — see step 3 on combining.
2. **State why** each selected skill applies to this specific AZHL decision — not a generic
   "security best practice," the actual mechanism connecting the skill to what AZHL is doing.
   Not every recommendation a skill makes is relevant just because the skill itself is relevant —
   apply judgment about which parts of it actually bear on the decision at hand, not the whole
   skill wholesale.
3. **Combine when multiple skills are relevant.** Treat this as the common case for any real
   AZHL decision, not the exception — e.g. reviewing a future `/v1/auth/login` implementation
   plausibly draws on a JWT skill, an OAuth skill, a rate-limiting skill, and an
   account-enumeration-relevant testing skill at once. State each skill's specific contribution
   rather than merging them into one undifferentiated recommendation.
4. **When selected skills disagree with each other, or a skill disagrees with an existing AZHL
   decision, resolve it explicitly — never silently pick one or silently blend both.** State what
   each side recommends, why they diverge (usually: a skill's context — generic web app, different
   scale, different threat model — doesn't match AZHL's actual architecture), and which one AZHL
   should follow and why, per [PROJECT_RULES.md](../docs/PROJECT_RULES.md) R-003's "state
   tradeoffs, then recommend" rule. AZHL's own existing ADR is the tie-breaker default unless the
   skill surfaces something the ADR's original reasoning genuinely missed — in which case say so
   and propose amending the ADR, don't override it silently.
5. **Adapt, don't paste.** AZHL already has its own architectural decisions
   ([DECISIONS.md](../docs/DECISIONS.md)), its own rules
   ([PROJECT_RULES.md](../docs/PROJECT_RULES.md)), and its own open findings
   ([KNOWN_ISSUES.md](../docs/KNOWN_ISSUES.md)) — a skill's generic recommendation is filtered
   through AZHL's actual stack (Next.js/Prisma/Postgres, the modular-monolith design, the
   `AuthContext`/RBAC model already specified) before it's applied.
6. **Record the outcome** in AZHL's own repo-resident documentation if it changes or confirms a
   real decision — a new or amended entry in [DECISIONS.md](../docs/DECISIONS.md), a new
   [KNOWN_ISSUES.md](../docs/KNOWN_ISSUES.md) entry, or a correction to the relevant
   `.claude/*.md` design document — so the reasoning survives independent of this session, per
   AZHL's own "everything important lives in the repository" principle
   (`docs/PROJECT_STATE.md`/`PROJECT_HISTORY.md`).

## Curated index — AZHL stack area → relevant skills

Built by searching `index.json` for AZHL's actual technology categories, not by reading all 817
skills. Paths are relative to the external repo's root. Where no skill exists under a category's
own name (Redis, Kafka, BullMQ, MinIO specifically aren't covered as named products), the closest
transferable skill is listed instead, marked *(adjacent)*.

### Authentication / JWT / sessions
- `skills/implementing-jwt-signing-and-verification` — RFC 7519 JWT signing/verification
  mechanics. Directly relevant to ADR-401's RS256 decision and ADR-403's refresh-token design.
- `skills/testing-for-json-web-token-vulnerabilities`, `skills/testing-jwt-token-security`,
  `skills/exploiting-jwt-algorithm-confusion-attack`, `skills/performing-jwt-none-algorithm-attack`
  — attacker-perspective JWT flaws (algorithm confusion, `alg: none`) to verify AZHL's future JWT
  implementation explicitly rejects, not techniques to run.
- `skills/implementing-hardware-security-key-authentication`,
  `skills/implementing-passwordless-authentication-with-fido2` — relevant to ADR-405's documented
  WebAuthn/passkey future-upgrade path.
- `skills/configuring-oauth2-authorization-flow`, `skills/testing-oauth2-implementation-flaws`,
  `skills/exploiting-oauth-misconfiguration` — relevant to Phase 4's Auth.js/OAuth provider
  wiring (`security-architecture.md` §19).
- `skills/detecting-anomalous-authentication-patterns`,
  `skills/hunting-credential-stuffing-attacks` — relevant to `security-architecture.md` §6's
  rate-limiting tiers for `/v1/auth/login`.

### Authorization / RBAC
- `skills/building-role-mining-for-rbac-optimization` — relevant to ADR-402's permission-string
  design once real role/permission data exists to mine.
- `skills/implementing-rbac-hardening-for-kubernetes`, `skills/auditing-kubernetes-cluster-rbac`
  — Kubernetes-specific, but the least-privilege/role-scoping principle transfers directly to
  ADR-402's `can(context, action, resource)` design even though AZHL isn't on Kubernetes.
- `skills/testing-for-broken-access-control`,
  `skills/testing-api-for-broken-object-level-authorization`,
  `skills/exploiting-idor-vulnerabilities`,
  `skills/exploiting-broken-function-level-authorization`,
  `skills/detecting-broken-object-property-level-authorization` — the OWASP API Top 10
  authorization-failure family; use these to pressure-test `api-specification.md`'s per-endpoint
  auth levels (§1.3) before implementation, especially API3 (property-level, flagged as a real gap
  in AZHL's own security review's API Security Review table).

### API design & security
- `skills/conducting-api-security-testing`, `skills/testing-api-security-with-owasp-top-10`,
  `skills/implementing-api-security-posture-management` — general API security posture, relevant
  to reviewing `api-specification.md`'s 56-endpoint catalog before Phase 4 implementation.
- `skills/implementing-api-rate-limiting-and-throttling`,
  `skills/implementing-api-abuse-detection-with-rate-limiting` — directly relevant to
  `security-architecture.md` §6's rate-limiting tiers and AZ-S15 (no WAF/edge layer specified).
- `skills/implementing-api-gateway-security-controls`,
  `skills/analyzing-api-gateway-access-logs` — relevant if/when ADR-201's "no gateway until a real
  need" condition is ever revisited.
- `skills/exploiting-mass-assignment-in-rest-apis` — directly relevant to the security review's
  API3 finding on `PATCH` endpoints needing an explicit field allow-list, never a raw merge
  (already named as a requirement in the Security Checklist).
- `skills/testing-cors-misconfiguration`, `skills/performing-csrf-attack-simulation` — relevant to
  `security-architecture.md` §10–§11's CSRF/CORS design.

### PostgreSQL / database
- `skills/exploiting-sql-injection-vulnerabilities`, `skills/exploiting-sql-injection-with-sqlmap`,
  `skills/performing-second-order-sql-injection` *(adjacent — generic SQLi, not Postgres-specific)*
  — relevant only as a verification checklist for
  [PROJECT_RULES.md](../docs/PROJECT_RULES.md)'s R-004-adjacent guarantee that Prisma
  parameterizes every query; useful when reviewing any future `$queryRaw`/`$executeRaw` use
  (`security-architecture.md` §13).
- No skill in this library addresses Postgres Row-Level Security, schema-per-tenant isolation, or
  least-privilege DB roles directly — AZ-S14 (no RLS as a second authorization layer) and
  ADR-109 (least-privilege DB roles per module schema) remain AZHL-original design, not
  library-derived.

### Redis
*(adjacent only — no skill named for Redis specifically)*
- `skills/implementing-secrets-management-with-vault`,
  `skills/implementing-hashicorp-vault-dynamic-secrets` — the closest transferable pattern for
  AZ-S3 (Redis as an unhardened single point of trust): a dedicated secrets/cache store needs its
  own auth, TLS, and network isolation, the same discipline these skills apply to Vault.
- `skills/implementing-zero-trust-network-access` family — relevant to the network-isolation half
  of AZ-S3's required fix (Redis reachable only from `apps/web` and the worker deployment).

### Docker
- `skills/hardening-docker-containers-for-production`,
  `skills/hardening-docker-daemon-configuration`,
  `skills/performing-docker-bench-security-assessment`,
  `skills/scanning-docker-images-with-trivy` — directly relevant to `docker-compose.yml`
  (local Postgres today; MinIO local-dev parity per ADR-501 when built) and to any future
  production container deployment (the BullMQ worker deployment, `bullmq-architecture.md` §2).
- `skills/escaping-containers-to-host`,
  `skills/detecting-container-runtime-threats-with-falco` — attacker-perspective container
  breakout; relevant as a checklist for what container hardening (above) needs to prevent, not a
  technique to run.

### MinIO / object storage
*(adjacent — MinIO is S3-API-compatible, so S3 skills transfer directly)*
- `skills/auditing-aws-s3-bucket-permissions`, `skills/remediating-s3-bucket-misconfiguration` —
  directly applicable to `storage-architecture.md`'s four-bucket design (ADR-502) and the
  private-by-default / CDN-fronted-public resolution (ADR-503) once MinIO or a production
  S3-compatible store is actually provisioned — use these to verify bucket policy, not to assume
  Cloudinary's own posture (which is a separate, already-managed vendor surface).

### BullMQ / job queues
*(adjacent only — no skill named for BullMQ or generic job queues)*
- `skills/implementing-api-rate-limiting-and-throttling` — the token-bucket/sliding-window
  concepts transfer to queue-level backpressure design, though AZHL's actual BullMQ retry/DLQ
  design (`bullmq-architecture.md` §4–§5) is original, not library-derived.
- No skill addresses dead-letter-queue handling or job idempotency directly — R-211/R-212
  ([PROJECT_RULES.md](../docs/PROJECT_RULES.md)) remain AZHL-original.

### Kafka
*(adjacent only — no skill named for Kafka)*
- `skills/detecting-supply-chain-attacks-in-ci-cd`,
  `skills/implementing-supply-chain-security-with-in-toto` — relevant only to the transport-security
  half of AZ-S17 (Kafka SASL/TLS/topic ACLs) in the general sense of "verify a message-transport
  layer's authentication," not Kafka-specific guidance.
- Kafka topic ACLs / producer authentication (the core of ADR-203/ADR-302's Stage 3 design and
  security-review finding C-2) has no direct library coverage — treat as AZHL-original design,
  cross-checked only against this library's general "authenticate every producer, never trust
  transport alone" pattern from the identity/zero-trust skill family.

### CI/CD & supply chain
- `skills/securing-github-actions-workflows` — directly relevant to `.github/workflows/ci.yml`,
  written but never executed (ADR-006) — worth consulting *before* the first real PR triggers it,
  not after.
- `skills/implementing-secrets-scanning-in-ci-cd`, `skills/implementing-secret-scanning-with-gitleaks`
  — directly relevant to AZ-S8 (no dependency/supply-chain security control specified anywhere)
  and to `.claude/agents/security-engineer.md`'s existing `pnpm audit` responsibility.
- `skills/integrating-sast-into-github-actions-pipeline`,
  `skills/integrating-dast-with-owasp-zap-in-pipeline`,
  `skills/scanning-containers-with-trivy-in-cicd`,
  `skills/scanning-iac-and-images-with-trivy` — a concrete menu of CI gate types to select from
  when AZ-S8's required mitigation (automated dependency vulnerability scanning in CI, per the
  security review's "Required Architecture Changes" #8) is actually implemented.
- `skills/analyzing-sbom-for-supply-chain-vulnerabilities` — relevant to the same finding's SBOM
  angle.

### Infrastructure
- `skills/auditing-terraform-infrastructure-for-security`,
  `skills/implementing-infrastructure-as-code-security-scanning`,
  `skills/scanning-iac-and-images-with-trivy` — relevant once any IaC exists (none does today;
  AZHL's infra is currently `docker-compose.yml` + Vercel dashboard config, not IaC-managed) —
  consult when/if that changes, not before.
- `skills/implementing-cloud-security-posture-management` — relevant to the eventual Vercel/
  Cloudinary go-live review already required by `future-services.md`'s Cloudinary checklist.

### Threat modeling
- `skills/performing-threat-modeling-with-owasp-threat-dragon` — a concrete STRIDE-family
  methodology and tool; the natural next step if AZHL ever formalizes a data-flow-diagram-based
  threat model for the modular-monolith design (none exists today — the existing security review
  is a document-based architecture review, not a formal DFD threat model).
- `skills/implementing-threat-modeling-with-mitre-attack`,
  `skills/implementing-attack-surface-management` — relevant for framing AZHL's trust-boundary
  analysis (already present in the security review) against a named external framework.

### Secure coding
- `skills/testing-for-xss-vulnerabilities`, `skills/testing-for-xss-vulnerabilities-with-burpsuite`
  — relevant to `security-architecture.md` §12's XSS design (JSX auto-escaping by default, the one
  real risk surface being `dangerouslySetInnerHTML` for future rich-text news bodies) — use as a
  concrete checklist for that one risk surface, not a general audit, since JSX closes the rest by
  construction.
- `skills/exploiting-sql-injection-vulnerabilities`, `skills/exploiting-nosql-injection-vulnerabilities`,
  `skills/testing-for-xxe-injection-vulnerabilities`, `skills/exploiting-template-injection-vulnerabilities`,
  `skills/exploiting-api-injection-vulnerabilities` — the broader injection-class family; only the
  SQL-injection subset is realistically relevant to AZHL's actual stack (Prisma/Postgres, no XML
  processing, no server-side templating engine in `apps/web`) — cross-check `security-architecture.md`
  §13 against this list once, note the others as not-applicable-to-this-stack rather than silently
  ignoring them.
- `skills/implementing-semgrep-for-custom-sast-rules`, `skills/integrating-sast-into-github-actions-pipeline`,
  `skills/performing-sca-dependency-scanning-with-snyk`, `skills/implementing-devsecops-security-scanning`
  — directly relevant to AZ-S8 ([KNOWN_ISSUES.md](../docs/KNOWN_ISSUES.md)) once CI actually runs;
  a concrete menu of SAST/SCA tooling to select from rather than a recommendation to adopt all of
  them — pick one SAST and one SCA tool, not a stack of overlapping scanners.
- `skills/exploiting-mass-assignment-in-rest-apis` — also listed under API design above; the
  secure-coding angle is the specific implementation pattern it implies (explicit field allow-lists
  on every `PATCH` handler, never `{...req.body}` merged into a Prisma update) — already named as a
  requirement in AZHL's own security review's checklist.

### Architecture reviews
Distinct from **Security reviews** below: an architecture review evaluates a *design* before code
exists (trust boundaries, data flow, module boundaries) — exactly what
`docs/security/09-security-architecture-review.md` already did for AZHL's design-only backend
series. Consult this category when reviewing a *new* design document or a significant change to an
existing one (e.g. before implementing any Stage 2/3 change to `backend-architecture.md`).
- `skills/performing-threat-modeling-with-owasp-threat-dragon`,
  `skills/implementing-threat-modeling-with-mitre-attack` (also listed under Threat modeling below)
  — the concrete methodology for producing a data-flow diagram and trust-boundary table, which
  AZHL's existing review already does in prose form (its Trust Boundary Analysis table) without a
  formal DFD tool — worth applying if a future architecture review needs to communicate the same
  analysis visually.
- `skills/performing-serverless-function-security-review` *(adjacent — closest review-methodology
  skill in the library, not serverless-specific in its transferable value)* — useful for review
  *structure* (scope statement, severity tiers, a required-changes-before-implementation list) —
  AZHL's own review already follows an equivalent structure, so this is a cross-check, not a
  template to adopt fresh.
- No skill in the library is scoped to reviewing a modular-monolith-to-microservices migration
  design specifically (AZHL's actual Stage 1→3 evolution, `backend-architecture.md` §5) — this
  remains AZHL-original architecture-review territory; the library's value here is narrow
  (methodology and OWASP-category coverage cross-checking), not substantive content.

### Security reviews
- `skills/performing-serverless-function-security-review` *(adjacent)* — the closest
  review-methodology skill in the library; AZHL's own `docs/security/09-security-architecture-review.md`
  already exceeds it in AZHL-specific depth, so this is a cross-check for review *structure*
  (scope, trust-boundary table, production-readiness gate), not content.
- The `mappings/owasp/README.md` OWASP Top 10 (2025) skill-count table in the external repo is
  useful for sanity-checking whether AZHL's own security review's category coverage
  (Authorization, Authentication, API Security, Infrastructure, Storage, Event Bus, Logging &
  Audit) is missing an OWASP category the library considers well-populated elsewhere (e.g.
  Cryptographic Failures, A02) — worth a periodic cross-check, not a one-time read.

## What this library does *not* cover for AZHL

Stated explicitly so a future session doesn't assume coverage that isn't there: Redis, Kafka,
BullMQ, and MinIO have no skills under their own names (only adjacent/transferable material, noted
above); nothing in the library is aware of AZHL's specific modular-monolith Event Bus design
(`backend-architecture.md` §3–§5), so ADR-203/ADR-301–304's event-driven-architecture decisions
remain entirely AZHL-original — consult the library for generic "authenticate every message
producer" principles, never for AZHL's actual event envelope or module-boundary design.
