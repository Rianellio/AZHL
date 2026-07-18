export function Footer() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-foreground-secondary md:flex-row md:items-center md:justify-between">
        <p>&copy; {new Date().getFullYear()} Arctic Zone Hockey League.</p>
        <p>Built for the AZHL platform &mdash; Phase 1: League Hub.</p>
      </div>
    </footer>
  );
}
