import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function SectionCard({ title, icon, children, rightSlot }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] p-6 shadow-[0_10px_40px_var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border-muted)] pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-accent)]">{icon}</span>
          <h2 className="font-brand text-4xl text-[var(--foreground)] sm:text-3xl">{title}</h2>
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}
