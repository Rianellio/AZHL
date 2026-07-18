/** Conventional Commits, scoped to this monorepo's packages/apps. See .claude/github-strategy.md */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "web",
        "admin",
        "mobile-api",
        "database",
        "ui",
        "types",
        "utils",
        "config",
        "repo",
        "ci",
        "docs",
      ],
    ],
  },
};
