import { toLabel } from "@/components/candidates/labels";
import { CandidateDetail } from "@/types/candidate-detail";
import { dateLabel } from "./date-label";
import { SectionCard } from "./section-card";

type ProcessInfoProps = {
  item: CandidateDetail;
};

export function ProcessInfo({ item }: ProcessInfoProps) {
  const rows = [
    ["Experience", `${item.experience_years} años`],
    ["Stage", toLabel(item.stage)],
    ["Status", toLabel(item.status)],
    ["Applied", dateLabel(item.applied_at)],
    ["Last Updated", dateLabel(item.updated_at)],
  ];

  return (
    <SectionCard title="Process Info" icon={<span>↗</span>}>
      <div className="space-y-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-md px-1 py-1.5">
            <span className="text-xs uppercase tracking-[0.08em] text-[#ddc1ae]">{label}</span>
            <span className="text-base text-[#e4e2e1]">{value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
