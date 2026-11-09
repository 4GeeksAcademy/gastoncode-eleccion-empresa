"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

const navigation = [
  { href: "#nosotros", label: "Nosotros" },
  { href: "#beneficios", label: "Beneficios" },
  { href: "#contacto", label: "Contacto" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (menuOpen) firstLinkRef.current?.focus();
  }, [menuOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-amber-400/30 bg-stone-950/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6" aria-label="Navegación principal">
        <BrandLogo />
        <ul className="hidden items-center gap-6 text-sm font-semibold md:flex">
          {navigation.map(({ href, label }) => (
            <li key={href}>
              <a href={href} className="transition hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/application"
          className="hidden shrink-0 rounded-full bg-amber-400 px-3 py-2 text-xs font-bold text-stone-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 sm:px-4 sm:text-sm md:inline-block"
        >
          Quiero información
        </Link>
        <button
          ref={toggleRef}
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-stone-600 p-2 text-stone-100 transition hover:border-amber-300 hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 md:hidden"
          aria-controls="mobile-menu"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </nav>
      {menuOpen && (
        <div id="mobile-menu" className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6 md:hidden" aria-label="Navegación móvil">
          <div className="space-y-2 rounded-xl border border-stone-700 bg-stone-900/80 p-3">
            {navigation.map(({ href, label }, index) => (
              <a
                key={href}
                ref={index === 0 ? firstLinkRef : undefined}
                href={href}
                onClick={closeMenu}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-stone-200 transition hover:bg-stone-800 hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                {label}
              </a>
            ))}
            <Link
              href="/application"
              onClick={closeMenu}
              className="mt-2 block rounded-lg bg-amber-400 px-3 py-2 text-center text-sm font-bold text-stone-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
            >
              Quiero información
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
