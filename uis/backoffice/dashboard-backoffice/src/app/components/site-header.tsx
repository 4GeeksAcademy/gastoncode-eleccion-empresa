import { Badge } from "./ui/badge";

export function BrasaMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brasa-500 to-brasa-800 text-lg shadow-lg shadow-brasa-900/40 ${className}`}
      aria-hidden
    >
      🔥
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-800/80 bg-stone-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-4">
        <BrasaMark />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-wide text-stone-100">
            Brasaland <span className="text-brasa-400">Backoffice</span>
          </p>
          <p className="truncate text-xs text-stone-500">
            Brasaland Digital · Medellín + Miami
          </p>
        </div>
        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <Badge>14 locales · 2 países</Badge>
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-stone-800 bg-stone-900 text-xs font-semibold text-stone-300">
            MR
          </span>
        </div>
      </div>
    </header>
  );
}
