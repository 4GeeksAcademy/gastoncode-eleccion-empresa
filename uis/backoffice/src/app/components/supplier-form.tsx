'use client';

import { useState } from 'react';
import type { CreateSupplierInput } from './api';
import FormField from './form-field';
import FormTextarea from './form-textarea';
import FormActions from './form-actions';
import CountryCurrencyFields from './country-currency-fields';
import CategoryPicker from './category-picker';

interface Props {
  onSubmit: (data: CreateSupplierInput) => Promise<void>;
  onClose: () => void;
}

export default function SupplierForm({ onSubmit, onClose }: Props) {
  const [form, setForm] = useState<CreateSupplierInput>({
    name: '',
    country: 'Colombia',
    categories: [],
    rate_per_unit: 0,
    currency: 'COP',
    status: 'active',
    contact_email: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        contact_email: form.contact_email || undefined,
        notes: form.notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof CreateSupplierInput>(
    key: K,
    value: CreateSupplierInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="Nombre"
        value={form.name}
        onChange={(v) => update('name', v)}
        required
      />

      <CountryCurrencyFields
        country={form.country}
        currency={form.currency}
        onChange={(key, value) =>
          update(key, value as 'Colombia' | 'USA' | 'COP' | 'USD')
        }
      />

      <FormField
        label="Tarifa por unidad"
        type="number"
        value={String(form.rate_per_unit || '')}
        onChange={(v) => update('rate_per_unit', parseFloat(v) || 0)}
        required
      />

      <CategoryPicker
        selected={form.categories}
        onChange={(cats) => update('categories', cats)}
      />

      <FormField
        label="Email de contacto"
        type="email"
        value={form.contact_email || ''}
        onChange={(v) => update('contact_email', v)}
      />

      <FormTextarea
        label="Notas"
        value={form.notes || ''}
        onChange={(v) => update('notes', v)}
      />

      <FormActions
        saving={saving}
        disabled={form.categories.length === 0}
        onCancel={onClose}
      />
    </form>
  );
}