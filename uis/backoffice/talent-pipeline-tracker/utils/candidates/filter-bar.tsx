"use client";

import { FormEvent } from "react";
import { stageOptions, statusOptions } from "@/types/candidates";
import { toLabel } from "@/components/candidates/labels";
import { useQueryUpdater } from "@/components/candidates/query-updater";
import { chipClass } from "@/components/candidates/chip-class";

type FilterBarProps = {
  stage: string;
  status: string;
  search: string;
  email: string;
  limitValue: string;
};

export function FilterBar({ stage, status, search, email, limitValue }: FilterBarProps) {
  const update = useQueryUpdater();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    update({
      search: String(values.get("search") || ""),
      email: String(values.get("email") || ""),
      status: String(values.get("status") || ""),
    });
  };

  return (
    <form className="mb-6 space-y-3" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar por nombre o puesto"
          className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] placeholder:text-[var(--placeholder)] focus:ring-2"
        />
        <input
          type="email"
          name="email"
          defaultValue={email}
          placeholder="Filtrar por email"
          className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] placeholder:text-[var(--placeholder)] focus:ring-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <select
          name="status"
          defaultValue={status}
          className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-muted)]"
        >
          <option value="">Todos los estados</option>
          {statusOptions.map((item) => (
            <option key={item} value={item}>{toLabel(item)}</option>
          ))}
        </select>
        <button className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)]">
          Aplicar filtros
        </button>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[9, 12, 24, "all"].map((item) => (
          <button key={item} type="button" className={chipClass(String(item) === limitValue)} onClick={() => update({ limit: String(item) })}>
            {item === "all" ? "Todos" : `${item} / página`}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" className={chipClass(!stage)} onClick={() => update({ stage: "" })}>Todas</button>
        {stageOptions.map((item) => (
          <button key={item} type="button" className={chipClass(stage === item)} onClick={() => update({ stage: item })}>
            {toLabel(item)}
          </button>
        ))}
      </div>
    </form>
  );
}