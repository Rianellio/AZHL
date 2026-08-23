# ADR-001: Inter-Module Trust Model — Enforced Security Principal Propagation

- **Status:** Accepted (design). Not yet implemented — no application code exists for this
  decision yet; see [Consequences](#consequences) for implementation prerequisites.
- **Date:** 2026-07-30
- **Deciders:** Chief Architect, Security Engineer, Backend Engineer (per
  [`.claude/ai-workflow.md`](../../.claude/ai-workflow.md) routing)
- **Supersedes:** The informal "modules pass an `AuthContext` object" description in
  [`backend-architecture.md`](../../.claude/backend-architecture.md) §3 rule 2, §11–§12, which this
  ADR replaces with an enforceable mechanism.
- **Remediates:** Finding **C-1** in
  [`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md)

---

## Context

[`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md)
finding C-1 identified that the modular monolith's inter-module authorization model, as designed
in [`backend-architecture.md`](../../.claude/backend-architecture.md) §3 rule 2 and §11–§12, has no
technical enforcement:

> A module needing data from another module calls its public `index.ts` function directly,
> receiving an `AuthContext` (`{ userId, roles, sessionId }`) resolved "by API-layer middleware
> before a module's function is ever called." Nothing in the design prevents any in-process code
> from constructing its own `AuthContext`-shaped object and passing it directly.

This is a **capability-confusion problem**, not a logic bug: `AuthContext` as designed is a plain
data value — "ambient authority" any code can fabricate — rather than a credential whose possession
actually proves anything. In a single Node process (Stage 1 of
[`backend-architecture.md`](../../.claude/backend-architecture.md) §5, and still true through the
optional Stage 2 Redis bridge), there is no language-level barrier between "the HTTP boundary
constructing a context after verifying a real session" and "any other module constructing an
identical-looking object" — both are just object literals.

This decision must:
- Preserve the Modular Monolith architecture and the Services → RSC/API pattern
  ([`architecture.md`](../../.claude/architecture.md)) exactly as designed — no module reorganization,
  no introduction of HTTP calls between modules that live in the same process today.
- Provide **technical enforcement**, not a convention, coding standard, or code-review checklist.
- Not be a Stage-3-only fix — the vulnerability exists today, at Stage 1, before Kafka or any
  service extraction.

---

## Decision

Replace the freely-constructible `AuthContext` data object with an **ambient, capability-gated
Security Principal**, propagated by a mechanism that makes forgery a *language/runtime-level*
impossibility for ordinary module code, not a rule modules are expected to follow.

### 1. What the Principal represents

The **Principal** carries exactly what `AuthContext` already specified —
`{ userId, roles, sessionId }` — plus one addition: `kind`, a closed enum distinguishing *how* this
Principal came to exist:

- `"session"` — a real, currently-authenticated human user (browser session or mobile
  access token, per [`security-architecture.md`](../../.claude/security-architecture.md) §1/§7).
- `"system"` — a scheduled/background operation with no human actor (§7's maintenance and
  cleanup jobs, [`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §12–§13), carrying
  a fixed, minimal, hardcoded permission set — never `ADMIN`'s full permission set, per
  least-privilege.
- `"anonymous"` — an explicit, first-class representation of "no authenticated identity,"
  used for `Public`-level requests ([`api-specification.md`](../../.claude/api-specification.md)
  §1.3) — so "no Principal was ever bound" (a bug) and "the caller is legitimately anonymous" (an
  expected state) are never confused with each other.

The Principal type is **nominally typed (branded)** in TypeScript — it carries a private,
non-exported brand field that cannot be reproduced by an ordinary object literal, so
`{ userId, roles: ["ADMIN"] } as Principal` requires an explicit `as`-cast that a lint rule
(§10) flags anywhere outside the one module allowed to construct it. This is a compile-time
enforcement layer, independent of and additional to the runtime enforcement in §2–§4 below — a
forgery attempt is visible in a diff and blocked in CI before it can even run.

### 2. Who is allowed to create it

Exactly three call sites, all narrowly scoped and none of them a "business module":

- The **HTTP boundary** — the thin adapter layer already described in
  [`api-specification.md`](../../.claude/api-specification.md) §10's request-lifecycle diagram
  (Next.js middleware / the top of every route handler and every Server Component page that needs
  identity) — verifies a session cookie or bearer token and mints a `"session"` Principal.
- The **worker bootstrap** — the entry point of the BullMQ worker deployment
  ([`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §2) — mints a `"system"`
  Principal for scheduled jobs that run with no incoming request.
- Nowhere else. No business module (`packages/modules/*`) ever constructs a Principal — only
  *reads* one (§4).

This is enforced the same way [`architecture.md`](../../.claude/architecture.md) already enforces
"packages never import from `apps/*`": via a **new package**,
`packages/platform/security-context`, whose `package.json` `exports` map exposes only a read
surface (`getCurrentPrincipal()`, `requirePrincipal()`). The mint/bind function is not listed in
that map at all — Node's module resolution throws `ERR_PACKAGE_PATH_NOT_EXPORTED` for any import
that isn't in the `exports` map, regardless of how the importing code tries to reach it (no
relative-path escape hatch, unlike a bare lint rule). This is a **runtime-enforced** boundary, not
a static-analysis-only one.

The mint/bind function itself additionally requires an unforgeable **capability token** — a
module-private `Symbol()`, held only by a second, even more narrowly-scoped package,
`packages/platform/http-boundary`, and never exported from it either. `Symbol()` values are
language-guaranteed unique and uncopyable (`Symbol() !== Symbol()`, always, even with identical
descriptions) — a caller cannot construct or guess an equivalent token, only receive the exact
reference. Only the three call sites in this section ever hold that reference.

### 3. How authenticity/integrity is verified

Two mechanisms, matched to two different kinds of boundary a Principal ever crosses:

- **Within one process, one request (the common case):** identity/reference-based, not
  cryptographic. The Principal lives in a `AsyncLocalStorage` store owned privately by
  `security-context`; every module reads it via `getCurrentPrincipal()`. Because the *write*
  capability is gated by §2's Symbol + restricted package exports, "this value is genuinely the one
  the HTTP boundary bound for this request" is guaranteed by reference identity within the same
  memory space — cryptographic signing would add cost here (RSA/HMAC operations on every module
  call) without adding a security property that reference-unforgeability doesn't already provide
  in-process.
- **Crossing an async/process boundary (a BullMQ job payload today; a Kafka message at Stage 3,
  §8):** the Principal no longer lives in shared memory — it must be serialized, at which point
  reference-identity guarantees vanish. Here, and only here, the Principal is signed: a
  **separate, dedicated key pair** ("Internal Principal Token" — IPT), distinct from the
  external-facing access-token key already designed in
  [`security-architecture.md`](../../.claude/security-architecture.md) §1, so a compromise of one
  key domain does not automatically compromise the other. `mintPropagationToken()` takes **no
  caller-supplied claims at all** — it reads and signs only whatever Principal is *already*
  ambient in the current `AsyncLocalStorage` scope, so even a module with legitimate access to this
  function can only ever attest to the identity it already legitimately has, never fabricate a
  different one. The consuming worker/service calls `verifyPrincipalToken()` (IPT public key) before
  trusting the embedded Principal — the exact same signature-verification pattern
  [`security-architecture.md`](../../.claude/security-architecture.md) §1 already specifies for
  mobile access tokens, reused rather than reinvented.

### 4. How modules call each other without allowing forged privileges

**Modules stop accepting a Principal/`AuthContext` as an explicit function parameter entirely.**
This removes the forgery surface by construction rather than by validation: there is no parameter
for a caller to substitute a forged value into. A module's public function that needs identity
calls `requirePrincipal()` (throws `UnauthorizedError` if none is bound — fail-closed, matching
[`security-architecture.md`](../../.claude/security-architecture.md)'s existing fail-closed
principle) and gets exactly the one Principal the HTTP boundary bound for this request — the same
value every other module in the same call chain sees, un-substitutable by any of them.

[`backend-architecture.md`](../../.claude/backend-architecture.md) §3 rule 2 ("synchronous
cross-module reads go through the owning module's public `index.ts`") is unchanged in spirit —
Module A still calls Module B's exported function directly, in-process, exactly as designed. What
changes is only that the function signature no longer has an identity parameter to forge.

### 5. How RBAC and permissions interact with the new model

[`backend-architecture.md`](../../.claude/backend-architecture.md) §12's `can(context, action,
resource)` is unchanged in shape, renamed in provenance: `can(principal, action, resource)` still
does the same permission-set lookup against
[`database-erd.md`](../../.claude/database-erd.md) §4's `roles`/`permissions` tables — the only
change is that its `principal` argument is now always a value obtained from
`requirePrincipal()`/`getCurrentPrincipal()`, never a value a caller constructs to pass in. RBAC's
correctness was always contingent on the integrity of the context it evaluates
(security-architecture-review.md's Authorization Review section made this point directly); this
ADR is what makes that contingency actually hold.

### 6. How privileged operations are protected

A new required wrapper, `definePrivilegedOperation(permission, handler)`, is the **only** sanctioned
way to define a module's write operations. It resolves `requirePrincipal()`, checks `can()`
against the declared `permission`, and only then invokes `handler` — a developer cannot define a
privileged operation that skips the check, because there is no alternative code path that both (a)
is exported from a module's public surface and (b) omits the wrapper, per §10's lint enforcement.
This converts "did every privileged function remember to check permissions" from a
per-function-audit question into a single, centrally-verified property of one wrapper.

### 7. How this works inside the current process

1. A request arrives — an HTTP route handler, or a Server Component page needing data.
2. The HTTP boundary (§2) verifies the session cookie / bearer token exactly as
   [`security-architecture.md`](../../.claude/security-architecture.md) §1/§7 already designs, and
   calls `bindPrincipal(capabilityToken, principal, () => renderOrHandle())`.
3. Everything invoked inside that callback — the route handler's body, every module function it
   calls, every module function *those* call — executes inside the same `AsyncLocalStorage` scope
   and observes the identical Principal via `getCurrentPrincipal()`.
4. No parameter threading is required through the call chain — this is `AsyncLocalStorage`'s
   purpose (the same Node-native pattern OpenTelemetry uses to propagate trace context, per
   [`observability-architecture.md`](../../.claude/observability-architecture.md) §7's already-planned
   OpenTelemetry adoption — this ADR reuses a mechanism the platform was already committing to for
   a different purpose).
5. If a module enqueues a BullMQ job as a result (crossing the process boundary,
   [`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §1), it calls
   `mintPropagationToken()` and includes the resulting signed token in the job payload; the worker,
   on pickup, calls `verifyPrincipalToken()` and rebinds a Principal into *its own*
   `AsyncLocalStorage` scope for the duration of that job — the ambient-read pattern (§4) holds
   inside the worker process too, unchanged.

