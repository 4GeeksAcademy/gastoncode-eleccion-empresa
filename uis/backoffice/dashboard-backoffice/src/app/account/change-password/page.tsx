"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { changePassword, publicErrorMessage } from "../../components/auth-api";
import { useAuth } from "../../components/auth-context";

const fieldClassName = "mt-2 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-3 text-base text-stone-100 outline-none focus:border-brasa-400 focus:ring-2 focus:ring-brasa-400/20 disabled:opacity-60";

export default function ChangePasswordPage() {
  const { refreshSession } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSaving(true);
    let updatedSuccessfully = false;
    try {
      await changePassword(currentPassword, newPassword);
      updatedSuccessfully = true;
      setSuccess("Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
    } catch (failure) {
      setError(publicErrorMessage(failure, "No se pudo actualizar la contraseña."));
    } finally {
      setSaving(false);
    }
    if (updatedSuccessfully) await refreshSession();
  }

  return (
    <div className="space-y-10">
      <header className="border-b border-stone-800 pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brasa-400">
          Acceso y permisos
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-50">
          Cambiar contraseña
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">
          Introduce tu contraseña actual y una nueva para actualizar tus credenciales.
        </p>
      </header>

      {success && (
        <div className="border-l-2 border-emerald-500 pl-4">
          <p className="text-sm leading-6 text-emerald-300" role="status">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} aria-busy={saving} className="space-y-5">
        <div>
          <label htmlFor="change-current-password" className="text-sm text-stone-300">
            Contraseña actual
          </label>
          <input
            id="change-current-password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={saving}
            className={fieldClassName}
          />
        </div>

        <div>
          <label htmlFor="change-new-password" className="text-sm text-stone-300">
            Nueva contraseña
          </label>
          <input
            id="change-new-password"
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={saving}
            className={fieldClassName}
          />
        </div>

        <div>
          <label htmlFor="change-confirmation" className="text-sm text-stone-300">
            Confirmar nueva contraseña
          </label>
          <input
            id="change-confirmation"
            type="password"
            required
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={saving}
            className={fieldClassName}
          />
        </div>

        {error && (
          <p role="alert" className="break-words border-l-2 border-red-500 pl-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brasa-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brasa-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Actualizar contraseña"}
          </button>

          <Link
            href="/account"
            className="rounded-lg border border-stone-700 px-4 py-2.5 text-sm text-stone-200 hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-brasa-400"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}