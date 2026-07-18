# Component Library

Inventory, composition conventions, and accessibility requirements for every component tier in
AZHL. Owned by the **UI/UX Architect** agent (visual/interaction consistency) jointly with the
**Frontend Engineer** agent (implementation). See [design-system.md](./design-system.md) for the
tokens these components consume and [architecture.md](./architecture.md) for the monorepo layout
this inventory lives in.

## The four tiers

```
apps/web/src/components/
  ui/          shadcn primitives, themed to AZHL's design tokens
  layout/      Shell, Nav, Footer — app-shell chrome
  league/      StandingsTable, ScheduleList, ScoreCard, StatTile, ArticleCard — domain components
packages/ui/   promoted, cross-app primitives — near-empty by design
```

### `apps/web/src/components/ui` — themed shadcn primitives

Standard shadcn/ui components (Radix primitives underneath), generated via the shadcn CLI then
retheme to AZHL's tokens — never left at shadcn's default palette. Phase 1's set: `Button`,
`Input`, `Select`, `Tabs`, `Dialog`, `Tooltip`, `Badge`, `Skeleton`, `Table` primitives
(`Table`/`TableRow`/`TableCell`), `Separator`. Each is a thin wrapper: shadcn's generated
source + a `cva` variant map pointed at the semantic tokens in
[design-system.md](./design-system.md) (`bg-accent`, `text-foreground-primary`, etc.), not raw
hex values. This tier has no AZHL-specific business logic or copy — it is the generic UI kit.

### `apps/web/src/components/layout` — app shell

