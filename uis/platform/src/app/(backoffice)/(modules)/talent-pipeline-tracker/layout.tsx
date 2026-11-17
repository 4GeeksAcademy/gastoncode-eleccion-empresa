import { AuthGuard } from "@/lib/auth/auth-guard";
import { ModuleFrame } from "@/components/module-frame";
import "../../../../styles/module-base.css";
import "../../../../styles/talent.css";

const ROLES = ["admin", "manager"] as const;
export const metadata = { title: "Brasaland · Candidaturas" };

export default function TalentLayout({ children }: { children: React.ReactNode }) {
  return <ModuleFrame name="talent"><AuthGuard allowedRoles={ROLES}>{children}</AuthGuard></ModuleFrame>;
}
