import Link from "next/link";

type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <Link href="/" aria-label="Inicio Brasaland" className={`inline-block shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-brasaland.svg" alt="Brasaland" className="h-9 w-auto sm:h-10 md:h-11" />
    </Link>
  );
}
