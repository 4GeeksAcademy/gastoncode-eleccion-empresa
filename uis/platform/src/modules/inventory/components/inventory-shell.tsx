"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Role } from "@/lib/auth/auth-api";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { SessionMenu } from "./session-menu";
import { ModuleLink } from "@/lib/auth/module-link";

const WRITE_ROLES: readonly Role[] = ["admin", "manager"];

export function InventoryShell({ children, embedded = false }: { children: ReactNode; embedded?: boolean }) {
  const pathname = usePathname().replace(/^\/inventory-management(?=\/|$)/, "") || "/";
  const isLogin = pathname === "/login";
  const canWrite = pathname === "/inbound" || pathname.startsWith("/inbound/") || pathname === "/outbound" || pathname.startsWith("/outbound/");
  const allowedRoles = canWrite ? WRITE_ROLES : undefined;
  if (embedded) return <ProtectedInventoryShell allowedRoles={allowedRoles}>{children}</ProtectedInventoryShell>;
  return (
    <AuthProvider>
      {isLogin ? children : <ProtectedInventoryShell allowedRoles={allowedRoles}>{children}</ProtectedInventoryShell>}
    </AuthProvider>
  );
}

function ProtectedInventoryShell({ children, allowedRoles }: { children: ReactNode; allowedRoles?: readonly Role[] }) {
  const { homePath, internalNavigation, user } = useAuth();
  const HomeLink = internalNavigation ? Link : "a";
  return <AuthGuard allowedRoles={allowedRoles}>
    <nav className="navbar">
      <div className="navContent">
        <ModuleLink basePath="/inventory-management" href="/products" className="logo">BRASALAND</ModuleLink>
        <div className="navLinks">
          <ModuleLink basePath="/inventory-management" href="/products">Productos</ModuleLink>
          {(user?.role === "admin" || user?.role === "manager") && <>
            <ModuleLink basePath="/inventory-management" href="/inbound">Entrada</ModuleLink>
            <ModuleLink basePath="/inventory-management" href="/outbound">Salida</ModuleLink>
          </>}
          <ModuleLink basePath="/inventory-management" href="/orders">Órdenes</ModuleLink>
          <SessionMenu />
          <HomeLink href={homePath} className="backLink">← Backoffice</HomeLink>
        </div>
      </div>
    </nav>
    {children}
  </AuthGuard>;
}
