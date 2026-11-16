export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-stone-800 bg-stone-900/50 ${className}`}
    >
      {children}
    </div>
  );
}
