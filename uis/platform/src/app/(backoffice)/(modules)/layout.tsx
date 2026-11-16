import { AuthGuard } from "@/lib/auth/auth-guard";

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
