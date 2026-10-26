import AuthGuard from "../components/auth-guard";
import IncidentsPanel from "../components/incidents-panel";

export default function IncidentsPage() {
  return (
    <main className="container">
      <header className="pageHeader">
        <span className="eyebrow">Gestor de incidencias</span>
        <h1>Panel de incidencias</h1>
        <p>Consulta y actualiza las incidencias registradas por sede, origen y estado.</p>
      </header>
      <AuthGuard>
        <IncidentsPanel />
      </AuthGuard>
    </main>
  );
}