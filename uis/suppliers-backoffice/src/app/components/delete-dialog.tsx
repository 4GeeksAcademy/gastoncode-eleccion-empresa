'use client';

import { useState } from 'react';

interface Props {
  supplierId: number;
  supplierName: string;
  onSubmit: (id: number) => Promise<void>;
  onClose: () => void;
}

export default function DeleteDialog({
  supplierId,
  supplierName,
  onSubmit,
  onClose,
}: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onSubmit(supplierId);
      onClose();
    } finally {
      setDeleting(false);
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
          Eliminar proveedor
        </h2>
        <p className="mb-4 text-sm text-stone-400">
          ¿Estás seguro de que deseas eliminar a{' '}
          <strong className="text-stone-200">{supplierName}</strong>? Esta
          acción no se puede deshacer.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-400 transition hover:border-stone-600 hover:text-stone-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}