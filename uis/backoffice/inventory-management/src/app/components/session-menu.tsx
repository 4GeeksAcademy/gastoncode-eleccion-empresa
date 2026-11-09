"use client";

import { useAuth } from "./auth-context";

export function SessionMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="sessionMenu">
      <span>{user.profile?.name || "Mi cuenta"}</span>
      <button type="button" className="secondaryButton" onClick={logout}>
        Cerrar sesión
      </button>
    </div>
  );
}
