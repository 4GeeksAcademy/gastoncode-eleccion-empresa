export type BadgeTone = "brasa" | "neutral";

const TONES: Record<BadgeTone, string> = {
  brasa: "border-brasa-500/30 bg-brasa-500/10 text-brasa-300",
  neutral: "border-stone-700/60 bg-stone-800/40 text-stone-400",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
