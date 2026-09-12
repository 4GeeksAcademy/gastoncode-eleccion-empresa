'use client';

interface Props {
  saving: boolean;
  disabled: boolean;
  onCancel: () => void;
  submitLabel?: string;
}

export default function FormActions({
  saving,
  disabled,
  onCancel,
  submitLabel = 'Crear proveedor',
}: Props) {
  return (
    <div className="flex justify-end gap-3 border-t border-stone-800 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-400 transition hover:border-stone-600 hover:text-stone-300"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving || disabled}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
      >
        {saving ? 'Guardando…' : submitLabel}
      </button>
    </div>
  );
}