'use client';

import type { Supplier } from './api';
import SupplierCard from './supplier-card';

interface Props {
  suppliers: Supplier[];
  onEditRate: (id: number, name: string) => void;
  onToggleStatus: (id: number, name: string, status: 'active' | 'suspended') => void;
  onDelete: (id: number, name: string) => void;
}

export default function SupplierList({
  suppliers,
  onEditRate,
  onToggleStatus,
  onDelete,
}: Props) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-700 p-12 text-center">
        <p className="text-stone-500">No se encontraron proveedores.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {suppliers.map((s) => (
        <SupplierCard
          key={s.id}
          supplier={s}
          onEditRate={onEditRate}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}