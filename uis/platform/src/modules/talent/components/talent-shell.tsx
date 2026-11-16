"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AuthGuard } from "@/lib/auth/auth-guard";

const TALENT_ROLES = ["admin", "manager"] as const;

export function TalentShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard allowedRoles={TALENT_ROLES}>{children}</AuthGuard>
    </AuthProvider>
  );
}