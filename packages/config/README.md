# @azhl/config

Shared, real (not scaffold) configuration consumed by every app and package in the monorepo.

- `tsconfig/base.json` — strict TypeScript base every workspace extends.
- `tsconfig/nextjs.json` — adds Next.js-specific compiler options on top of the base.
- `eslint/base.js` — shared flat ESLint config (TypeScript + Prettier compatibility).
- `eslint/nextjs.js` — adds `eslint-plugin-next`'s recommended + core-web-vitals rules.
- `prettier/index.js` — shared Prettier config, including the Tailwind class-sorting plugin.

See [`.claude/coding-standards.md`](../../.claude/coding-standards.md) for the conventions
these configs enforce.
