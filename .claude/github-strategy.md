# GitHub Strategy

Branch strategy, commit conventions, and PR process for AZHL. Owned day-to-day by DevOps
Engineer (see [agents/devops-engineer.md](./agents/devops-engineer.md)); go-live sequencing is
recorded in [roadmap.md](./roadmap.md)'s Future phase. **Read the "Current state" section below
first** — this doc describes the process as it will run once a remote exists, and is explicit
about what's real today versus what's prepared-but-dormant.

## Branch strategy

- **`main`** — protected, production. Always deployable. Only receives merges from `develop`
  (releases) or an urgent `hotfix/*` branch. No direct commits once a remote/CI exist.
- **`develop`** — integration branch. Feature branches merge here first; this is where Phase
  work accumulates before it's cut into a release to `main`.
- **`feature/*`** — short-lived, one branch per unit of work (e.g. `feature/standings-page`,
  `feature/database-seed-script`). Branches off `develop`, merges back into `develop`, deleted
  after merge. Naming: `feature/<kebab-case-description>`, scoped small enough to map to a
  single PR.
- **`hotfix/*`** — short-lived, branches off `main` for urgent production fixes, merges back
  into both `main` and `develop`. Not expected to be used before a production deployment exists.

This mirrors standard trunk-adjacent Git flow, chosen over a strict single-trunk model because
AZHL will eventually have real deploy cadence differences between `apps/web` (ships often) and
`apps/admin`/`apps/mobile-api` (ship on their own phase-driven cadence) — `develop` gives a
stable integration point without blocking `main`.

## Conventional Commits

Enforced via commitlint + Husky's `commit-msg` hook (`commitlint.config.js`, `.husky/`), even
though there's no remote to run CI checks yet — local commit hygiene starts on day one so
history is clean when a remote eventually exists. Format:

```
<type>(<scope>): <short summary>
```

`type` follows `@commitlint/config-conventional` (`feat`, `fix`, `chore`, `refactor`, `docs`,
`test`, `ci`, `style`, `perf`, `build`, `revert`). `scope` is restricted by `scope-enum` in
`commitlint.config.js` to the monorepo's actual apps/packages plus three cross-cutting scopes:

`web`, `admin`, `mobile-api`, `database`, `ui`, `types`, `utils`, `config`, `repo`, `ci`, `docs`

AZHL-specific examples:

```
feat(web): add standings page
fix(database): correct standings point calculation
feat(database): add Player model for game center box scores
chore(config): raise shared tsconfig target to ES2022
docs(docs): add engineering-principles.md to .claude knowledge base
feat(ui): promote Button primitive from apps/web
ci(ci): add typecheck step to ci.yml
fix(web): correct schedule timezone rendering on game center
refactor(utils): extract date formatting shared by standings and schedule
chore(repo): configure Husky commit-msg hook
```

Use `repo` for changes that don't belong to a single app/package (root tooling, workspace
config); use `docs` scope specifically for `.claude/` and `README.md` changes when the change
isn't better scoped to the package the docs describe (e.g. a `database-guidelines.md` update
tied to a schema change can use `database` instead).

## PR process and CI gate

Once a remote exists, the process is: branch from `develop` → commit with Conventional Commits →
open a PR into `develop` → `.github/workflows/ci.yml` runs lint, typecheck, test, and build
across the Turborepo graph → AI Code Reviewer's review (see
[ai-workflow.md](./ai-workflow.md)) is expected to have already run locally before the PR opens,
not as a substitute for CI → merge only once CI is green and any Chief Architect sign-off
required for cross-boundary changes (see
[agents/chief-architect.md](./agents/chief-architect.md)) is recorded. `main` only receives
merges from `develop` when a release is cut, never a direct feature merge.

`.github/workflows/ci.yml` is already written and valid — it simply has nothing to run against
until a remote exists (see below).

## Current state: local git only

**There is no GitHub remote for AZHL right now, and that is an explicit, confirmed decision —
not an oversight.** What exists today:

- `git init` locally, with `main`/`develop`/`feature/*` conventions followed even without a
  remote to enforce them via branch protection.
- Husky + commitlint enforcing Conventional Commits on every local commit.
- `.github/workflows/ci.yml` written and ready, but unused — there's no remote for GitHub
  Actions to run against.

Do not create a remote, run `gh repo create`, or push anywhere as part of routine work. If a
task seems to require a remote (opening a PR, triggering CI, adding branch protection), that's a
signal the task is out of scope for the current phase — flag it per
[MASTER_SYSTEM_PROMPT.md](./MASTER_SYSTEM_PROMPT.md) rule 5, don't work around the absence of a
remote.

## Go-live checklist (Future phase)

Per [roadmap.md](./roadmap.md)'s Future phase, when a GitHub remote is ready to go live:

1. Create the remote repository, push `main` and `develop`.
2. Enable branch protection on `main` (require PR, require CI green, require at least the
   AI Code Reviewer pass recorded, no force-push).
3. Enable branch protection on `develop` (require PR, require CI green).
4. Confirm `.github/workflows/ci.yml` runs successfully on the first pushed PR before relying on
   it as a merge gate.
5. Connect the repository to Vercel for preview deployments (see
   [future-services.md](./future-services.md)'s Vercel go-live plan) once the remote exists,
   since Vercel's preview-deployment flow depends on GitHub PRs.
6. Update this doc's "Current state" section to reflect the remote's existence — this checklist
   item is not optional; a stale "local git only" note after go-live is exactly the kind of doc
   drift [CLAUDE.md](./CLAUDE.md) warns against.
