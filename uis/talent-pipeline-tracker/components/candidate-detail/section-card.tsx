import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function SectionCard({ title, icon, children, rightSlot }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#2D2D2D] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[#ffb77d]">{icon}</span>
          <h2 className="font-brand text-4xl text-[#e4e2e1] sm:text-3xl">{title}</h2>
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}
