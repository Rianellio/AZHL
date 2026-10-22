"use client";

import { DEFAULT_LOCALE } from "@/lib/i18n/locales";

/** Last-resort boundary for errors in the root layout itself — it replaces the layout, so no
 * providers or styles are available; the message is plain inline-styled text in all three locales. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body
        style={{
          margin: 0,
          background: "#000000",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "96px 24px" }}>
          <h1 style={{ fontSize: 32, margin: "0 0 16px" }}>
            Xəta baş verdi · Something went wrong · Произошла ошибка
          </h1>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "none",
              border: 0,
              padding: 0,
              color: "inherit",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Yenidən cəhd et · Try again · Попробовать снова
          </button>
        </main>
      </body>
    </html>
  );
}
