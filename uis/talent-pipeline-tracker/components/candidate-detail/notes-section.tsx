import { CandidateDetail } from "@/types/candidate-detail";
import { dateLabel } from "./date-label";
import { SectionCard } from "./section-card";

type NotesSectionProps = {
  item: CandidateDetail;
};

export function NotesSection({ item }: NotesSectionProps) {
  const notes = item.notes || [];

  return (
    <SectionCard title="Notes" icon={<span>☰</span>} rightSlot={<span className="text-[#ffb77d]">⊕</span>}>
      <div className="space-y-3">
        {notes.map((note) => (
          <article key={note.id} className="rounded-lg border border-white/10 bg-[#1f2020] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="rounded-full bg-[#66402f] px-2 py-1 text-xs text-[#f0bba4]">HR</span>
              <span className="font-semibold text-[#e4e2e1]">Recruiter</span>
              <span className="text-xs text-[#ddc1ae]">{dateLabel(note.created_at)}</span>
            </div>
            <p className="text-base leading-relaxed text-[#ddc1ae]">{note.content}</p>
          </article>
        ))}
        {!notes.length && (
          <p className="rounded-lg border border-dashed border-[#564334] p-4 text-sm text-[#ddc1ae]">
            Sin notas registradas para esta candidatura.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
