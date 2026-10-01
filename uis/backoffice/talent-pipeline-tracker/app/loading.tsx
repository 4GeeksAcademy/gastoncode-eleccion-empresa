export default function Loading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--page-grad-start)_0%,_var(--page-grad-mid)_50%,_var(--page-grad-end)_100%)]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6 sm:py-12">
        <section className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-6 text-center">
          <h1 className="font-brand text-3xl text-[var(--foreground)] sm:text-4xl">Cargando candidaturas</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)] sm:text-base">
            Espera un momento mientras obtenemos los datos del pipeline.
          </p>
        </section>
      </main>
    </div>
  );
}
