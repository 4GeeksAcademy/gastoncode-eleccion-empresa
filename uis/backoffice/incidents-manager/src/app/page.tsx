import AuthGuard from "./components/auth-guard";
import IncidentForm from "./components/incident-form";

export default function RegisterIncidentPage() {
  return (
    <main className="container narrow">
      <header className="pageHeader">
        <span className="eyebrow">Gestor de incidencias</span>
        <h1>Registrar incidencia</h1>
        <p>Los campos marcados con * son obligatorios.</p>
      </header>
      <AuthGuard>
        <IncidentForm />
      </AuthGuard>
    </main>
  );
}
