'use client';

import FormSelect from './form-select';

interface Props {
  country: string;
  currency: string;
  onChange: (key: 'country' | 'currency', value: string) => void;
}

export default function CountryCurrencyFields({
  country,
  currency,
  onChange,
}: Props) {
  return (
    <div className="flex gap-3">
      <FormSelect
        label="País"
        value={country}
        onChange={(v) => onChange('country', v)}
        options={[
          { value: 'Colombia', label: 'Colombia' },
          { value: 'USA', label: 'USA' },
        ]}
      />
      <FormSelect
        label="Moneda"
        value={currency}
        onChange={(v) => onChange('currency', v)}
        options={[
          { value: 'COP', label: 'COP ($)' },
          { value: 'USD', label: 'USD (US$)' },
        ]}
      />
    </div>
  );
}