import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border-subtle bg-surface-raised p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground-primary">{value}</p>
    </div>
  );
}
