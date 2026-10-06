"use client";

import { useEffect, type ReactNode } from "react";
import { type Role } from "./auth-api";
import { useAuth } from "./auth-context";

export function AuthGuard({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: readonly Role[];
}) {
  const { user, initializing, error, refreshSession } = useAuth();

  useEffect(() => {
    if (!initializing && !error && !user) {
      window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [initializing, error, user]);

  if (!user && (initializing || !error)) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 py-20" role="status">
        <span
          className="size-8 animate-spin rounded-full border-4 border-stone-700 border-t-brasa-400 motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span>Validando sesion...</span>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20">
        <p role="alert">No se pudo validar la sesion. Intenta nuevamente.</p>
        <button
          type="button"
          className="rounded-lg border border-stone-700 px-4 py-2 focus-visible:outline-2 focus-visible:outline-brasa-400"
          onClick={() => void refreshSession()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    return <p className="px-6 py-20 text-center" role="alert">No tienes permiso para acceder a esta vista.</p>;
  }

  return <>{children}</>;
}