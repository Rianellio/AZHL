"use client";

import { useEffect } from "react";
import { T } from "@/components/ui/t";

/** Route-level error boundary — e.g. the database is unreachable. Renders inside the root layout,
 * so the nav, footer and active locale stay in place. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 py-24">
      <T
        k="error.title"
        as="h1"
        className="font-display text-foreground-primary text-4xl font-bold"
      />
      <T k="error.description" as="p" className="text-foreground-secondary" />
      <button type="button" onClick={reset} className="text-accent hover:underline">
        <T k="error.retry" />
      </button>
    </div>
  );
}
