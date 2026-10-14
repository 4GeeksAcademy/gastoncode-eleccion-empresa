"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { resetPassword } from "../components/auth-api";
import { BrasaMark } from "../components/site-header";

const inputClassName = "mt-2 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-3 text-base text-stone-100 outline-none placeholder:text-stone-600 focus:border-brasa-400 focus:ring-2 focus:ring-brasa-400/20 disabled:opacity-60";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (password !== confirmation) {
      setError("Las contrase\u00f1as no coinciden.");
      return;
    }

    if (password.length < 8) {
      setError("La contrase\u00f1a debe tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token!, password);
      router.replace("/login?reset=1");
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

  if (!token) {
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
            {"Enlace no v\u00e1lido"}
          </h1>

          <div className="border-l-2 border-red-500 pl-4">
            <p className="text-sm leading-6 text-red-300">
              {"El enlace de restablecimiento no es v\u00e1lido o ha expirado."}
            </p>
            <p className="mt-2 text-sm text-stone-400">
              {"Solicita un nuevo enlace para restablecer tu contrase\u00f1a."}
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-stone-500">
            <Link
              href="/forgot-password"
              className="text-brasa-400 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brasa-400"
            >
              Solicitar nuevo enlace
            </Link>
          </p>
        </div>
      </main>
    );
  }

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
          {"Nueva contrase\u00f1a"}
        </h1>

        <p className="mb-6 text-sm leading-6 text-stone-400">
          Establece una contrase\u00f1a nueva para tu cuenta.
        </p>

        <form onSubmit={handleSubmit} aria-busy={submitting} className="space-y-5">
          <fieldset disabled={submitting} className="min-w-0 space-y-5">
            <div>
              <label htmlFor="reset-password" className="text-sm text-stone-300">Nueva contrase\u00f1a</label>
              <input
                id="reset-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="reset-confirmation" className="text-sm text-stone-300">Confirmar contrase\u00f1a</label>
              <input
                id="reset-confirmation"
                name="confirmation"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                aria-invalid={Boolean(error && password !== confirmation)}
                aria-describedby={error ? "reset-error" : undefined}
                className={inputClassName}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-stone-400">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                className="size-4 accent-brasa-500"
              />
              {"Mostrar contrase\u00f1a"}
            </label>
          </fieldset>

          {error && (
            <p id="reset-error" role="alert" className="break-words border-l-2 border-red-500 pl-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brasa-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brasa-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Restableciendo..." : "Restablecer contrase\u00f1a"}
          </button>
        </form>
      </div>
    </main>
  );
}