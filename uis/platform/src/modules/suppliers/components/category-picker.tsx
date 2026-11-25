'use client';

const ALL_CATEGORIES = [
  'carne',
  'verduras_y_hortalizas',
  'salsas_y_condimentos',
  'bebidas',
  'lacteos',
  'packaging',
  'productos_limpieza',
  'carbon_y_combustible',
];

interface Props {
  selected: string[];
  onChange: (categories: string[]) => void;
}

export default function CategoryPicker({ selected, onChange }: Props) {
  function toggle(cat: string) {
    onChange(
      selected.includes(cat)
        ? selected.filter((c) => c !== cat)
        : [...selected, cat]
    );
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
        Categorías
      </label>
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => toggle(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              selected.includes(cat)
                ? 'bg-amber-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}