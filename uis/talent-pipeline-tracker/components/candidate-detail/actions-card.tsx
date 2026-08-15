"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toLabel } from "@/components/candidates/labels";
import { stageOptions, statusOptions } from "@/types/candidates";

type ActionsCardProps = {
  id: string;
  status: string;
  stage: string;
};

export function ActionsCard({ id, status, stage }: ActionsCardProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentStage, setCurrentStage] = useState(stage);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const onChange = async (selected: string) => {
    if (!selected || pending) return;

    const [field, value] = selected.split(":");
    if (!value || (field !== "status" && field !== "stage")) return;

    const nextStatus = field === "status" ? value : currentStatus;
    const nextStage = field === "stage" ? value : currentStage;

    setPending(true);
    setMessage("");

    try {
      const response = await fetch(`https://playground.4geeks.com/tracker/api/v1/records/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          stage: nextStage,
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar");
      }

      setCurrentStatus(nextStatus);
      setCurrentStage(nextStage);
      setMessage("Actualizado correctamente");
      router.refresh();
    } catch {
      setMessage("Error al actualizar. Intenta otra vez.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] p-6 shadow-[0_10px_40px_var(--shadow-card)]">
      <h2 className="mb-5 font-brand text-5xl text-[var(--foreground)] sm:text-4xl">Acciones</h2>
      <div className="space-y-3">
        <p className="text-sm text-[var(--text-muted)]">Cambia estado o etapa en una sola interacción.</p>
        <select
          defaultValue=""
          disabled={pending}
          onChange={(event) => {
            const selected = event.target.value;
            event.target.value = "";
            void onChange(selected);
          }}
          className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2 disabled:opacity-60"
        >
          <option value="">Selecciona una acción</option>
          <optgroup label="Cambiar etapa">
            {stageOptions.map((option) => (
              <option key={`stage:${option}`} value={`stage:${option}`}>
                {toLabel(option)}
              </option>
            ))}
          </optgroup>
          <optgroup label="Cambiar estado">
            {statusOptions.map((option) => (
              <option key={`status:${option}`} value={`status:${option}`}>
                {toLabel(option)}
              </option>
            ))}
          </optgroup>
        </select>
        <p className="text-sm text-[var(--text-muted)]">
          Etapa actual: <span className="text-[var(--foreground)]">{toLabel(currentStage)}</span> · Estado actual: <span className="text-[var(--foreground)]">{toLabel(currentStatus)}</span>
        </p>
        {message && <p className="text-sm text-[var(--text-soft)]">{message}</p>}
      </div>
    </section>
  );
}
