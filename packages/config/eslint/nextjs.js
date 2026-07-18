import { baseConfig } from "./base.js";
import nextPlugin from "@next/eslint-plugin-next";

/** @type {import("eslint").Linter.Config[]} */
export const nextjsConfig = [
  // Next.js generates next-env.d.ts at each app root with mandatory triple-slash references
  // (see its own "do not edit" banner) — it must never be linted, in every consuming app.
  { ignores: ["next-env.d.ts", ".next/**"] },
  ...baseConfig,
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];

export default nextjsConfig;
