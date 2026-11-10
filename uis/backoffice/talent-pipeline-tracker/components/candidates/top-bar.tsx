"use client";

import { useEffect, useState } from "react";
import { SessionControls } from "../session-controls";

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
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={toggleTheme}
          aria-pressed={theme === "light"}
          className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-chip)] px-3 py-1.5 text-xs text-[var(--text-muted)]"
        >
          {theme === "dark" ? "Modo oscuro" : "Modo claro"}
        </button>
        <p className="font-brand text-lg text-[var(--text-accent)] sm:text-xl">BRASALAND</p>
        <SessionControls />
      </div>
    </header>
  );
}
