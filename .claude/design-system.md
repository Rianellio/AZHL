# Design System

The visual language for AZHL: color, type, spacing, motion (summary), and glassmorphism rules.
Owned by the **UI/UX Architect** agent. See [architecture.md](./architecture.md) for the stack
this is implemented on (Tailwind CSS v4 + shadcn/ui), [component-library.md](./component-library.md)
for how these tokens are consumed by components, and [animation-guidelines.md](./animation-guidelines.md)
for the full motion spec (this doc only summarizes motion tokens).

## Dark-mode-first

AZHL ships **dark-only in Phase 1**. Light mode is a documented future toggle, not a parallel
build: every token below is defined as a semantic Tailwind theme variable (`bg-surface-base`,
`text-foreground-primary`, etc.), never consumed as a raw hex value in component code. That
indirection is what makes a future light theme a token-swap (add a `[data-theme="light"]` block
mapping the same semantic names to light values) instead of a rewrite. Do not hardcode hex colors
in `apps/web` components — reference the theme tokens defined in `apps/web`'s Tailwind config,
which mirror the names in this document.

## Color palette

### Surfaces (near-black base, layered)

| Token | Hex | Usage |
|---|---|---|
| `surface-base` | `#0A0B0D` | App background, the darkest layer |
| `surface-raised` | `#131417` | Cards, table rows, elevated panels (1 layer up) |
| `surface-overlay` | `#1B1D21` | Modals, popovers, dropdown menus (2 layers up) |
| `surface-hover` | `#202226` | Hover/active state fill for interactive rows and cards |
| `border-subtle` | `#2A2D33` | Hairline dividers, card borders, table rules |
| `border-strong` | `#3A3E46` | Focus-adjacent or emphasized borders (not focus rings, see below) |

Each surface step is a deliberate, small luminance increase (roughly +2-3% per layer) so depth
reads through layering, not through shadow — shadows are used sparingly (`surface-overlay`
elements only) since large soft shadows on near-black backgrounds are barely visible and cost
paint time for nothing.

### Foreground (ice-white)

| Token | Hex | Usage | Contrast on `surface-base` |
|---|---|---|---|
| `foreground-primary` | `#F5F7FA` | Headlines, primary body text, key stats | ~18.5:1 (AAA) |
| `foreground-secondary` | `#A8AEB8` | Secondary text, captions, table labels | ~8.9:1 (AAA) |
| `foreground-tertiary` | `#6B7180` | Disabled text, placeholders, least-important metadata | ~4.6:1 (AA, normal text floor) |

`foreground-tertiary` is the contrast floor — never go dimmer for text that needs to be read, only
for genuinely decorative or disabled affordances.

### Signature accent — Arctic Blue

One cold accent, used for primary actions, links, active/selected states, and data highlights
(e.g. the leading team in a standings sparkline).

| Token | Hex | Usage | Contrast on `surface-base` |
|---|---|---|---|
| `accent` | `#2F8FFF` | Primary buttons, active nav item, focus rings, links | ~4.7:1 (AA for normal text; use for text ≤ this weight only when size ≥ 14px/500) |
| `accent-hover` | `#5CA8FF` | Hover/pressed state for accent-filled controls | ~6.3:1 |
| `accent-muted` | `#1C3A5E` | Low-emphasis accent fill (selected row background, badges) | background only, not for text |
| `accent-tint` | `#B9DBFF` | Text placed *on* `accent`-filled surfaces (e.g. primary button label) | ~11.2:1 on `accent` |

Rule: `accent` on `surface-base` clears AA for UI text and large text; for small body text prefer
`foreground-primary` with `accent` reserved for the interactive element itself (icon, underline,
border) rather than long runs of blue text.

### Reserved red — LIVE / alert only

| Token | Hex | Usage | Contrast on `surface-base` |
|---|---|---|---|
| `live` | `#FF3B45` | LIVE badge, live score pulse, destructive/error states only | ~4.9:1 |
| `live-muted` | `#3D1418` | Background fill behind a LIVE badge or alert banner | background only |

Red is not a general "important" color. It appears in exactly two contexts: a game's `LIVE`
status (badge, score-bug accent) and error/destructive UI (form validation, destructive dialog
actions). Using it anywhere else dilutes its signal value — see
[component-library.md](./component-library.md) for the `ScoreCard` status-color rule.

### Verifying contrast

Contrast ratios above are computed against `surface-base` (`#0A0B0D`) at the token's literal hex.
When a token sits on a different surface (e.g. `foreground-secondary` on `surface-raised`), the
ratio only improves (raised surfaces are lighter, increasing contrast against light foregrounds) —
so `surface-base` is treated as the worst-case check. Any new token must be checked against
`surface-base` before being added to this table; do not eyeball it.

