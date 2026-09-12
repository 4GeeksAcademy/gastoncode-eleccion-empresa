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

export async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch(`${BASE}/suppliers`);
  if (!res.ok) throw new Error('Failed to fetch suppliers');
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
  const res = await fetch(`${BASE}/suppliers/search${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function createSupplier(
  data: CreateSupplierInput
): Promise<Supplier> {
  const res = await fetch(`${BASE}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Create failed');
  return res.json();
}

export async function updateRate(
  id: number,
  rate_per_unit: number
): Promise<Supplier> {
  const res = await fetch(`${BASE}/suppliers/${id}/rate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rate_per_unit }),
  });
  if (!res.ok) throw new Error('Rate update failed');
  return res.json();
}

export async function updateStatus(
  id: number,
  status: 'active' | 'suspended'
): Promise<Supplier> {
  const res = await fetch(`${BASE}/suppliers/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Status update failed');
  return res.json();
}

export async function deleteSupplier(id: number): Promise<void> {
  const res = await fetch(`${BASE}/suppliers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Delete failed');
}