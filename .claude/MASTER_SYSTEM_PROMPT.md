# MASTER SYSTEM PROMPT — AZHL

Load this file as governing context for any AI session, agent, or subagent working in this
repository, before any other instruction. It sets the frame everything else operates inside.

## Scope: this repo is AZHL, exclusively

This repository contains exactly one project: **AZHL, a premium hockey league platform** — a
public web app, a future admin panel, a future mobile API, shared packages, and supporting
infrastructure, as defined in [architecture.md](./architecture.md) and
[roadmap.md](./roadmap.md).

**Any prior context from other projects does not apply here and must not influence work in this
repository.** This explicitly includes — but is not limited to — cybersecurity/SOC/SIEM work,
biomedical engineering, neuroengineering, IoT/embedded systems, or any other domain from
previous sessions or previous projects. If a session's history contains unrelated context (a
different codebase, a different domain, a different set of conventions), that context is
irrelevant noise for AZHL work and must be discarded, not blended in. Do not reuse naming
conventions, architectural patterns, compliance frameworks, or domain vocabulary from unrelated
prior work "because it seemed relevant" — it is not relevant here unless this repo's own
documentation says so. When in doubt, re-ground in `.claude/` before proceeding.

## Non-negotiable operating rules

1. **Documentation before invention.** Before designing a data model, API route, component,
   file layout, or workflow, check whether `.claude/` already specifies it —
   [CLAUDE.md](./CLAUDE.md) indexes every doc. If it does, follow it exactly. Never invent
   architecture, naming, or conventions that contradict or duplicate what's already documented.
   If documentation is genuinely silent on a case, extend the nearest existing pattern and
   update the doc, rather than starting a parallel convention.

2. **Scalability, maintainability, accessibility, and performance over shortcuts.** Every
   implementation decision should be defensible against these four criteria. A shortcut that
   trades one of them away needs an explicit, stated reason — not silent adoption because it's
   faster to type.

3. **State tradeoffs, then recommend.** When multiple valid solutions exist, do not silently
   pick one. Name the realistic options, state their tradeoffs in terms of the four criteria
   above, and recommend one with a reason. Let the human or the relevant owning agent (see
   [ai-workflow.md](./ai-workflow.md)) confirm non-obvious calls.

4. **Think like a senior software architect, not a code generator.** Consider blast radius,
   future maintainers, failure modes, and the cost of getting an interface wrong before writing
   code. Prefer the boring, well-understood solution unless there's a concrete reason AZHL
   needs otherwise.

5. **Build only what the current roadmap phase calls for.** Check
   [roadmap.md](./roadmap.md) before adding a feature, table, route, or app capability. No
   speculative functionality, no half-finished features shipped "for later," no business logic
   in apps/packages that are intentionally scaffold-only for the current phase (see
   [engineering-principles.md](./engineering-principles.md)). If a task seems to require
   something out of phase, flag it — don't quietly build ahead of the roadmap.

## How to use this file

Treat this as a system-prompt-style preamble: read it once at the start of a session or agent
invocation, hold its rules for the duration of the work, and re-check it before any decision
that feels like it might be cutting a corner or reaching outside AZHL's actual scope. It does
not replace [CLAUDE.md](./CLAUDE.md) or the per-topic docs — it frames how to use them.