## Type scale

Two font roles, both loaded via `next/font/google` (Inter for UI/body, Space Grotesk for
display), which Next.js downloads and self-hosts at build time — no runtime requests to
Google's CDN, no separate font files to vendor. See [architecture.md](./architecture.md).

- **Display** — a confident, slightly condensed grotesk for headlines, hero numbers, and section
  titles. Wide weight range (400-800) so hierarchy comes from weight + size, not extra families.
- **UI/Text** — a neutral grotesk with strong tabular figures, used for body copy, labels, and all
  data-dense surfaces (tables, stat grids). Tabular (non-proportional) figures are mandatory for
  any column of numbers (standings, box scores) so digits align vertically.

| Token | Face | Size (rem / px) | Weight | Line-height | Usage |
|---|---|---|---|---|---|
| `display-2xl` | Display | 4.5rem / 72px | 700 | 1.0 | Hero headline (home page) |
| `display-xl` | Display | 3rem / 48px | 700 | 1.05 | Page titles (Standings, Schedule, News) |
| `display-lg` | Display | 2.25rem / 36px | 600 | 1.1 | Section headers, score-bug final score |
| `display-md` | Display | 1.5rem / 24px | 600 | 1.2 | Card titles, article headlines in lists |
| `ui-lg` | UI | 1.125rem / 18px | 500 | 1.4 | Lead paragraph, nav links |
| `ui-base` | UI | 1rem / 16px | 400 | 1.5 | Body copy, default UI text |
| `ui-sm` | UI | 0.875rem / 14px | 400 | 1.45 | Secondary labels, table headers |
| `ui-xs` | UI | 0.75rem / 12px | 500 | 1.35 | Micro-labels, timestamps, badges (uppercase + letter-spacing) |
| `stat-tabular` | UI (tabular figures) | matches context | 600 | 1 | Any numeric table cell: standings columns, box score, jersey numbers |

Rule of thumb: `display-*` never appears in a table cell; `stat-tabular` never appears in
prose. Mixing them is the most common design-system violation to catch in review.

## Spacing & radius scale

4px base unit, Tailwind's default spacing scale used as-is (no custom multiplier) so the scale
stays predictable: `1` = 4px, `2` = 8px, `3` = 12px, `4` = 16px, `6` = 24px, `8` = 32px,
`12` = 48px, `16` = 64px, `24` = 96px. Section-level vertical rhythm uses `16`/`24`; component
internal padding uses `2`-`6`; icon-to-label gaps use `1`-`2`.

| Radius token | Value | Usage |
|---|---|---|
| `radius-sm` | 4px | Badges, small buttons, input fields |
| `radius-md` | 8px | Cards, dialogs, table containers |
| `radius-lg` | 12px | Hero panels, large media containers |
| `radius-xl` | 16px | Full-bleed section cards (game center hero) |
| `radius-full` | 9999px | Pills, avatars, team logo containers |

## Motion tokens (summary)

Full spec, easing curves, and code patterns live in
[animation-guidelines.md](./animation-guidelines.md). At the token level:

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `motion-quick` | 150ms | `ease-out-quick` | Hover, press, focus, toggle — physical, immediate |
| `motion-cinematic` | 400-600ms | `ease-out-cinematic` | Page/section entrances, data reveals |

Every animated interaction is gated behind `prefers-reduced-motion`; see
[animation-guidelines.md](./animation-guidelines.md#reduced-motion) for the implementation
pattern.

## Glassmorphism

Used **sparingly and only in two places**:

1. **Nav bar** — sticky top nav uses a translucent `surface-base` fill (~72% opacity) with
   `backdrop-blur` (16px) and a 1px `border-subtle` bottom edge, so page content scrolling
   underneath stays legible but the nav reads as a distinct layer.
2. **Score overlays** — the live score bug / game-center hero overlay sits on top of an image or
   video background using the same translucent-fill-plus-blur treatment, at up to 24px blur, always paired
   with a solid-enough fill (≥ 65% opacity) that `foreground-primary` text over it still clears
   AA contrast.

Glassmorphism is **forbidden** on large content surfaces — article bodies, standings tables,
schedule lists, stat grids. Two reasons: legibility (blurred, semi-transparent backgrounds behind
dense text or numbers fail contrast checks unpredictably as content scrolls behind them) and
performance (`backdrop-filter` is expensive to composite over large, frequently-repainted areas).
Cards and tables use solid `surface-raised`/`surface-overlay` fills instead. See
[animation-guidelines.md](./animation-guidelines.md#glassmorphism-perf) for the performance
rationale in more detail.
