"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DetailTopBarProps = {
  brand: string;
};

const THEME_KEY = "brasaland-theme";

export function DetailTopBar({ brand }: DetailTopBarProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(THEME_KEY, next);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-strong)] bg-[var(--background)]/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md p-2 text-[var(--text-accent)] transition hover:bg-[var(--surface-pill)]"
            aria-label="Volver"
          >
            ←
          </Link>
          <p className="font-brand text-3xl tracking-[0.12em] text-[var(--text-accent)] sm:text-4xl">{brand}</p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-pressed={theme === "light"}
          className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-chip)] px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)] transition hover:bg-[var(--surface-1)]"
        >
          {theme === "dark" ? "Modo oscuro" : "Modo claro"}
        </button>
      </div>
    </header>
  );
}
