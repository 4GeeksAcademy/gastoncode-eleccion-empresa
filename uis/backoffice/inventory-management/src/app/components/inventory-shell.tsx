"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Role } from "../../../../auth-shared/auth-api";
import { useAuth } from "./auth-context";
import { AuthProvider } from "./auth-context";
import { AuthGuard } from "./auth-guard";
import { SessionMenu } from "./session-menu";

const WRITE_ROLES: readonly Role[] = ["admin", "manager"];

export function InventoryShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const canWrite = pathname === "/inbound" || pathname.startsWith("/inbound/") || pathname === "/outbound" || pathname.startsWith("/outbound/");
  const allowedRoles = canWrite ? WRITE_ROLES : undefined;
  return (
    <AuthProvider>
      {isLogin ? children : <ProtectedInventoryShell allowedRoles={allowedRoles}>{children}</ProtectedInventoryShell>}
    </AuthProvider>
  );
}

function ProtectedInventoryShell({ children, allowedRoles }: { children: ReactNode; allowedRoles?: readonly Role[] }) {
  const { user } = useAuth();
  return <AuthGuard allowedRoles={allowedRoles}>
    <nav className="navbar">
      <div className="navContent">
        <Link href="/products" className="logo">BRASALAND</Link>
        <div className="navLinks">
          <Link href="/products">Productos</Link>
          {(user?.role === "admin" || user?.role === "manager") && <>
            <Link href="/inbound">Entrada</Link>
            <Link href="/outbound">Salida</Link>
          </>}
          <Link href="/orders">Órdenes</Link>
          <SessionMenu />
          <Link href="/" className="backLink">← Backoffice</Link>
        </div>
      </div>
    </nav>
    {children}
  </AuthGuard>;
}
