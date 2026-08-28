'use client';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export default function FormTextarea({
  label,
  value,
  onChange,
  rows = 2,
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
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
      />
    </div>
  );
}