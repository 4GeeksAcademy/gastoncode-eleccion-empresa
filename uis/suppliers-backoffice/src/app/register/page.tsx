'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FormField from '../components/form-field';
import { register } from '../components/auth-api';
import { useAuth } from '../components/auth-context';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await register({ email, password, name: name || undefined });
      await login(email, password);
      router.replace('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo crear la cuenta.'
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🔥</span>
          <h1 className="text-2xl font-bold tracking-tight text-amber-400">
            Crear cuenta
          </h1>
          <p className="text-xs text-stone-500">Panel de proveedores</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-stone-800 bg-stone-900/50 p-6"
        >
          <FormField
            label="Nombre"
            value={name}
            onChange={setName}
            placeholder="Nombre y apellido"
          />

          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            placeholder="tu@brasaland.com"
          />

          <FormField
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            required
            placeholder="••••••••"
          />

          <FormField
            label="Repetir contraseña"
            type="password"
            value={confirm}
            onChange={setConfirm}
            required
            placeholder="••••••••"
          />

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-600/40 bg-red-900/30 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>

          <p className="text-center text-xs text-stone-500">
            ¿Ya tenés cuenta?{' '}
            <Link
              href="/login"
              className="font-medium text-amber-400 hover:text-amber-300"
            >
              Iniciá sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
