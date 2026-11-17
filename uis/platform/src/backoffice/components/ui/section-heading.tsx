export function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-stone-100">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
