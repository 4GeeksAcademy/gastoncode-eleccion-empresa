import Link from "next/link";
import { Candidate } from "@/types/candidates";
import { initials, timeAgo } from "./labels";
import { StatusPill } from "./status-pill";

type CandidateCardProps = {
  item: Candidate;
};

export function CandidateCard({ item }: CandidateCardProps) {
  return (
    <Link href={`/candidates/${item.id}`} className="block">
      <article className="rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] p-5 shadow-[0_16px_40px_var(--shadow-card)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-avatar)] font-brand text-lg text-[var(--text-accent)]">
              {initials(item.full_name)}
            </div>
            <div>
              <h3 className="font-brand text-xl text-[var(--foreground)]">{item.full_name}</h3>
              <p className="text-sm text-[var(--text-soft)]">{item.position}</p>
            </div>
          </div>
        </div>
        <div className="mb-4 space-y-1 text-sm text-[var(--text-muted)]">
          <p>Aplicó: {timeAgo(item.applied_at)}</p>
          <p>Experiencia: {item.experience_years} años</p>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <StatusPill value={item.stage} tone="primary" />
          <StatusPill value={item.status} />
        </div>
      </article>
    </Link>
  );
}
