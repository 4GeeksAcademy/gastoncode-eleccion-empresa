"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--page-grad-start)_0%,_var(--page-grad-mid)_50%,_var(--page-grad-end)_100%)]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6 sm:py-12">
        <section className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-6 text-center">
          <h1 className="font-brand text-3xl text-[var(--foreground)] sm:text-4xl">Error al cargar candidaturas</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)] sm:text-base">
            {error.message || "No se pudo cargar la información en este momento."}
          </p>
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-chip)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
            >
              Reintentar
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
