"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "brasaland-theme";

export function TopBar() {
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
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={toggleTheme}
          aria-pressed={theme === "light"}
          className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-chip)] px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)] transition hover:bg-[var(--surface-1)]"
        >
          {theme === "dark" ? "Modo oscuro" : "Modo claro"}
        </button>
        <p className="font-brand text-lg tracking-[0.1em] text-[var(--text-accent)] sm:text-xl">
          BRASALAND
        </p>
        <span className="rounded-full bg-[var(--tag-bg)]/70 px-3 py-1 text-xs text-[var(--text-soft)]">
          RRHH
        </span>
      </div>
    </header>
  );
}