`Shell` (page-level wrapper: nav + footer + main content region + skip-link), `Nav` (top nav,
glassmorphism per [design-system.md](./design-system.md#glassmorphism), active-route
highlighting), `Footer` (league info, links). These compose `ui/` primitives and own no data
fetching — `Shell` and `Nav` render static structure and receive already-resolved data (e.g. the
current season label) as props from the Server Component that renders them, not via their own
fetch calls.

### `apps/web/src/components/league` — domain components

The Phase 1 domain vocabulary. Each takes a DTO (or array of DTOs) from `packages/types` as props
and renders it — no service calls, no Prisma, ever (see
[coding-standards.md](./coding-standards.md#services-are-the-source-of-truth)):

| Component | Props (shape) | Notes |
|---|---|---|
| `StandingsTable` | `standings: StandingDTO[]` | Sortable-looking but statically ranked by `rank` (server-computed); see accessibility rules below |
| `ScheduleList` | `games: GameDTO[]`, optional `filter` | Groups by date; each row links to the game center |
| `ScoreCard` | `game: GameDTO` | Used both as a compact schedule-row score and the game-center hero; status-driven color (see below) |
| `StatTile` | `label: string`, `value: string \| number`, optional `trend` | Generic numeric callout used across standings/box score |
| `ArticleCard` | `article: NewsArticleDTO` | News list item; cover image optional (falls back to a text-only card) |

### `packages/ui` — promoted, cross-app primitives

Stays intentionally near-empty until a second real app exists. Today it holds exactly one
component, `Button`, kept there as the **pattern example** (per its
[README](../packages/ui/README.md)) so the promotion shape — `cva` variants, Radix `Slot` for
`asChild`, tokens instead of hardcoded colors — is settled before `apps/admin` needs it in Phase
4. **The promotion rule: a component moves from `apps/web/src/components/*` to `packages/ui` only
once 2+ apps genuinely consume it.** Do not pre-emptively promote `StandingsTable` or any other
`league/` component just because it "feels reusable" — `apps/admin` and `apps/mobile-api` are
scaffolds with no rendering surface yet, so there is no second consumer to justify the move. When
a component is promoted, delete the app-local copy; never maintain two implementations.

## Composition and props conventions

- **Server Components by default.** A `league/` or `layout/` component is a Server Component
  unless it needs interactivity (click handlers, local state, browser APIs) — then, and only
  then, it gets `"use client"` at the top of its own file, kept as small and as low in the tree
  as possible (e.g. a `SortToggle` client island inside an otherwise-server `StandingsTable`, not
  the whole table promoted to client).
- **DTOs in, JSX out.** Components accept the DTO shapes defined in `packages/types`, never raw
  Prisma models. This keeps `packages/ui` and any future `apps/admin` reuse honest — a component
  that only knows about `StandingDTO` doesn't care whether the data came from a direct service
  call or a fetched API response.
- **Variants via `cva`.** Any component with visual variants (button intent, badge status, card
  emphasis) defines them with `class-variance-authority`, not conditional className strings —
  keeps the mapping from prop to token auditable in one place.
- **Composition over configuration.** Prefer children/slots (`<Dialog><DialogTrigger>...`) over a
  single component with a dozen boolean props. This is the shadcn/Radix pattern already and AZHL
  domain components follow the same shape (e.g. `ScoreCard` composes a `TeamBadge` + `ScoreDigits`
  sub-part rather than taking `homeTeamLogoUrl`, `homeTeamName`, ... as ten flat props).
- **No implicit data fetching.** No component in any tier calls a service function or `fetch`.
  Data arrives via props from the Server Component page that renders it. This is the same rule as
  [architecture.md](./architecture.md)'s services→RSC pattern, restated at the component boundary.

## Accessibility requirements per component

Every component ships accessible by default, not as a follow-up pass:

- **Keyboard navigation.** All interactive elements (`Button`, `Tabs`, `Dialog` triggers, nav
  links, sortable table headers) are reachable and operable via `Tab`/`Shift+Tab`/`Enter`/`Space`;
  Radix primitives provide this for free in `ui/` — do not override Radix's built-in keyboard
  handling with custom `onKeyDown` unless extending it.
- **Focus rings.** Every focusable element shows a visible focus ring using the `accent` token
  (see [design-system.md](./design-system.md#signature-accent--arctic-blue)) at a 2px offset
  outline — never `outline: none` without a replacement. Focus rings are not suppressed on
  mouse click either; AZHL does not use `:focus-visible`-only suppression tricks that hide focus
  state from keyboard users in edge cases.
- **`StandingsTable`** uses semantic `<table>` markup (`<th scope="col">` for column headers),
  not styled `<div>` grids, so screen readers announce row/column relationships correctly. Row
  order communicates rank; rank is also present as visible text, not color/position alone.
- **`ScoreCard`** exposes game status (`LIVE`, `FINAL`, `SCHEDULED`, `POSTPONED`) as text, not
  color alone — the `live` red token is a reinforcing signal, never the only signal (WCAG
  "don't rely on color alone"). A `LIVE` badge includes `aria-live="polite"` on the score digits
  so score changes are announced without a full page re-read.
- **`ArticleCard`** cover images always render with `alt` text derived from the article title (or
  an empty `alt=""` only when the image is confirmed purely decorative, which is not the case for
  cover images).
- **`Nav`** includes a skip-to-content link as the first focusable element in `Shell`, and marks
  the current route with `aria-current="page"`.

## Palette/contrast method for stat-tile and table components

`StatTile`, `StandingsTable`, and `ScoreCard` all need to incorporate a **team's own brand colors**
(`colorPrimary`/`colorSecondary`/`colorAccent` on the `Team` model — see
[erd.md](./erd.md#team-implemented)) without breaking WCAG AA, since team colors are
user/admin-authored data, not designed tokens, and cannot be assumed to have safe contrast against
`surface-base` or against each other.

The rule: **team color is applied as a non-text accent, never as a text/background pairing
computed at runtime.** Concretely:

- Team color appears as a thin left-border stripe, an underline, a small logo-container
  background, or a badge dot — always sized and positioned so any contrast shortfall is
  cosmetic, not a legibility failure.
- Text (team name, abbreviation, stats) always renders in the standard `foreground-primary` /
  `foreground-secondary` tokens on a standard `surface-*` token — never "team color text on
  surface" or "surface text on team color fill."
- The one exception is a team's logo container, which may fill with `colorPrimary`, because the
  logo itself (not text) sits on top of it.
- `StatTile` never uses team color as its own background; it stays on `surface-raised` with an
  optional team-color accent stripe matching the rule above.

This keeps every text/background pairing in the product limited to the fixed, pre-verified set in
[design-system.md](./design-system.md), regardless of what colors a team's admin-entered brand
data contains.
