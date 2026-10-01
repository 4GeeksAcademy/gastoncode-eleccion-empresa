'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import FormField from '../components/form-field';
import { useAuth } from '../components/auth-context';

export default function LoginPage() {
  const { user, initializing, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initializing && user) router.replace('/');
  }, [initializing, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo iniciar sesión.'
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
            Brasaland
          </h1>
          <p className="text-xs text-stone-500">Panel de proveedores</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-stone-800 bg-stone-900/50 p-6"
        >
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
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="text-center text-xs text-stone-500">
            ¿No tenés cuenta?{' '}
            <Link
              href="/register"
              className="font-medium text-amber-400 hover:text-amber-300"
            >
              Registrate
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