### 8. Evolution to distributed services/Kafka without redesigning the security model

This is the design's central property, not an afterthought: **the cross-process path (§3's signed
IPT) is not new infrastructure built for Stage 3 — it already exists at Stage 1**, because BullMQ
job payloads already needed it. When a module is extracted into its own service per
[`backend-architecture.md`](../../.claude/backend-architecture.md) §5's checklist, its in-process
callers become network callers, and the only change is *which path* a given call uses more often:
`AsyncLocalStorage` (§3, same-process) simply stops applying to that specific call, and the
already-designed signed-IPT path (§3, cross-process) becomes the one it uses instead — carried in
an HTTP header or gRPC metadata for direct service calls, or in Kafka message headers for
event-driven ones (extending
[`observability-architecture.md`](../../.claude/observability-architecture.md) §13's W3C Trace
Context propagation plan, which already establishes that Kafka headers are where cross-service
context travels). No new signature scheme, no new key infrastructure, no new verification logic —
Stage 3 uses more of a mechanism Stage 1 already has, rather than inventing one under migration
pressure.

### 9. What happens if one module is compromised

Two distinct blast radii, stated honestly rather than optimistically:

- **A compromised module attempting to *escalate* beyond its own legitimate access** — construct a
  forged elevated Principal, or call another module's privileged operation while pretending to be a
  different, more powerful caller — is what this ADR specifically defeats: it cannot obtain a
  Symbol reference it was never given, cannot import a function Node's module resolution refuses to
  resolve, and cannot pass a forged Principal as a parameter to a function that no longer accepts
  one.
