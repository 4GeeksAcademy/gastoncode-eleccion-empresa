import Link from "next/link";
import { ModuleFrame } from "@/components/module-frame";

export const metadata = { title: "Brasaland · Incidencias" };

export default function AnalyzerLayout({ children }: { children: React.ReactNode }) {
  return <ModuleFrame name="analyzer">
    <nav className="navbar"><div className="navContent">
      <Link href="/incidents-analyzer" className="logo">BRASALAND</Link>
      <div className="navLinks">
        <Link href="/incidents-analyzer">Inicio</Link>
        <Link href="/incidents-analyzer/incidents">Incidencias</Link>
        <Link href="/backoffice" className="backLink">← Backoffice</Link>
      </div>
    </div></nav>
    {children}
  </ModuleFrame>;
}
