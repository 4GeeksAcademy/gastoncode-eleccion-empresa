"use client";

import { useAuth } from "@/lib/auth/auth-context";

export default function SessionMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="sessionMenu">
      <span>{user.profile?.name || user.email}</span>
      <button type="button" className="secondaryButton" onClick={logout}>
        Cerrar sesión
      </button>
    </div>
  );
}
