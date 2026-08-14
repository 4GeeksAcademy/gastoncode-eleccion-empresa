export function ActionsCard() {
  return (
    <section className="rounded-xl border border-white/10 bg-[#2D2D2D] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
      <h2 className="mb-5 font-brand text-5xl text-[#e4e2e1] sm:text-4xl">Acciones</h2>
      <div className="space-y-3">
        <button className="w-full rounded-md bg-[#ff8c00] px-4 py-3 text-base font-semibold text-[#4d2600] transition hover:bg-[#ffb77d]">
          ↔ Cambiar Etapa
        </button>
        <button className="w-full rounded-md border border-[#66402f] px-4 py-3 text-base font-semibold text-[#f0bba4] transition hover:bg-[#66402f]/20">
          ⊞ Añadir Nota
        </button>
      </div>
    </section>
  );
}
