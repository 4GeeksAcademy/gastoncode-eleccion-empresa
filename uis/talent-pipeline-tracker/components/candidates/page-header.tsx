type PageHeaderProps = {
  total: number;
};

export function PageHeader({ total }: PageHeaderProps) {
  return (
    <section className="mb-6 space-y-2">
      <h1 className="font-brand text-3xl leading-tight text-[#e4e2e1] sm:text-4xl">
        Candidaturas
      </h1>
      <p className="max-w-2xl text-sm text-[#ddc1ae] sm:text-base">
        Seguimiento de candidaturas para perfiles clave de Brasaland.
      </p>
      <p className="inline-flex rounded-full border border-[#564334] bg-[#1f2020] px-3 py-1 text-xs text-[#f0bba4]">
        {total} perfiles en el pipeline
      </p>
    </section>
  );
}
