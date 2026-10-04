"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { register } from "./auth-api";
import { useAuth } from "./auth-context";
import { safeAuthDestination } from "./auth-navigation";
import { BrasaMark } from "./site-header";

const inputClassName = "mt-2 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-3 text-base text-stone-100 outline-none placeholder:text-stone-600 focus:border-brasa-400 focus:ring-2 focus:ring-brasa-400/20 disabled:opacity-60";

export function AuthLoading() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20" role="status">
      <p className="text-sm text-stone-400">Validando sesion...</p>
    </main>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const { user, initializing, error: sessionError, login, refreshSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = safeAuthDestination(searchParams.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initializing && user) {
      if (destination === "/suppliers" || destination.startsWith("/suppliers/")) window.location.replace(destination);
      else router.replace(destination);
    }
  }, [initializing, user, destination, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    if (isRegister && password !== confirmation) {
      setError("Las contrase\u00f1as no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await register({ email: email.trim(), password, name: name.trim() || undefined });
        router.replace(`/login?registered=1&next=${encodeURIComponent(destination)}`);
      } else {
        await login(email.trim(), password);
      }
    } catch (failure) {
      setError(
        failure instanceof TypeError
          ? "No se pudo conectar con el servicio. Intenta nuevamente."
          : failure instanceof Error ? failure.message : "No se pudo completar la solicitud.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (initializing || user) return <AuthLoading />;

  const alternative = `${isRegister ? "/login" : "/register"}?next=${encodeURIComponent(destination)}`;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10 sm:py-16">
      <div className="w-full max-w-sm">
        <header className="mb-8 flex items-center gap-3">
          <BrasaMark />
          <div className="min-w-0">
            <p className="text-base font-semibold text-stone-100">Brasaland <span className="text-brasa-400">Backoffice</span></p>
            <p className="mt-1 text-xs text-stone-500">Brasaland Digital</p>
          </div>
        </header>

        <h1 className="mb-6 text-2xl font-semibold text-stone-50">
          {isRegister ? "Crear cuenta" : "Iniciar sesi\u00f3n"}
        </h1>

        {!isRegister && searchParams.get("registered") === "1" && (
          <p className="mb-6 border-l-2 border-emerald-500 pl-3 text-sm text-emerald-300" role="status">
            {"Cuenta creada. Ya puedes iniciar sesi\u00f3n."}
          </p>
        )}

        <form onSubmit={handleSubmit} aria-busy={submitting} className="space-y-5">
          <fieldset disabled={submitting} className="min-w-0 space-y-5">
            {isRegister && (
              <div>
                <label htmlFor="auth-name" className="text-sm text-stone-300">Nombre <span className="text-stone-500">(opcional)</span></label>
                <input id="auth-name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="text-sm text-stone-300">Email</label>
              <input id="auth-email" name="email" type="email" required autoComplete={isRegister ? "email" : "username"} autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClassName} />
            </div>

            <div>
              <label htmlFor="auth-password" className="text-sm text-stone-300">{"Contrase\u00f1a"}</label>
              <input id="auth-password" name="password" type={showPassword ? "text" : "password"} required autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClassName} />
            </div>

            {isRegister && (
              <div>
                <label htmlFor="auth-confirmation" className="text-sm text-stone-300">{"Confirmar contrase\u00f1a"}</label>
                <input id="auth-confirmation" name="confirmation" type={showPassword ? "text" : "password"} required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} aria-invalid={Boolean(error && password !== confirmation)} aria-describedby={error ? "auth-error" : undefined} className={inputClassName} />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-stone-400">
              <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} className="size-4 accent-brasa-500" />
              {"Mostrar contrase\u00f1a"}
            </label>
          </fieldset>

          {error && <p id="auth-error" role="alert" className="break-words border-l-2 border-red-500 pl-3 text-sm text-red-300">{error}</p>}

          {!error && sessionError && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-red-300">{"No se pudo validar la sesi\u00f3n guardada."}</p>
              <button type="button" onClick={() => void refreshSession()} className="text-sm text-brasa-400 underline underline-offset-4">{"Reintentar validaci\u00f3n"}</button>
            </div>
          )}

          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-brasa-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brasa-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-400 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? (isRegister ? "Creando cuenta..." : "Ingresando...") : (isRegister ? "Crear cuenta" : "Iniciar sesi\u00f3n")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          {isRegister ? "\u00bfYa tienes cuenta? " : "\u00bfNo tienes cuenta? "}
          <Link href={alternative} className="text-brasa-400 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brasa-400">
            {isRegister ? "Iniciar sesi\u00f3n" : "Crear cuenta"}
          </Link>
        </p>
      </div>
    </main>
  );
}