"use client";

import { ModuleLink } from "../../../auth-shared/module-link";
import { useAuth } from "../../../auth-shared/auth-context";
import { useTrackerTheme } from "../../utils/use-tracker-theme";
import { SessionControls } from "../session-controls";

type DetailTopBarProps = {
  brand: string;
};

export function DetailTopBar({ brand }: DetailTopBarProps) {
  const { theme, toggleTheme } = useTrackerTheme();
  const { internalNavigation } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-strong)] bg-[var(--background)]/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <ModuleLink
            basePath="/talent-pipeline-tracker"
            href="/"
            className="rounded-md p-2 text-[var(--text-accent)] transition hover:bg-[var(--surface-pill)]"
            aria-label="Volver"
            onClick={(event) => {
              const previousUrl = document.referrer;
              if (!internalNavigation && previousUrl && new URL(previousUrl).origin === window.location.origin) {
                event.preventDefault();
                window.history.back();
              }
            }}
          >
            ←
          </ModuleLink>
          <p className="font-brand text-3xl tracking-[0.12em] text-[var(--text-accent)] sm:text-4xl">{brand}</p>
        </div>
        <SessionControls />
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
