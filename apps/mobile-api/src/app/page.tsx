export default function MobileApiPlaceholderPage() {
  return (
    <main style={{ padding: "4rem", maxWidth: 640, fontFamily: "system-ui, sans-serif" }}>
      <h1>AZHL Mobile API</h1>
      <p>
        This app is a scaffold with no client-facing UI. It exposes only a health check today
        (<code>GET /api/v1/health</code>). The real contract mirrors <code>apps/web</code>&apos;s{" "}
        <code>app/api/v1/*</code> and goes live in a future phase — see{" "}
        <code>.claude/future-services.md</code>.
      </p>
    </main>
  );
}
