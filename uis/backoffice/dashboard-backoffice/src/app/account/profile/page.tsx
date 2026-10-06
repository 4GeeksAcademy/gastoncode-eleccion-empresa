"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, fetchProfile, updateProfile, type Profile } from "../../components/auth-api";
import { useAuth } from "../../components/auth-context";

const fieldClassName = "mt-2 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-3 text-base text-stone-100 outline-none focus:border-brasa-400 focus:ring-2 focus:ring-brasa-400/20 disabled:opacity-60";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) return "No tienes permisos para consultar este perfil.";
  return error instanceof Error ? error.message : "No se pudo cargar el perfil.";
}

export default function AccountProfilePage() {
  const { refreshSession } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProfile();
      setProfile(result);
      setName(result.name ?? "");
      setPhone(result.phone ?? "");
      setAddress(result.address ?? "");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || saving) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await updateProfile({ name, phone, address });
      setProfile(updated);
      setName(updated.name ?? "");
      setPhone(updated.phone ?? "");
      setAddress(updated.address ?? "");
      await refreshSession();
      setSuccess("El perfil se actualizó.");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!profile) return;
    setName(profile.name ?? "");
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? "");
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-stone-800 pb-6">
        <Link href="/account" className="text-sm text-stone-400 hover:text-brasa-400 focus-visible:outline-2 focus-visible:outline-brasa-400">
          Volver a cuenta
        </Link>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-brasa-400">Datos personales</p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-50">Perfil</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">Edita tu nombre, teléfono y dirección. Estos datos corresponden a tu perfil personal, no a las credenciales de acceso.</p>
      </header>

      {loading && <p className="py-8 text-sm text-stone-400" role="status">Cargando perfil...</p>}

      {!loading && error && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 py-5">
          <p role="alert" className="text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => void loadProfile()} className="text-sm text-brasa-400 underline underline-offset-4">Reintentar</button>
        </div>
      )}

      {!loading && profile && (
        <form onSubmit={save} aria-busy={saving} className="max-w-xl space-y-6 py-8">
          <div>
            <label htmlFor="profile-name" className="text-sm text-stone-300">Nombre</label>
            <input id="profile-name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} disabled={saving} className={fieldClassName} />
          </div>
          <div>
            <label htmlFor="profile-phone" className="text-sm text-stone-300">Teléfono</label>
            <input id="profile-phone" name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={saving} className={fieldClassName} />
          </div>
          <div>
            <label htmlFor="profile-address" className="text-sm text-stone-300">Dirección</label>
            <textarea id="profile-address" name="address" autoComplete="street-address" rows={3} value={address} onChange={(event) => setAddress(event.target.value)} disabled={saving} className={fieldClassName} />
          </div>

          {error && <p role="alert" className="border-l-2 border-red-500 pl-3 text-sm text-red-300">{error}</p>}
          {success && <p role="status" className="border-l-2 border-emerald-500 pl-3 text-sm text-emerald-300">{success}</p>}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-brasa-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brasa-500 focus-visible:outline-2 focus-visible:outline-brasa-400 disabled:opacity-60">
              {saving ? "Guardando..." : "Guardar perfil"}
            </button>
            <button type="button" onClick={reset} disabled={saving} className="rounded-lg border border-stone-700 px-4 py-2.5 text-sm text-stone-300 hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-brasa-400">
              Descartar cambios
            </button>
          </div>
        </form>
      )}
    </div>
  );
}