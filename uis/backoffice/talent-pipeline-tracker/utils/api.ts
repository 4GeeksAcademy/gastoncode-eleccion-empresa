import {
  ApiError,
  SESSION_INVALIDATED_EVENT,
  UnauthorizedError,
  clearToken,
  getToken,
} from "../../auth-shared/auth-api";

export { publicErrorMessage } from "../../auth-shared/auth-api";

function endSession(token: string | null): never {
  if (token === getToken()) {
    clearToken();
    window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
  }
  throw new UnauthorizedError();
}

export async function trackerFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token) endSession(token);
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`/api/talent${path}`, { ...options, headers, cache: "no-store" });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(0, "No se pudo conectar con talento.");
  }
  if (response.status === 401) endSession(token);
  if (!response.ok) throw new ApiError(response.status, "No se pudo completar la solicitud.");
  return response;
}