- **A compromised module acting entirely within its *own* already-legitimate scope** (a malicious
  dependency inside, say, the Media module doing damage using exactly the database schema access
  and permissions the Media module was always meant to have) is **not** solved by this ADR and
  cannot be solved by any in-process mechanism — this is an inherent property of multiple modules
  sharing one operating-system process with no memory isolation between them. This is the
  fundamental limit of Stage 1's architecture, and it is exactly what Stage 3's process-level
  extraction (§8) is the *real* fix for, not this ADR. This ADR raises the cost of C-1's specific
  attack from "one line of ordinary-looking code" to "defeat Node's module-resolution enforcement,
  forge a language-level-unforgeable Symbol or an RSA signature, or achieve arbitrary code
  execution in the process" — a substantial, meaningful improvement, but not an absolute one, and
  this ADR does not claim otherwise. Dependency/supply-chain scanning
  ([H-5 in the security review](../security/09-security-architecture-review.md)) and least-privilege
  per-module database credentials
  ([`backend-architecture.md`](../../.claude/backend-architecture.md) §6) remain necessary,
  independent defenses against this second blast radius — this ADR does not replace them.

### 10. Tests and architectural constraints to prevent regression

- **Module-boundary fitness function** (dependency-cruiser or equivalent, run in CI): fails the
  build if any package other than `packages/platform/http-boundary` imports
  `packages/platform/security-context`'s internal bind path, or if any package other than the
  worker bootstrap imports the `"system"`-Principal minting function.
