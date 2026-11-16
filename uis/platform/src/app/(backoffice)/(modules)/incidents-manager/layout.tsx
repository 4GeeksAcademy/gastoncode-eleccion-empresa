import Link from "next/link";
import { ModuleFrame } from "@/components/module-frame";
import SessionMenu from "@/modules/incidents-manager/components/session-menu";

export const metadata = { title: "Brasaland · Gestor de incidencias" };

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <ModuleFrame name="manager">
    <nav className="navbar"><div className="navContent">
      <Link href="/incidents-manager" className="logo">BRASALAND</Link>
      <div className="navLinks">
        <Link href="/incidents-manager">Registrar incidencia</Link>
        <Link href="/incidents-manager/incidents">Incidencias</Link>
        <Link href="/incidents-manager/summary">Resumen</Link>
        <SessionMenu />
        <Link href="/backoffice" className="backLink">← Backoffice</Link>
      </div>
    </div></nav>
    {children}
  </ModuleFrame>;
}
