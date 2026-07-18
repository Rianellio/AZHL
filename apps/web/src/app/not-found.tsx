import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 py-24">
      <p className="text-sm font-medium uppercase tracking-wide text-foreground-secondary">404</p>
      <h1 className="font-display text-4xl font-bold text-foreground-primary">Page not found</h1>
      <p className="text-foreground-secondary">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="text-accent hover:underline">
        Back to home
      </Link>
    </div>
  );
}
