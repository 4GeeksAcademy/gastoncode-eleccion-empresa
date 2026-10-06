"use client";

import Link from "next/link";
import { Badge } from "./ui/badge";
import { useAuth } from "./auth-context";

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
  const { user, logout } = useAuth();
  const identity = user?.profile?.name?.trim() || user?.email || "Usuario";
  const initials = identity.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-10 border-b border-stone-800/80 bg-stone-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
        <BrasaMark />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-wide text-stone-100">
            Brasaland <span className="text-brasa-400">Backoffice</span>
          </p>
          <p className="truncate text-xs text-stone-500">
            Brasaland Digital · Medellín + Miami
          </p>
        </div>
        <div className="ml-auto flex max-w-full items-center gap-3">
          <div className="hidden lg:block"><Badge>14 locales · 2 países</Badge></div>
            <Link href="/account" aria-label={`Gestionar cuenta de ${identity}`} className="group inline-flex min-w-0 items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-brasa-400">
              <span className="hidden max-w-40 truncate text-sm text-stone-300 group-hover:text-brasa-300 sm:block" title={identity}>
                {identity}
              </span>
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-800 bg-stone-900 text-xs font-semibold text-stone-300 group-hover:border-brasa-400 group-hover:text-stone-100" aria-hidden="true">
                {initials}
              </span>
            </Link>
          <button type="button" onClick={logout} className="shrink-0 rounded-lg border border-stone-700 px-3 py-2 text-xs text-stone-300 hover:border-brasa-400 hover:text-stone-100 focus-visible:outline-2 focus-visible:outline-brasa-400">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
