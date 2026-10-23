"use client";

import { useEffect, useState } from "react";
import {
  BRANCH_OPTIONS,
  CATEGORY_OPTIONS,
  ORIGIN_OPTIONS,
  STATUS_OPTIONS,
  type IncidentSummary,
} from "@/lib/incidents";
import { IncidentRequestError, fetchSummary } from "@/lib/incidents-api";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; summary: IncidentSummary };

type Option = { readonly value: string; readonly label: string };

function Breakdown({
  id,
  title,
  options,
  counts,
  total,
}: {
  id: string;
  title: string;
  options: readonly Option[];
  counts: Record<string, number>;
  total: number;
}) {
  return (
    <section className="card breakdown" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      <ul className="dataList">
        {options.map((option) => {
          const count = counts[option.value] ?? 0;
          const percent = total ? Math.round((count / total) * 100) : 0;
          return (
            <li key={option.value}>
              <div className="dataRow">
                <span>{option.label}</span>
                <strong>
                  {count}
                  <small> · {percent}%</small>
                </strong>
              </div>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function SummaryPanel() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchSummary(controller.signal)
      .then((summary) => setState({ kind: "ready", summary }))
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          kind: "error",
          message:
            failure instanceof IncidentRequestError
              ? failure.message
              : "No pudimos cargar el resumen de incidencias. Inténtalo de nuevo en unos minutos.",
        });
      });
    return () => controller.abort();
  }, [attempt]);

  function reload() {
    setState({ kind: "loading" });
    setAttempt((current) => current + 1);
  }

  if (state.kind === "loading") {
    return (
      <div className="card centered" role="status">
        <span className="spinner" aria-hidden="true" />
        <span>Cargando resumen...</span>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="card centered">
        <p className="notice noticeError" role="alert">
          {state.message}
        </p>
        <button type="button" onClick={reload}>
          Reintentar
        </button>
      </div>
    );
  }

  const { summary } = state;
  return (
    <div className="summaryPanel">
      <div className="metrics">
        <div className="metric metricTotal">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        {STATUS_OPTIONS.map((option) => (
          <div key={option.value} className="metric">
            <span>{option.label}</span>
            <strong>{summary.by_status[option.value] ?? 0}</strong>
          </div>
        ))}
      </div>

      {summary.total === 0 && (
        <p className="notice" role="status">
          Todavía no hay incidencias registradas.
        </p>
      )}

      <div className="breakdownGrid">
        <Breakdown id="status" title="Por estado" options={STATUS_OPTIONS} counts={summary.by_status} total={summary.total} />
        <Breakdown id="origin" title="Por origen" options={ORIGIN_OPTIONS} counts={summary.by_origin} total={summary.total} />
        <Breakdown id="category" title="Por categoría" options={CATEGORY_OPTIONS} counts={summary.by_category} total={summary.total} />
        <Breakdown id="branch" title="Por sede" options={BRANCH_OPTIONS} counts={summary.by_branch} total={summary.total} />
      </div>

      <div className="formActions">
        <button type="button" className="secondaryButton" onClick={reload}>
          Actualizar
        </button>
      </div>
    </div>
  );
}
