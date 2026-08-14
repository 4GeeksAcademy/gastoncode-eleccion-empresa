export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#564334] bg-[#131313]/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          className="rounded-md border border-[#564334] px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-[#ddc1ae]"
        >
          Menú
        </button>
        <p className="font-brand text-lg tracking-[0.1em] text-[#ffb77d] sm:text-xl">
          BRASALAND
        </p>
        <span className="rounded-full bg-[#66402f]/70 px-3 py-1 text-xs text-[#f0bba4]">
          RRHH
        </span>
      </div>
    </header>
  );
}
