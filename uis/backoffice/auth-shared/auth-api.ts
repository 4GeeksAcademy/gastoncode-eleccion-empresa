export type Role = "admin" | "manager" | "user";

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  profile: Profile | null;
}

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
}

export interface UserUpdate {
  email?: string;
  password?: string;
  role?: Role;
  is_active?: boolean;
}

export interface ProfileUpdate {
  name?: string;
  phone?: string;
  address?: string;
}

export const TOKEN_KEY = "brasaland.backoffice.token";
export const SESSION_INVALIDATED_EVENT = "brasaland.backoffice.session-invalidated";

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Sesion expirada o no valida.") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

function publicStatusMessage(status: number): string {
  if (status === 400 || status === 422) return "Revisa los datos ingresados e intenta nuevamente.";
  if (status === 401) return "Sesion expirada o no valida.";
  if (status === 403) return "No tienes permiso para realizar esta accion.";
  if (status === 404) return "No se encontro el recurso solicitado.";
  if (status === 409) return "La solicitud entra en conflicto con los datos existentes.";
  if (status >= 500) return "El servicio no pudo completar la solicitud. Intenta mas tarde.";
  return "No se pudo completar la solicitud.";
}

/** Devuelve mensajes preparados para mostrar en la UI, sin propagar detalles internos. */
export function publicErrorMessage(error: unknown, fallback = "No se pudo completar la solicitud."): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "No se pudo conectar con el servicio. Intenta nuevamente.";
    if (error.status === 502) return "El servicio devolvio una respuesta no valida.";
    return publicStatusMessage(error.status);
  }
  if (error instanceof TypeError) return "No se pudo conectar con el servicio. Intenta nuevamente.";
  return fallback;
}

async function request<Result>(
  path: string,
  options: RequestInit = {},
  protectedRequest = true,
): Promise<Result> {
  const token = protectedRequest ? getToken() : null;
  if (protectedRequest && !token) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
    }
    throw new UnauthorizedError();
  }

  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servicio. Intenta nuevamente.");
  }

  if (!response.ok) {
    const message = publicStatusMessage(response.status);
    if (response.status === 401) {
      if (protectedRequest && token === getToken()) {
        clearToken();
        window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
      }
      throw new UnauthorizedError(message);
    }
    throw new ApiError(response.status, message);
  }

  try {
    return await response.json() as Result;
  } catch {
    throw new ApiError(502, "El servicio devolvio una respuesta no valida.");
  }
}

function jsonBody(method: string, data: object): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export async function login(email: string, password: string): Promise<string> {
  const result = await request<{ access_token: string; token_type: string }>(
    "/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: email, password }),
    },
    false,
  );
  if (typeof result.access_token !== "string" || !result.access_token) {
    throw new Error("La API no devolvio un token valido.");
  }
  return result.access_token;
}

export function register(data: RegisterInput): Promise<{ user: PublicUser; profile: Profile }> {
  return request("/users", jsonBody("POST", data), false);
}

export function fetchMe(): Promise<AuthUser> {
  return request("/auth/me");
}

export function listUsers(): Promise<PublicUser[]> {
  return request("/users");
}

export function fetchUser(userId: string): Promise<PublicUser> {
  return request(`/users/${encodeURIComponent(userId)}`);
}

export function updateUser(userId: string, data: UserUpdate): Promise<PublicUser> {
  return request(`/users/${encodeURIComponent(userId)}`, jsonBody("PUT", data));
}

export function deleteUser(userId: string): Promise<{ message: string }> {
  return request(`/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

export function fetchProfile(): Promise<Profile> {
  return request("/profiles/me");
}

export function updateProfile(data: ProfileUpdate): Promise<Profile> {
  return request("/profiles/me", jsonBody("PUT", data));
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return request("/auth/forgot-password", jsonBody("POST", { email }), false);
}

export function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return request("/auth/reset-password", jsonBody("POST", { token, password }), false);
}

export function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return request("/auth/change-password", jsonBody("POST", { current_password: currentPassword, new_password: newPassword }), true);
}