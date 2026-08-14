import { CandidateCard } from "./candidate-card";
import { Candidate } from "@/types/candidates";

type CandidateGridProps = {
  data: Candidate[];
};

export function CandidateGrid({ data }: CandidateGridProps) {
  if (!data.length) {
    return (
      <section className="rounded-xl border border-dashed border-[#564334] bg-[#1b1c1c] p-8 text-center text-sm text-[#ddc1ae]">
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
