import { toLabel } from "./labels";

type StatusPillProps = {
  value: string;
  tone?: "primary" | "neutral";
};

export function StatusPill({ value, tone = "neutral" }: StatusPillProps) {
  const toneClass =
    tone === "primary"
      ? "border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--text-accent)]"
      : "border-[var(--border-strong)] bg-[var(--surface-pill)] text-[var(--text-muted)]";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${toneClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {toLabel(value)}
    </span>
  );
}
