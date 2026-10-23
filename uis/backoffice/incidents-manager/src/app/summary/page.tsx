import AuthGuard from "../components/auth-guard";
import SummaryPanel from "../components/summary-panel";

export default function SummaryPage() {
  return (
    <main className="container">
      <header className="pageHeader">
        <span className="eyebrow">Gestor de incidencias</span>
        <h1>Resumen de incidencias</h1>
        <p>Totales por estado, categoría, origen y sede.</p>
      </header>
      <AuthGuard>
        <SummaryPanel />
      </AuthGuard>
    </main>
  );
}
