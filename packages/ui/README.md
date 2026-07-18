# @azhl/ui

Cross-app UI primitives — deliberately near-empty right now.

## The promotion rule

A component is added here only once **two or more apps** genuinely consume it. In Phase 1,
only `apps/web` exists as a real app, so almost every component (including the full shadcn/ui
set, `Shell`/`Nav`/`Footer`, and all of `StandingsTable`/`ScheduleList`/`ScoreCard`/`StatTile`/
`ArticleCard`) lives directly in `apps/web/src/components/*`, not here.

`Button` is the one exception, kept here as the **pattern example** so the shape is settled
before `apps/admin` (Phase 4) needs its own buttons: `cva` for variants, Radix `Slot` for
`asChild` composition, Tailwind utility classes referencing design tokens (never hardcoded
colors — see [`../../.claude/design-system.md`](../../.claude/design-system.md)).

When `apps/admin` starts consuming `apps/web` components in Phase 4, promote them here using
the same shape as `Button`, update both apps' imports, and delete the app-local copy — don't
leave two implementations alive.

Tailwind in consuming apps must include this package's `src` in its scan path (Tailwind v4
`@source` directive) since it isn't compiled/pre-styled — see `apps/web`'s global CSS.