- **Lint rule banning `as Principal`/`as AuthContext` type assertions** outside
  `packages/platform/security-context` and `packages/platform/http-boundary` themselves — makes
  any attempted forgery-via-type-cast fail CI, visibly, in the diff that introduced it.
- **Static signature check**: no exported function under `packages/modules/*/index.ts` may declare
  a parameter typed `Principal`/`AuthContext` — a module accepting identity as a caller-suppliable
  argument at all is itself the regression this ADR closes; the check catches the *shape* of the
  mistake, not just a specific forged value.
- **Unit test: fail-closed default.** `getCurrentPrincipal()` returns `undefined` (not a default
  "trust everyone" value) outside any bound scope; `requirePrincipal()` throws.
- **Unit test: confused-deputy attempt.** A module manually constructs an
  `{ userId, roles: ["ADMIN"] }`-shaped object and calls another module's exported function with it
  — passes only if the call *cannot compile* (no parameter accepts it, per the static check above)
  or, for any residual dynamic path, throws at runtime rather than being honored.
- **Unit test: propagation token minting reflects ambient identity only.** Calling
  `mintPropagationToken()` under a `"session"` Principal for user X can never produce a token
  claiming to be user Y or an elevated role X does not hold — the function takes no claims
  parameter, so this is really a regression test that the function's signature hasn't grown one.
- **Integration test: cross-process round trip.** A BullMQ job enqueued under a real Principal, on
  pickup by the worker, rebinds the *same* `userId`/`roles` — not a downgraded-to-empty value and
  not a silently-different one — proving §3/§7's handoff is lossless and unforgeable end to end.

---

## Consequences

### Security properties gained

- Forging an elevated Principal in-process now requires defeating Node.js's own module-resolution
  enforcement and/or JavaScript's `Symbol` uniqueness guarantee, or an attacker's code achieving
  full arbitrary code execution in the process — not simply writing an ordinary-looking object
  literal, which is what C-1 identified as trivially possible today.
