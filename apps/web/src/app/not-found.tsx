import Link from "next/link";
import { T } from "@/components/ui/t";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 py-24">
      <p className="text-sm font-medium uppercase tracking-wide text-foreground-secondary">404</p>
      <T k="notFound.title" as="h1" className="font-display text-4xl font-bold text-foreground-primary" />
      <T k="notFound.description" as="p" className="text-foreground-secondary" />
      <Link href="/" className="text-accent hover:underline">
        <T k="notFound.backHome" />
      </Link>
    </div>
  );
}
