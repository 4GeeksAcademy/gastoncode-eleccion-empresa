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
    <section className="rounded-xl border border-[#564334] bg-[#2D2D2D] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[#a48c7a] bg-[#1f2020] font-brand text-3xl text-[#ffb77d]">
          {initials}
        </div>
        <div className="space-y-2">
          <h1 className="font-brand text-5xl leading-tight text-[#e4e2e1] sm:text-6xl">{item.full_name}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-2xl text-[#ddc1ae]">{item.position}</p>
            <span className="rounded-full border border-[#66402f] bg-[#66402f]/20 px-3 py-1 text-xs uppercase tracking-[0.08em] text-[#ffb77d]">
              {toLabel(item.stage)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
