export type Role = 'admin' | 'manager' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  profile: {
    id: string;
    user_id: string;
    name: string | null;
    phone: string | null;
    address: string | null;
  } | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
}

const AUTH_BASE = '/api/auth';
const USERS_BASE = '/api/users';

const TOKEN_KEY = 'brasaland.suppliers.token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class UnauthorizedError extends Error {
  constructor(message = 'Sesión expirada o no válida.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

async function detailOf(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
  } catch {
    // La respuesta no era JSON.
  }
  return fallback;
}

/** `api-auth` expone /auth/login como OAuth2 password flow: el email viaja en `username`. */
export async function login(
  email: string,
  password: string
): Promise<string> {
  const body = new URLSearchParams();
  body.set('username', email);
  body.set('password', password);

  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(await detailOf(res, 'Email o contraseña incorrectos.'));
  }

  const data = await res.json();
  return data.access_token as string;
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await fetch(`${AUTH_BASE}/me`, { headers: authHeaders() });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error('No se pudo obtener el usuario actual.');
  return res.json();
}

export async function register(data: RegisterInput): Promise<void> {
  const res = await fetch(USERS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(await detailOf(res, 'No se pudo crear la cuenta.'));
  }
}
