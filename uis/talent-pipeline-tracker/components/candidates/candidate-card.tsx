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
      <article className="rounded-xl border border-[#353535] bg-[#2D2D2D] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition hover:border-[#564334] hover:bg-[#363636]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#353535] font-brand text-lg text-[#ffb77d]">
              {initials(item.full_name)}
            </div>
            <div>
              <h3 className="font-brand text-xl text-[#e4e2e1]">{item.full_name}</h3>
              <p className="text-sm text-[#f0bba4]">{item.position}</p>
            </div>
          </div>
        </div>
        <div className="mb-4 space-y-1 text-sm text-[#ddc1ae]">
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
