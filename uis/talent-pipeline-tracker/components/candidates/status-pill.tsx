import { toLabel } from "./labels";

type StatusPillProps = {
  value: string;
  tone?: "primary" | "neutral";
};

export function StatusPill({ value, tone = "neutral" }: StatusPillProps) {
  const toneClass =
    tone === "primary"
      ? "border-[#ff8c00]/50 bg-[#ff8c00]/15 text-[#ffb77d]"
      : "border-[#564334] bg-[#2a2a2a] text-[#ddc1ae]";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${toneClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {toLabel(value)}
    </span>
  );
}
