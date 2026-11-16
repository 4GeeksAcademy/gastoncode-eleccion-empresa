'use client';

interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

export default function FormSelect({
  label,
  value,
  onChange,
  options,
}: Props) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}