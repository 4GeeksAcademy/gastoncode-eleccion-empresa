'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchSuppliers,
  searchSuppliers,
  createSupplier,
  updateRate,
  updateStatus,
  deleteSupplier,
  type Supplier,
  type CreateSupplierInput,
} from './components/api';
import SearchBar from './components/search-bar';
import SupplierList from './components/supplier-list';
import SupplierForm from './components/supplier-form';
import RateDialog from './components/rate-dialog';
import DeleteDialog from './components/delete-dialog';

export default function Home() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [rateTarget, setRateTarget] = useState<{
    id: number;
    name: string;
    rate: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch {
      setError('No se pudo cargar la lista de proveedores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleSearch(country: string, categories: string) {
    setSearching(true);
    setError(null);
    try {
      if (!country && !categories) {
        await loadAll();
      } else {
        const data = await searchSuppliers(
          country || undefined,
          categories || undefined
        );
        setSuppliers(data);
      }
    } catch {
      setError('Error al buscar proveedores.');
    } finally {
      setSearching(false);
    }
  }

  async function handleCreate(data: CreateSupplierInput) {
    try {
      await createSupplier(data);
      setShowForm(false);
      flash('Proveedor creado correctamente.');
      await loadAll();
    } catch {
      setError('Error al crear el proveedor.');
    }
  }

  async function handleRate(id: number, rate: number) {
    try {
      await updateRate(id, rate);
      flash('Tarifa actualizada.');
      await loadAll();
    } catch {
      setError('Error al actualizar la tarifa.');
    }
  }

  async function handleToggleStatus(
    id: number,
    _name: string,
    currentStatus: 'active' | 'suspended'
  ) {
    const next = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateStatus(id, next);
      flash(
        next === 'active' ? 'Proveedor reactivado.' : 'Proveedor suspendido.'
      );
      await loadAll();
    } catch {
      setError('Error al cambiar el estado.');
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteSupplier(id);
      flash('Proveedor eliminado.');
      setDeleteTarget(null);
      await loadAll();
    } catch {
      setError('Error al eliminar el proveedor.');
    }
  }

  return (
    <>
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-400">
                Brasaland
              </h1>
              <p className="text-xs text-stone-500">Proveedores</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 sm:px-4"
          >
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">+ Nuevo proveedor</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {/* Mensaje flash */}
        {successMsg && (
          <div className="mb-6 rounded-xl border border-emerald-600/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-600/40 bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Búsqueda */}
        <div className="mb-8">
          <SearchBar onSearch={handleSearch} loading={searching} />
        </div>

        {/* Listado */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-700 border-t-amber-500" />
          </div>
        ) : (
          <SupplierList
            suppliers={suppliers}
            onEditRate={(id, name) => {
              const s = suppliers.find((x) => x.id === id);
              if (s) setRateTarget({ id, name, rate: s.rate_per_unit });
            }}
            onToggleStatus={handleToggleStatus}
            onDelete={(id, name) => setDeleteTarget({ id, name })}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-4 text-center text-xs text-stone-600">
        Brasaland — Parrilla & Asados
      </footer>

      {/* Modal: nuevo proveedor */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 pt-16"
          onClick={() => setShowForm(false)}
        >
          <div
            className="mb-16 w-full max-w-lg rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-stone-100">
              Nuevo proveedor
            </h2>
            <SupplierForm
              onSubmit={handleCreate}
              onClose={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Modal: actualizar tarifa */}
      {rateTarget && (
        <RateDialog
          supplierId={rateTarget.id}
          supplierName={rateTarget.name}
          currentRate={rateTarget.rate}
          onSubmit={handleRate}
          onClose={() => setRateTarget(null)}
        />
      )}

      {/* Modal: eliminar */}
      {deleteTarget && (
        <DeleteDialog
          supplierId={deleteTarget.id}
          supplierName={deleteTarget.name}
          onSubmit={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
