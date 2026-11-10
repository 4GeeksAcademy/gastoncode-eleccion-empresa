"use client";

import { useAuth } from "../../auth-shared/auth-context";

export function SessionControls() {
  const { logout } = useAuth();
  const className = "rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-1)]";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href="/" className={className}>Backoffice</a>
      <a href="/account" className={className}>Cuenta</a>
      <button type="button" className={className} onClick={logout}>Cerrar sesion</button>
    </div>
  );
}