'use client';

import { useState } from 'react';

interface Props {
  onSearch: (country: string, categories: string) => void;
  loading: boolean;
}

const COUNTRIES = [
  { value: '', label: 'Todos los países' },
  { value: 'Colombia', label: 'Colombia' },
  { value: 'USA', label: 'USA' },
];

const CATEGORIES = [
  { value: '', label: 'Todas las categorías' },
  { value: 'carne', label: 'Carne' },
  { value: 'verduras_y_hortalizas', label: 'Verduras' },
  { value: 'salsas_y_condimentos', label: 'Salsas y condimentos' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'lacteos', label: 'Lácteos' },
  { value: 'packaging', label: 'Empaques' },
  { value: 'productos_limpieza', label: 'Limpieza' },
  { value: 'carbon_y_combustible', label: 'Carbón y combustible' },
];

export default function SearchBar({ onSearch, loading }: Props) {
  const [country, setCountry] = useState('');
  const [categories, setCategories] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(country, categories);
  }

  function handleReset() {
    setCountry('');
    setCategories('');
    onSearch('', '');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-800 bg-stone-900/40 p-4"
    >
      <div className="min-w-[160px] flex-1">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
          País
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
        >
          {COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[160px] flex-1">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
          Categoría
        </label>
        <select
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50 sm:w-auto"
        >
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="w-full rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-400 transition hover:border-stone-600 hover:text-stone-300 sm:w-auto"
        >
          Limpiar
        </button>
      </div>
    </form>
  );
}