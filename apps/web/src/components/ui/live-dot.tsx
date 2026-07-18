/** Reserved-red pulse used only for LIVE status — see .claude/design-system.md and .claude/animation-guidelines.md. */
export function LiveDot() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75 motion-reduce:animate-none" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
    </span>
  );
}
