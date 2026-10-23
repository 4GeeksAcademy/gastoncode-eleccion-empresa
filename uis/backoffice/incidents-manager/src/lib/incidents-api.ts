import {
  SESSION_INVALIDATED_EVENT,
  clearToken,
  getToken,
} from "../../../auth-shared/auth-api";
import type {
  Incident,
  IncidentField,
  IncidentInput,
  IncidentSummary,
} from "./incidents";

const FIELDS: readonly IncidentField[] = [
  "title",
  "description",
  "category",
  "origin",
  "branch",
];

export const GENERIC_ERROR =
  "No pudimos registrar la incidencia. Inténtalo de nuevo en unos minutos.";

/** Error con un mensaje apto para mostrar al usuario y, si aplica, errores por campo. */
export class IncidentRequestError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Partial<Record<IncidentField, true>> = {},
  ) {
    super(message);
    this.name = "IncidentRequestError";
  }
}

function invalidFields(body: unknown): Partial<Record<IncidentField, true>> {
  const fields: Partial<Record<IncidentField, true>> = {};
  if (typeof body !== "object" || body === null || !("detail" in body)) return fields;
  if (!Array.isArray(body.detail)) return fields;
  for (const item of body.detail as unknown[]) {
    if (typeof item !== "object" || item === null || !("field" in item)) continue;
    const name = String(item.field).replace(/^body\./, "");
    if ((FIELDS as readonly string[]).includes(name)) fields[name as IncidentField] = true;
  }
  return fields;
}

function endSession(token: string | null): never {
  if (token === getToken()) {
    clearToken();
    window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
  }
  throw new IncidentRequestError("Tu sesión expiró. Inicia sesión nuevamente.");
}

export async function createIncident(data: IncidentInput): Promise<Incident> {
  const token = getToken();
  if (!token) endSession(token);

  let response: Response;
  try {
    response = await fetch("/api/incidents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });
  } catch {
    throw new IncidentRequestError(
      "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.",
    );
  }

  if (response.ok) return (await response.json()) as Incident;
  if (response.status === 401) endSession(token);
  if (response.status === 403) {
    throw new IncidentRequestError("No tienes permiso para registrar incidencias.");
  }
  if (response.status === 400) {
    const fields = invalidFields(await response.json().catch(() => null));
    throw new IncidentRequestError(
      "Revisa los campos marcados e inténtalo de nuevo.",
      fields,
    );
  }
  throw new IncidentRequestError(GENERIC_ERROR);
}

export async function fetchSummary(signal?: AbortSignal): Promise<IncidentSummary> {
  const token = getToken();
  if (!token) endSession(token);

  let response: Response;
  try {
    response = await fetch("/api/incidents/summary", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal,
    });
  } catch (failure) {
    if (signal?.aborted) throw failure;
    throw new IncidentRequestError(
      "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.",
    );
  }

  if (response.status === 401) endSession(token);
  if (response.status === 403) {
    throw new IncidentRequestError("No tienes permiso para ver el resumen de incidencias.");
  }
  if (!response.ok) {
    throw new IncidentRequestError(
      "No pudimos cargar el resumen de incidencias. Inténtalo de nuevo en unos minutos.",
    );
  }
  return (await response.json()) as IncidentSummary;
}