- Cross-process/queue propagation of identity is cryptographically verified using a key domain
  independent of external-facing authentication, so a compromise of one does not automatically
  compromise the other.
- RBAC's correctness (a well-designed system already, per the security review's Authorization
  Review) is no longer contingent on an unenforced assumption — the input it evaluates is now
  guaranteed genuine.
- The identical mechanism serves Stage 1 (in-process) and Stage 3 (distributed) without a
  redesign — §8's evolution path is a property of the design, not a promise about future work.
- Two independent enforcement layers exist (compile-time branded-type/lint, and runtime
  reference/signature checks) — a gap in one is not a single point of failure for the whole
  property.

### Tradeoffs

- **New required infrastructure before any module can be implemented**: `packages/platform/
  security-context` and `packages/platform/http-boundary` must exist and be correct before the
  first business module is built against them — this is a prerequisite, not an optional hardening
  pass added later, which was explicit in the original request ("start ONLY with C-1... do not
  implement code yet").
- **A learning-curve cost**: developers accustomed to passing an explicit context parameter must
  instead call `requirePrincipal()`/use `definePrivilegedOperation()` — a different, less
  immediately-obvious pattern than a function parameter, mitigated by §10's static checks catching
  the old pattern immediately rather than relying on developers discovering the new one
  unprompted.
- **`AsyncLocalStorage` has a small, measurable performance cost** relative to plain parameter
  passing — accepted, since it is orders of magnitude cheaper than signing every in-process call
  (the alternative this ADR explicitly rejects, below) and is the same mechanism already planned
  for tracing context ([`observability-architecture.md`](../../.claude/observability-architecture.md)
  §7), so the cost is not newly introduced by this decision alone.
- **Does not fully solve compromised-module blast radius** (§9) — stated as an explicit, honest
  limit rather than implied to be solved; full isolation is Stage 3's job, not this ADR's.

### Alternatives considered

- **Status quo — passed-parameter `AuthContext`, enforced by code review/convention.** Rejected:
  this is precisely what C-1 found insufficient; a convention is not a technical control.
- **Cryptographically sign every in-process call's context (RS256/HMAC universally, not just at
  async boundaries).** Rejected as unnecessary cost for no additional security property in-process
  — reference-based unforgeability via `AsyncLocalStorage` + a private `Symbol` capability is
  equally strong within one memory space, at a fraction of the CPU cost, reserving cryptography for
  exactly the boundary (serialization) where reference identity stops being meaningful.
- **A full dependency-injection framework with request-scoped providers** (e.g. a NestJS-style DI
  container). Rejected: would work, but introduces a much larger architectural dependency and
  learning curve than the problem requires, and doesn't naturally extend to the cross-process case
  the way a signed-token mechanism does — would need a second, different mechanism for §3's
  async-boundary case anyway, undermining the "one mechanism, two stages" property this ADR
  specifically optimizes for (§8).
- **Stack-inspection-based caller verification** (checking `Error().stack` to determine which file
  is calling). Rejected outright: a well-known JavaScript anti-pattern — fragile across bundlers/
  minification, trivially spoofable, and not a real security boundary in any meaningful sense.
- **Defer the fix entirely until Stage 3's process isolation makes it moot.** Rejected: C-1 is
  exploitable today, at Stage 1, before any service extraction — "wait for microservices" would
  leave the platform's entire pre-extraction lifetime unprotected, likely years given
  [`roadmap.md`](../../.claude/roadmap.md)'s phasing.

---

## Related documents

- Remediates: [`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md) — finding C-1
- Extends: [`backend-architecture.md`](../../.claude/backend-architecture.md) §1, §3, §6, §9, §11–§12
- Reuses key infrastructure from: [`security-architecture.md`](../../.claude/security-architecture.md) §1 (signing pattern), §3 (RBAC)
- Reuses the propagation mechanism planned for: [`observability-architecture.md`](../../.claude/observability-architecture.md) §7 (`AsyncLocalStorage`/trace context), §13 (Kafka header propagation)
- Cross-process carrier for: [`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §1
