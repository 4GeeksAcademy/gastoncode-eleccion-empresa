import { authHeaders, clearToken, getToken, SESSION_INVALIDATED_EVENT, UnauthorizedError } from './auth-api';

export interface Supplier {
  id: number;
  name: string;
  country: 'Colombia' | 'USA';
  categories: string[];
  rate_per_unit: number;
  currency: 'COP' | 'USD';
  status: 'active' | 'suspended';
  contact_email: string | null;
  notes: string | null;
  updated_at: string | null;
}

export interface CreateSupplierInput {
  name: string;
  country: 'Colombia' | 'USA';
  categories: string[];
  rate_per_unit: number;
  currency: 'COP' | 'USD';
  status: 'active' | 'suspended';
  contact_email?: string;
  notes?: string;
}

const BASE = '/api';

export class SupplierRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupplierRequestError';
  }
}

async function readJson<T>(res: Response, message: string): Promise<T> {
  try {
    return await res.json() as T;
  } catch {
    throw new SupplierRequestError(message);
  }
}

async function apiFetch(
  path: string,
  init: RequestInit = {},
  errorMessage = 'Request failed'
): Promise<Response> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), ...authHeaders() },
    });
  } catch {
    throw new SupplierRequestError(
      'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
    );
  }

  if (res.status === 401) {
    if (token === getToken()) {
      clearToken();
      window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
    }
    throw new UnauthorizedError();
  }
  if (res.status === 403) {
    throw new SupplierRequestError('No tienes permisos para realizar esta acción.');
  }
  if (!res.ok) throw new SupplierRequestError(errorMessage);

  return res;
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await apiFetch(
    '/suppliers',
    {},
    'No se pudo cargar la lista de proveedores. Inténtalo de nuevo.'
  );
  return readJson(
    res,
    'El servidor devolvió una lista de proveedores no válida. Inténtalo de nuevo.'
  );
}

export async function searchSuppliers(
  country?: string,
  categories?: string
): Promise<Supplier[]> {
  const params = new URLSearchParams();
  if (country) params.set('country', country);
  if (categories) params.set('categories', categories);
  const qs = params.toString();
  const res = await apiFetch(
    `/suppliers/search${qs ? '?' + qs : ''}`,
    {},
    'No se pudo completar la búsqueda. Inténtalo de nuevo.'
  );
  return readJson(
    res,
    'El servidor devolvió resultados no válidos. Inténtalo de nuevo.'
  );
}

export async function createSupplier(
  data: CreateSupplierInput
): Promise<Supplier> {
  const res = await apiFetch(
    '/suppliers',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    'No se pudo crear el proveedor. Revisa los datos e inténtalo de nuevo.'
  );
  return readJson(
    res,
    'El servidor devolvió una respuesta no válida al crear el proveedor.'
  );
}

export async function updateRate(
  id: number,
  rate_per_unit: number
): Promise<Supplier> {
  const res = await apiFetch(
    `/suppliers/${id}/rate`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate_per_unit }),
    },
    'No se pudo actualizar la tarifa. Inténtalo de nuevo.'
  );
  return readJson(
    res,
    'El servidor devolvió una respuesta no válida al actualizar la tarifa.'
  );
}

export async function updateStatus(
  id: number,
  status: 'active' | 'suspended'
): Promise<Supplier> {
  const res = await apiFetch(
    `/suppliers/${id}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
    'No se pudo cambiar el estado del proveedor. Inténtalo de nuevo.'
  );
  return readJson(
    res,
    'El servidor devolvió una respuesta no válida al cambiar el estado.'
  );
}

export async function deleteSupplier(id: number): Promise<void> {
  await apiFetch(
    `/suppliers/${id}`,
    { method: 'DELETE' },
    'No se pudo eliminar el proveedor. Inténtalo de nuevo.'
  );
}
