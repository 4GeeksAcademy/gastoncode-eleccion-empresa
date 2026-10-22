"use client";

import { useEffect, useState, type FormEvent } from "react";
import { UnauthorizedError } from "../../../../auth-shared/auth-api";
import { useAuth } from "../components/auth-context";

function safeDestination(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && next !== "/login" ? next : "/";
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) window.location.replace(safeDestination());
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y tu contraseña.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (failure) {
      setError(
        failure instanceof UnauthorizedError
          ? "Correo o contraseña incorrectos."
          : "No pudimos iniciar sesión. Inténtalo de nuevo en unos minutos.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container narrow">
      <form className="card incidentForm" onSubmit={handleSubmit} noValidate>
        <h1>Iniciar sesión</h1>
        <p className="muted">Usa tu cuenta del backoffice de Brasaland.</p>
        {error && (
          <div className="notice noticeError" role="alert">
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="formActions">
          <button type="submit" disabled={submitting}>
            {submitting && <span className="spinner" aria-hidden="true" />}
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </form>
    </main>
  );
}
