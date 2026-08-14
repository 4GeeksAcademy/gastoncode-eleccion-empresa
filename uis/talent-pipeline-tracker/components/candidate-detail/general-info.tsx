import Link from "next/link";
import { ReactNode } from "react";
import { CandidateDetail } from "@/types/candidate-detail";
import { SectionCard } from "./section-card";

type GeneralInfoProps = {
  item: CandidateDetail;
};

export function GeneralInfo({ item }: GeneralInfoProps) {
  return (
    <SectionCard title="General Info" icon={<span>▦</span>}>
      <div className="space-y-4 text-sm text-[#e4e2e1]">
        <InfoRow label="ID" value={item.id} />
        <InfoRow label="Email" value={item.email} />
        <InfoRow label="Phone" value={item.phone} />
        <InfoRow label="LinkedIn" value={<Link className="text-[#ffb77d]" href={item.linkedin_url} target="_blank">View Profile ↗</Link>} />
        <InfoRow label="CV" value={<Link className="text-[#ffb77d]" href={item.cv_url} target="_blank">Download PDF ↓</Link>} />
      </div>
    </SectionCard>
  );
}

type InfoRowProps = {
  label: string;
  value: ReactNode;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md px-1 py-1.5">
      <span className="text-xs uppercase tracking-[0.08em] text-[#ddc1ae]">{label}</span>
      <span className="truncate text-right text-base text-[#e4e2e1]">{value}</span>
    </div>
  );
}
