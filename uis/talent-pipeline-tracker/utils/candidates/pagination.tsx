import Link from "next/link";

type PaginationProps = {
  page: number;
  limit: number;
  total: number;
  stage: string;
  status: string;
  search: string;
  email: string;
};

export function Pagination(props: PaginationProps) {
  const { page, limit, total, stage, status, search, email } = props;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const prev = page > 1 ? page - 1 : 1;
  const next = page < totalPages ? page + 1 : totalPages;

  return (
    <nav className="mt-6 flex items-center justify-between rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-3 text-sm text-[var(--text-muted)]">
      <Link className={linkClass(page <= 1)} href={makeUrl({ page: prev, limit, stage, status, search, email })}>Anterior</Link>
      <p>Página {page} de {totalPages}</p>
      <Link className={linkClass(page >= totalPages)} href={makeUrl({ page: next, limit, stage, status, search, email })}>Siguiente</Link>
    </nav>
  );
}

function makeUrl(params: Record<string, string | number>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (String(value)) search.set(key, String(value));
  });
  return `/?${search.toString()}`;
}

function linkClass(disabled: boolean): string {
  return disabled
    ? "pointer-events-none opacity-40"
    : "rounded-md border border-[var(--border-strong)] px-3 py-1 text-[var(--text-accent)]";
}