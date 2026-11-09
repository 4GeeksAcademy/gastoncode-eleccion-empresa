type BenefitCardProps = {
  title: string;
  description: string;
};

export function BenefitCard({ title, description }: BenefitCardProps) {
  return (
    <article className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
      <h3 className="mb-2 text-lg font-bold text-amber-300">{title}</h3>
      <p className="text-sm leading-relaxed text-stone-300">{description}</p>
    </article>
  );
}
