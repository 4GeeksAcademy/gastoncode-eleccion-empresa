"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { forgotPassword } from "../components/auth-api";
import { BrasaMark } from "../components/site-header";

const inputClassName = "mt-2 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-3 text-base text-stone-100 outline-none placeholder:text-stone-600 focus:border-brasa-400 focus:ring-2 focus:ring-brasa-400/20 disabled:opacity-60";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      await forgotPassword(email.trim());
    } catch (failure) {
      setError(
        failure instanceof TypeError
          ? "No se pudo conectar con el servicio. Intenta nuevamente."
          : failure instanceof Error ? failure.message : "No se pudo completar la solicitud.",
      );
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSent(true);
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
          {"Restablecer contrase\u00f1a"}
        </h1>

        {!sent ? (
          <>
            <p className="mb-6 text-sm leading-6 text-stone-400">
              Introduce tu email y te enviaremos un enlace para restablecer tu contrase\u00f1a.
            </p>

            <form onSubmit={handleSubmit} aria-busy={submitting} className="space-y-5">
              <fieldset disabled={submitting} className="min-w-0 space-y-5">
                <div>
                  <label htmlFor="forgot-email" className="text-sm text-stone-300">Email</label>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClassName}
                  />
                </div>
              </fieldset>

              {error && (
                <p id="forgot-error" role="alert" className="break-words border-l-2 border-red-500 pl-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-brasa-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brasa-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-5">
            <div className="border-l-2 border-emerald-500 pl-4">
              <p className="text-sm leading-6 text-emerald-300">
                {"Si el email existe, recibir\u00e1s un enlace para restablecer tu contrase\u00f1a."}
              </p>
              <p className="mt-2 text-sm text-stone-400">
                {"Revisa tu bandeja de entrada y sigue las instrucciones."}
              </p>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-stone-500">
          {"\u00bfRecordaste tu contrase\u00f1a? "}
          <Link
            href="/login"
            className="text-brasa-400 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brasa-400"
          >
            Iniciar sesi\u00f3n
          </Link>
        </p>
      </div>
    </main>
  );
}