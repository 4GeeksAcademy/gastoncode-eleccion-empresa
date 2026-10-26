import {
  clearToken,
  getToken,
  SESSION_INVALIDATED_EVENT,
  UnauthorizedError,
} from "../../../auth-shared/auth-api";

type BreakdownValue = { count: number; percentage: number };

export interface AnalysisResult {
  analysis_id: string;
  company: string;
  source_file: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  invalid_breakdown: Record<string, number>;
  by_category: Record<string, BreakdownValue>;
  by_status: Record<string, BreakdownValue>;
  satisfaction: {
    closed_cases: number;
    scored_cases: number;
    average: number | null;
    scores: Record<string, number>;
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCounts(value: unknown): value is Record<string, number> {
  return isObject(value) && Object.values(value).every(isNumber);
}

function isBreakdown(value: unknown): value is Record<string, BreakdownValue> {
  return isObject(value) && Object.values(value).every(
    (entry) => isObject(entry) && isNumber(entry.count) && isNumber(entry.percentage),
  );
}

function isAnalysis(value: unknown): value is AnalysisResult {
  if (!isObject(value) || !isObject(value.satisfaction)) return false;
  const satisfaction = value.satisfaction;
  return typeof value.analysis_id === "string"
    && typeof value.company === "string"
    && typeof value.source_file === "string"
    && isNumber(value.total_records)
    && isNumber(value.valid_records)
    && isNumber(value.invalid_records)
    && isCounts(value.invalid_breakdown)
    && isBreakdown(value.by_category)
    && isBreakdown(value.by_status)
    && isNumber(satisfaction.closed_cases)
    && isNumber(satisfaction.scored_cases)
    && (satisfaction.average === null || isNumber(satisfaction.average))
    && isCounts(satisfaction.scores);
}

function invalidateSession(token: string | null): never {
  if (token === getToken()) {
    clearToken();
    window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
  }
  throw new UnauthorizedError("Tu sesión expiró. Inicia sesión nuevamente.");
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token) invalidateSession(token);
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`/api/incidents${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new Error("No hay conexión con el servidor. Inténtalo de nuevo.");
  }
  if (response.status === 401) invalidateSession(token);
  if (response.status === 403) throw new Error("No tienes permiso para analizar incidencias.");
  if (response.status === 503) {
    throw new Error("El servicio de identidad no está disponible. Inténtalo más tarde.");
  }
  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error("No se pudo completar el análisis. Inténtalo más tarde.");
    }
    const body: unknown = await readJson(response);
    if (isObject(body) && typeof body.detail === "string") throw new Error(body.detail);
    if (isObject(body) && Array.isArray(body.detail)) {
      const messages = body.detail.flatMap((entry: unknown) => {
        if (!isObject(entry)) return [];
        const message = entry.message ?? entry.msg;
        return typeof message === "string" ? [message] : [];
      });
      if (messages.length) throw new Error(messages.join("; "));
    }
    throw new Error("No se pudo completar la solicitud. Revisa el archivo e inténtalo de nuevo.");
  }
  return response;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("El servidor devolvió una respuesta no válida. Inténtalo de nuevo.");
  }
}

export async function analyzeFile(file: File): Promise<AnalysisResult> {
  const data = new FormData();
  data.append("file", file);
  const uploaded: unknown = await readJson(await request("/analyze", { method: "POST", body: data }));
  if (!isObject(uploaded) || typeof uploaded.analysis_id !== "string" || !uploaded.analysis_id) {
    throw new Error("El servidor no devolvió un identificador de análisis válido.");
  }
  const result = await readJson(await request(`/results/${encodeURIComponent(uploaded.analysis_id)}`));
  if (!isAnalysis(result) || result.analysis_id !== uploaded.analysis_id) {
    throw new Error("El servidor devolvió resultados de análisis no válidos.");
  }
  return result;
}

export async function exportAnalysis(analysisId: string): Promise<Blob> {
  const query = new URLSearchParams({ analysis_id: analysisId });
  const response = await request(`/results/export?${query}`);
  return response.blob();
}
