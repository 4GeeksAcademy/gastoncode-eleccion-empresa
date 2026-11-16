export function chipClass(active: boolean): string {
  return [
    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs tracking-[0.08em]",
    active
      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--text-accent)]"
      : "border-[var(--border-strong)] bg-[var(--surface-chip)] text-[var(--text-muted)]",
  ].join(" ");
}
