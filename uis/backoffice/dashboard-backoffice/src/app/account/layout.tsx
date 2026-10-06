import type { ReactNode } from "react";
import { AuthGuard } from "../components/auth-guard";
import { SiteHeader } from "../components/site-header";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:py-10">
        {children}
      </main>
    </AuthGuard>
  );
}