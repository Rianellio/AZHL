# Animation Guidelines

Motion tokens, the `prefers-reduced-motion` rule, and the performance budget every animated
interaction in AZHL follows. Owned by the **Animation Engineer** agent. See
[design-system.md](./design-system.md#motion-tokens-summary) for the token summary this doc
expands on, and [product-vision.md](./product-vision.md) for why motion is a pillar ("cinematic
motion... never as decoration") rather than incidental polish.

## Motion tokens

Two named easing curves, two duration bands — everything animated in AZHL picks from this set
rather than inventing a one-off duration/curve per component:

| Token | Duration | Cubic-bezier | Character | Usage |
|---|---|---|---|---|
| `ease-out-quick` | 150ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Snappy, physical, immediate | Hover, press/active, focus ring appearance, toggle/switch state, tooltip show |
| `ease-out-cinematic` | 400-600ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Fast start, long soft settle | Page transitions, section/hero entrances, data reveals (standings rows staggering in, a score updating) |

`ease-out-quick` mirrors direct manipulation — the user pressed something, the response is
instant and physical, matching real-world input latency expectations. `ease-out-cinematic` is a
pronounced "expo-out" curve deliberately borrowed from the NHL.com/Apple/Vercel school of
entrance motion: most of the movement resolves quickly, then eases into place with an unhurried
tail, which is what reads as "cinematic" rather than "mechanical" at longer durations. Do not use
`ease-out-cinematic` for anything under ~300ms (it reads as sluggish at short durations) or
`ease-out-quick` for anything over ~200ms (it reads as abrupt/unfinished at longer ones).

Stagger children (e.g. standings rows revealing in sequence) use a small per-item delay (40-60ms)
on top of `ease-out-cinematic`, capped so a full table never takes longer than ~600ms total to
finish revealing regardless of row count — cap the stagger delay function, don't let it scale
linearly with an unbounded list.

## Reduced motion

Every animated interaction is gated behind the user's `prefers-reduced-motion` setting, using the
`motion` library's `useReducedMotion` hook — never a raw media query duplicated per component:

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";

export function SectionReveal({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
```

Rule: when `shouldReduceMotion` is true, content still reaches its final state (nothing is
permanently hidden or broken), it simply arrives without a transform/opacity animation —
`initial={false}` skips the enter animation entirely rather than playing a shortened version of
it. This applies uniformly: hover/press micro-interactions collapse to instant state changes,
cinematic entrances collapse to instant final-state renders. Reduced motion is never treated as
"animate faster" — it means "don't animate."

## Performance budget

Target: every animation holds 60fps (a 16.6ms frame budget) on mid-tier hardware, since motion is
a stated product pillar and a janky "cinematic" entrance is worse than no entrance at all.

- **Animate only `transform` and `opacity`.** These are the two CSS properties the browser can
  animate on the compositor thread without triggering layout or paint. Never animate `width`,
  `height`, `top`/`left`, `margin`, or `padding` — use `transform: translate/scale` instead (e.g.
  a card "growing" on hover animates `transform: scale(1.02)`, not `width`/`height`).
- **No layout-triggering properties in a `transition`.** If a component's animation needs to
  reflow other elements (e.g. an expanding accordion pushing content below it), prefer
  `motion`'s `layout` prop (which itself is compositor-friendly via `transform`) over animating
  `height` directly.
- **`will-change` used sparingly**, only on elements confirmed (via profiling, not guessing) to
  need the hint, and removed once the animation completes — leaving it on permanently forces the
  browser to maintain an extra compositor layer for elements that are static 99% of the time.
- **Stagger and list animations stay bounded.** A `StandingsTable` or `ScheduleList` with many
  rows does not animate every row with an unbounded per-item delay (see the stagger cap above);
  large lists either cap the animated subset (e.g. only the first N rows individually animate,
  the rest fade in as a group) or skip per-row animation entirely in favor of one container-level
  reveal.
- **No animation blocks interaction.** A page transition or data reveal never delays the
  underlying content from being interactive — motion is layered on top of already-functional
  markup (progressive enhancement), not a gate content waits behind.

## Glassmorphism and blur — performance angle

[design-system.md](./design-system.md#glassmorphism) covers *where* glassmorphism is allowed
(nav bar, score overlays) and forbidden (article bodies, tables, cards, any large content
surface). The performance reason belongs here: `backdrop-filter: blur(...)` is one of the most
expensive properties a browser can composite, because it has to sample and blur everything behind
the element on every frame that region is on screen or scrolling. Applied to a small, mostly-
static element (a sticky nav bar, a fixed score overlay) that cost is negligible. Applied to a
large surface that scrolls with page content (a standings table, an article body), it's a
guaranteed frame-budget violation on exactly the pages that most need to stay fast — which is why
the rule in the design system is absolute, not a judgment call per component.

## Example: page-entrance transition

A typical Phase 1 page (e.g. Standings) composes one container-level cinematic entrance rather
than animating every child independently:

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";

const container = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export function StandingsPageEntrance({ rows }: { rows: React.ReactNode[] }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={container}
      initial={shouldReduceMotion ? "show" : "hidden"}
      animate="show"
    >
      {rows.map((row, i) => (
        <motion.div key={i} variants={shouldReduceMotion ? undefined : item}>
          {row}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

The Server Component page (`app/(site)/standings/page.tsx`) renders the real `StandingsTable`
rows as children; this client-only wrapper adds the entrance choreography without owning any data
fetching itself — consistent with the "no implicit data fetching in components" rule in
[component-library.md](./component-library.md#composition-and-props-conventions).
