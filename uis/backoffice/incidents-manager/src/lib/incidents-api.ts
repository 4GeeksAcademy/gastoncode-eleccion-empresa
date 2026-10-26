import {
  SESSION_INVALIDATED_EVENT,
  clearToken,
  getToken,
} from "../../../auth-shared/auth-api";
import type {
  Incident,
  IncidentField,
  IncidentInput,
  IncidentOrigin,
  IncidentBranch,
  IncidentStatus,
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

async function readJson<T>(response: Response, failureMessage: string): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    throw new IncidentRequestError(failureMessage);
  }
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

  if (response.ok) {
    return readJson<Incident>(response, "El servidor devolvió una respuesta no válida al registrar la incidencia.");
  }
  if (response.status === 401) endSession(token);
  if (response.status === 403) {
    throw new IncidentRequestError("No tienes permiso para registrar incidencias.");
  }
  if (response.status === 400) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new IncidentRequestError("El servidor no pudo validar los datos. Revisa el formulario e inténtalo de nuevo.");
    }
    const fields = invalidFields(body);
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
  return readJson<IncidentSummary>(
    response,
    "El servidor devolvió un resumen no válido. Inténtalo de nuevo.",
  );
}

export interface IncidentFilters {
  status?: IncidentStatus;
  origin?: IncidentOrigin;
  branch?: IncidentBranch;
}

export async function fetchIncidents(
  filters: IncidentFilters = {},
  signal?: AbortSignal,
): Promise<Incident[]> {
  const token = getToken();
  if (!token) endSession(token);

  const query = new URLSearchParams();
  for (const [field, value] of Object.entries(filters)) {
    if (value) query.set(field, value);
  }
  const suffix = query.size ? `?${query.toString()}` : "";

  let response: Response;
  try {
    response = await fetch(`/api/incidents${suffix}`, {
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
    throw new IncidentRequestError("No tienes permiso para ver las incidencias.");
  }
  if (!response.ok) {
    throw new IncidentRequestError(
      "No pudimos cargar las incidencias. Inténtalo de nuevo en unos minutos.",
    );
  }
  return readJson<Incident[]>(
    response,
    "El servidor devolvió una lista de incidencias no válida. Inténtalo de nuevo.",
  );
}

export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
): Promise<Incident> {
  const token = getToken();
  if (!token) endSession(token);

  let response: Response;
  try {
    response = await fetch(`/api/incidents/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
      cache: "no-store",
    });
  } catch {
    throw new IncidentRequestError(
      "No hay conexión con el servidor. El estado anterior se ha restaurado.",
    );
  }

  if (response.status === 401) endSession(token);
  if (response.status === 403) {
    throw new IncidentRequestError(
      "No tienes permiso para actualizar incidencias. El estado anterior se ha restaurado.",
    );
  }
  if (response.status === 404) {
    throw new IncidentRequestError(
      "La incidencia ya no existe. Actualiza el listado e inténtalo de nuevo.",
    );
  }
  if (response.status === 409) {
    throw new IncidentRequestError(
      "Ese cambio de estado ya no está permitido. El estado anterior se ha restaurado.",
    );
  }
  if (!response.ok) {
    throw new IncidentRequestError(
      "No pudimos actualizar la incidencia. El estado anterior se ha restaurado.",
    );
  }
  return readJson<Incident>(
    response,
    "El servidor devolvió una respuesta no válida al actualizar la incidencia.",
  );
}
