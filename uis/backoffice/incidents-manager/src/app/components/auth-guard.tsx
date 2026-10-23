"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth-context";
import { loginDestination } from "../../../../auth-shared/auth-navigation";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, initializing, error, refreshSession } = useAuth();

  useEffect(() => {
    if (!initializing && !error && !user) {
      window.location.replace(loginDestination(window.location.pathname));
    }
  }, [initializing, error, user]);

  if (error && !user) {
    return (
      <div className="centered">
        <p role="alert">No se pudo validar la sesión. Inténtalo de nuevo.</p>
        <button type="button" onClick={() => void refreshSession()}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="centered" role="status">
        <span className="spinner" aria-hidden="true" />
        <span>Validando sesión...</span>
      </div>
    );
  }

  return <>{children}</>;
}
