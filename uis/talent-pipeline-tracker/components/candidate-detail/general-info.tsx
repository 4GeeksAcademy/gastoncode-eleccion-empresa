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
      <div className="space-y-4 text-sm text-[var(--foreground)]">
        <InfoRow label="ID" value={item.id} />
        <InfoRow label="Email" value={item.email} />
        <InfoRow label="Phone" value={item.phone} />
        <InfoRow
          label="LinkedIn"
          value={
            item.linkedin_url ? (
              <Link className="text-[var(--text-accent)]" href={item.linkedin_url} target="_blank" rel="noreferrer">
                View Profile ↗
              </Link>
            ) : (
              <span className="text-[var(--text-muted)]">No disponible</span>
            )
          }
        />
        <InfoRow
          label="CV"
          value={
            item.cv_url ? (
              <Link className="text-[var(--text-accent)]" href={item.cv_url} target="_blank" rel="noreferrer">
                Download PDF ↓
              </Link>
            ) : (
              <span className="text-[var(--text-muted)]">No disponible</span>
            )
          }
        />
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
      <span className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</span>
      <span className="truncate text-right text-base text-[var(--foreground)]">{value}</span>
    </div>
  );
}
