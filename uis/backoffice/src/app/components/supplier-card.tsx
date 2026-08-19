'use client';

import type { Supplier } from './api';
import StatusBadge from './status-badge';

interface Props {
  supplier: Supplier;
  onEditRate: (id: number, name: string) => void;
  onToggleStatus: (id: number, name: string, status: 'active' | 'suspended') => void;
  onDelete: (id: number, name: string) => void;
}

export default function SupplierCard({
  supplier,
  onEditRate,
  onToggleStatus,
  onDelete,
}: Props) {
  const symbol = supplier.currency === 'COP' ? '$' : 'US$';
  const rate = supplier.rate_per_unit.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5 transition hover:border-amber-700/60 hover:shadow-lg hover:shadow-amber-900/10">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-stone-100">{supplier.name}</h3>
        <StatusBadge status={supplier.status} />
      </div>

      <div className="mb-3 space-y-1 text-sm text-stone-400">
        <p>
          <span className="text-stone-500">País:</span> {supplier.country}
        </p>
        <p>
          <span className="text-stone-500">Categorías:</span>{' '}
          {supplier.categories.join(', ')}
        </p>
        <p>
          <span className="text-stone-500">Tarifa:</span>{' '}
          <span className="font-semibold text-amber-400">
            {symbol} {rate}/unidad
          </span>
        </p>
        {supplier.contact_email && (
          <p className="truncate">
            <span className="text-stone-500">Contacto:</span>{' '}
            {supplier.contact_email}
          </p>
        )}
        {supplier.notes && (
          <p className="italic text-stone-500">“{supplier.notes}”</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-stone-800 pt-3">
        <button
          onClick={() => onEditRate(supplier.id, supplier.name)}
          className="rounded-lg bg-amber-600/20 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-600/40"
        >
          Actualizar tarifa
        </button>
        <button
          onClick={() =>
            onToggleStatus(supplier.id, supplier.name, supplier.status)
          }
          className="rounded-lg bg-stone-700/50 px-3 py-1.5 text-xs font-medium text-stone-300 transition hover:bg-stone-700"
        >
          {supplier.status === 'active' ? 'Suspender' : 'Activar'}
        </button>
        <button
          onClick={() => onDelete(supplier.id, supplier.name)}
          className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-600/40"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}