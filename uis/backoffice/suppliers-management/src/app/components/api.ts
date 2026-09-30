import { authHeaders, clearToken, UnauthorizedError } from './auth-api';

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

async function apiFetch(
  path: string,
  init: RequestInit = {},
  errorMessage = 'Request failed'
): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), ...authHeaders() },
  });

  if (res.status === 401) {
    clearToken();
    throw new UnauthorizedError();
  }
  if (res.status === 403) {
    throw new Error('No tenés permisos para realizar esta acción.');
  }
  if (!res.ok) throw new Error(errorMessage);

  return res;
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await apiFetch(
    '/suppliers',
    {},
    'Failed to fetch suppliers'
  );
  return res.json();
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
    'Search failed'
  );
  return res.json();
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
    'Create failed'
  );
  return res.json();
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
    'Rate update failed'
  );
  return res.json();
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
    'Status update failed'
  );
  return res.json();
}

export async function deleteSupplier(id: number): Promise<void> {
  await apiFetch(`/suppliers/${id}`, { method: 'DELETE' }, 'Delete failed');
}