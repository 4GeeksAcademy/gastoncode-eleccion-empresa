import Link from "next/link";

type DetailTopBarProps = {
  brand: string;
};

export function DetailTopBar({ brand }: DetailTopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#564334] bg-[#131313]/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-md p-2 text-[#ffb77d] transition hover:bg-[#2a2a2a]"
          aria-label="Volver"
        >
          ←
        </Link>
        <p className="font-brand text-3xl tracking-[0.12em] text-[#ffb77d] sm:text-4xl">{brand}</p>
      </div>
    </header>
  );
}
