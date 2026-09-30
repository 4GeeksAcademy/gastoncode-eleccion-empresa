export function IconTile({
  emoji,
  className = "",
}: {
  emoji: string;
  className?: string;
}) {
  return (
    <span
      className={`flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-800 bg-stone-950 text-xl ${className}`}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
