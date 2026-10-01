import { CandidateCard } from "./candidate-card";
import { Candidate } from "@/types/candidates";

type CandidateGridProps = {
  data: Candidate[];
};

export function CandidateGrid({ data }: CandidateGridProps) {
  if (!data.length) {
    return (
      <section className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] p-8 text-center text-sm text-[var(--text-muted)]">
        No hay candidaturas para los filtros seleccionados.
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((item) => (
        <CandidateCard key={item.id} item={item} />
      ))}
    </section>
  );
}
