type PageHeaderProps = {
  total: number;
};

export function PageHeader({ total }: PageHeaderProps) {
  return (
    <section className="mb-6 space-y-2">
      <h1 className="font-brand text-3xl leading-tight text-[var(--foreground)] sm:text-4xl">
        Candidaturas
      </h1>
      <p className="max-w-2xl text-sm text-[var(--text-muted)] sm:text-base">
        Seguimiento de candidaturas para perfiles clave de Brasaland.
      </p>
      <p className="inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--surface-chip)] px-3 py-1 text-xs text-[var(--text-soft)]">
        {total} perfiles en el pipeline
      </p>
    </section>
  );
}
