"use client";

import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";

export function SessionControls() {
  const { homePath, internalNavigation, logout } = useAuth();
  const SessionLink = internalNavigation ? Link : "a";
  const className = "rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-1)]";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SessionLink href={homePath} className={className}>Backoffice</SessionLink>
      <SessionLink href="/account" className={className}>Cuenta</SessionLink>
      <button type="button" className={className} onClick={logout}>Cerrar sesion</button>
    </div>
  );
}