'use client';

interface Props {
  status: 'active' | 'suspended';
}

export default function StatusBadge({ status }: Props) {
  const isActive = status === 'active';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        isActive
          ? 'bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/40'
          : 'bg-red-600/20 text-red-400 ring-1 ring-red-500/40'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? 'bg-emerald-400' : 'bg-red-400'
        }`}
      />
      {status}
    </span>
  );
}