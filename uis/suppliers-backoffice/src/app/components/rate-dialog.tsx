'use client';

import { useState } from 'react';

interface Props {
  supplierId: number;
  supplierName: string;
  currentRate: number;
  onSubmit: (id: number, rate: number) => Promise<void>;
  onClose: () => void;
}

export default function RateDialog({
  supplierId,
  supplierName,
  currentRate,
  onSubmit,
  onClose,
}: Props) {
  const [rate, setRate] = useState(currentRate);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(supplierId, rate);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold text-stone-100">
          Actualizar tarifa
        </h2>
        <p className="mb-4 text-sm text-stone-500">{supplierName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
              Nueva tarifa por unidad
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              required
              autoFocus
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-lg text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-400 transition hover:border-stone-600 hover:text-stone-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}