import { toLabel } from "@/components/candidates/labels";
import { CandidateDetail } from "@/types/candidate-detail";

type HeroCardProps = {
  item: CandidateDetail;
};

export function HeroCard({ item }: HeroCardProps) {
  const initials = item.full_name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <section className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-6 shadow-[0_10px_40px_var(--shadow-card)]">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--placeholder)] bg-[var(--surface-chip)] font-brand text-3xl text-[var(--text-accent)]">
          {initials}
        </div>
        <div className="space-y-2">
          <h1 className="font-brand text-5xl leading-tight text-[var(--foreground)] sm:text-6xl">{item.full_name}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-2xl text-[var(--text-muted)]">{item.position}</p>
            <span className="rounded-full border border-[var(--tag-bg)] bg-[color-mix(in_srgb,var(--tag-bg)_20%,transparent)] px-3 py-1 text-xs uppercase tracking-[0.08em] text-[var(--text-accent)]">
              {toLabel(item.stage)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
