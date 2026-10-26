"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BRANCH_OPTIONS,
  CATEGORY_OPTIONS,
  ORIGIN_OPTIONS,
  STATUS_OPTIONS,
  type Incident,
  type IncidentBranch,
  type IncidentOrigin,
  type IncidentStatus,
} from "@/lib/incidents";
import {
  fetchIncidents,
  IncidentRequestError,
  updateIncidentStatus,
  type IncidentFilters,
} from "@/lib/incidents-api";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; incidents: Incident[] };

type FilterState = {
  status: "" | IncidentStatus;
  origin: "" | IncidentOrigin;
  branch: "" | IncidentBranch;
};

const INITIAL_FILTERS: FilterState = { status: "", origin: "", branch: "" };
const FINAL_STATUSES: IncidentStatus[] = ["resolved", "discarded"];
const INCIDENTS_ERROR = "No pudimos cargar las incidencias. Inténtalo de nuevo en unos minutos.";

function optionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function messageFor(failure: unknown, fallback: string) {
  return failure instanceof IncidentRequestError ? failure.message : fallback;
}

export default function IncidentsPanel() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<{
    incident: Incident;
    status: IncidentStatus;
  } | null>(null);

  const requestFilters = useMemo<IncidentFilters>(
    () => ({
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.origin ? { origin: filters.origin } : {}),
      ...(filters.branch ? { branch: filters.branch } : {}),
    }),
    [filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchIncidents(requestFilters, controller.signal)
      .then((incidents) => setState({ kind: "ready", incidents }))
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          kind: "error",
          message: messageFor(
            failure,
            INCIDENTS_ERROR,
          ),
        });
      });
    return () => controller.abort();
  }, [requestFilters, attempt]);

  function reload() {
    setState({ kind: "loading" });
    setAttempt((current) => current + 1);
  }

  function updateFilters(update: Partial<FilterState>) {
    setState({ kind: "loading" });
    setFilters((current) => ({ ...current, ...update }));
  }

  async function applyStatus(incident: Incident, status: IncidentStatus) {
    setConfirmation(null);
    setNotice("");
    setUpdating((current) => ({ ...current, [incident.id]: true }));
    if (state.kind === "ready") {
      setState({
        kind: "ready",
        incidents: state.incidents.map((item) =>
          item.id === incident.id ? { ...item, status } : item,
        ),
      });
    }

    let updated: Incident;
    try {
      updated = await updateIncidentStatus(incident.id, status);
    } catch (failure) {
      setState((current) =>
        current.kind === "ready"
          ? {
              kind: "ready",
              incidents: current.incidents.map((item) =>
                item.id === incident.id ? incident : item,
              ),
            }
          : current,
      );
      setNotice(messageFor(failure, "No pudimos actualizar la incidencia. El estado anterior se ha restaurado."));
      setUpdating((current) => ({ ...current, [incident.id]: false }));
      return;
    }

    setUpdating((current) => ({ ...current, [incident.id]: false }));
    const matchesStatusFilter = !requestFilters.status || requestFilters.status === updated.status;
    const matchesOriginFilter = !requestFilters.origin || requestFilters.origin === updated.origin;
    const matchesBranchFilter = !requestFilters.branch || requestFilters.branch === updated.branch;
    setState((current) =>
      current.kind === "ready"
        ? {
            kind: "ready",
            incidents: !matchesStatusFilter || !matchesOriginFilter || !matchesBranchFilter
              ? current.incidents.filter((item) => item.id !== updated.id)
              : current.incidents.map((item) => item.id === updated.id ? updated : item),
          }
        : current,
    );
    setNotice(`Estado de «${incident.title}» actualizado a ${optionLabel(STATUS_OPTIONS, updated.status)}.`);
  }

  function requestStatusChange(incident: Incident, status: IncidentStatus) {
    if (FINAL_STATUSES.includes(status)) {
      setConfirmation({ incident, status });
      return;
    }
    void applyStatus(incident, status);
  }

  return (
    <section className="incidentsPanel" aria-label="Incidencias">
      <div className="card filterGrid" aria-label="Filtros de incidencias">
        <div className="field">
          <label htmlFor="filter-status">Estado</label>
          <select id="filter-status" value={filters.status} onChange={(event) => updateFilters({ status: event.target.value as FilterState["status"] })}>
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-origin">Origen</label>
          <select id="filter-origin" value={filters.origin} onChange={(event) => updateFilters({ origin: event.target.value as FilterState["origin"] })}>
            <option value="">Todos los orígenes</option>
            {ORIGIN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-branch">Sede</label>
          <select id="filter-branch" value={filters.branch} onChange={(event) => updateFilters({ branch: event.target.value as FilterState["branch"] })}>
            <option value="">Todas las sedes</option>
            {BRANCH_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      {notice && <p className="notice" role="status">{notice}</p>}
      {confirmation && (
        <div className="confirmation card" role="alertdialog" aria-modal="true" aria-labelledby="status-confirm-title">
          <h2 id="status-confirm-title">Confirmar cambio de estado</h2>
          <p>«{confirmation.incident.title}» pasará a “{optionLabel(STATUS_OPTIONS, confirmation.status)}”. Este cambio es definitivo y no se puede revertir.</p>
          <div className="confirmationActions">
            <button type="button" className="secondaryButton" onClick={() => setConfirmation(null)}>Cancelar</button>
            <button type="button" onClick={() => void applyStatus(confirmation.incident, confirmation.status)}>Confirmar</button>
          </div>
        </div>
      )}

      {state.kind === "loading" && (
        <div className="card centered" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Cargando incidencias...</span>
        </div>
      )}

      {state.kind === "error" && (
        <div className="card centered">
          <p className="notice noticeError" role="alert">{state.message}</p>
          <button type="button" onClick={reload}>Reintentar</button>
        </div>
      )}

      {state.kind === "ready" && state.incidents.length === 0 && (
        <div className="card centered" role="status">
          <h2>{filters.status || filters.origin || filters.branch ? "No hay incidencias con estos filtros" : "Todavía no hay incidencias registradas"}</h2>
          <p className="muted">{filters.status || filters.origin || filters.branch ? "Prueba a cambiar o quitar algún filtro para ver más resultados." : "Cuando se registre una incidencia, aparecerá aquí."}</p>
        </div>
      )}

      {state.kind === "ready" && state.incidents.length > 0 && (
        <>
          <p className="muted resultCount" role="status">{state.incidents.length} {state.incidents.length === 1 ? "incidencia" : "incidencias"}</p>
          <div className="incidentList">
            {state.incidents.map((incident) => (
              <article className="card incidentCard" key={incident.id}>
                <div className="incidentDetails">
                  <div className="incidentTitleRow">
                    <h2>{incident.title}</h2>
                    <span className={`statusBadge status-${incident.status}`}>{optionLabel(STATUS_OPTIONS, incident.status)}</span>
                  </div>
                  <p>{incident.description}</p>
                  <dl className="incidentMeta">
                    <div><dt>Categoría</dt><dd>{optionLabel(CATEGORY_OPTIONS, incident.category)}</dd></div>
                    <div><dt>Origen</dt><dd>{optionLabel(ORIGIN_OPTIONS, incident.origin)}</dd></div>
                    <div><dt>Sede</dt><dd>{optionLabel(BRANCH_OPTIONS, incident.branch)}</dd></div>
                    <div><dt>Registrada</dt><dd><time dateTime={incident.created_at}>{new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(incident.created_at))}</time></dd></div>
                  </dl>
                </div>
                <div className="statusEditor">
                  <label htmlFor={`status-${incident.id}`}>Cambiar estado</label>
                  <select
                    id={`status-${incident.id}`}
                    value={incident.status}
                    disabled={Boolean(updating[incident.id]) || FINAL_STATUSES.includes(incident.status)}
                    aria-label={`Cambiar estado de ${incident.title}`}
                    onChange={(event) => requestStatusChange(incident, event.target.value as IncidentStatus)}
                  >
                    {STATUS_OPTIONS.map((option) => {
                      const canTransition = incident.status === "open"
                        ? ["open", "in_progress", "discarded"].includes(option.value)
                        : incident.status === "in_progress"
                          ? ["in_progress", "resolved", "discarded"].includes(option.value)
                          : option.value === incident.status;
                      return canTransition ? <option key={option.value} value={option.value}>{option.label}</option> : null;
                    })}
                  </select>
                  {updating[incident.id] && <span className="muted" role="status">Guardando...</span>}
                  {FINAL_STATUSES.includes(incident.status) && <span className="muted">Estado final</span>}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}