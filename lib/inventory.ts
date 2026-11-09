import {
	clearToken,
	getToken,
	SESSION_INVALIDATED_EVENT,
} from "@brasaland/auth-shared/auth-api";
export { getStockStatus, LOW_STOCK_THRESHOLD } from "./stock-status";
export type { StockStatus } from "./stock-status";

export type ProductCategory =
	| "meat"
	| "produce"
	| "sauce"
	| "beverage"
	| "packaging"
	| "cleaning";
export type ProductCountry = "CO" | "US";
export type OrderType = "inbound" | "outbound";
export type ExitReason = "consumption" | "waste";

export interface InventoryProduct {
	id: number;
	name: string;
	sku: string;
	unit: string;
	category: ProductCategory;
	country: ProductCountry;
	current_stock: number;
}

export interface InventoryOrder {
	id: number;
	type: OrderType;
	ingredient_id: number;
	ingredient_name: string;
	quantity: number;
	supplier_name: string | null;
	reason: ExitReason | null;
	location_id: number;
	created_at: string;
	user_uuid: string;
	user_name: string;
}

export interface CreateInboundOrder {
	ingredient_id: number;
	quantity: number;
	supplier_name: string;
	location_id: number;
}

export interface CreateOutboundOrder {
	ingredient_id: number;
	quantity: number;
	reason: ExitReason;
	location_id: number;
}

interface OrderAuthor {
	id: string;
	display_name: string;
}

export class InventoryApiError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "InventoryApiError";
	}
}

function messageForStatus(status: number): string {
	if (status === 400 || status === 422) {
		return "Revisa los datos ingresados. Para una salida, confirma que la cantidad no supere el stock disponible.";
	}
	if (status === 401) return "Tu sesión venció o no es válida. Inicia sesión nuevamente.";
	if (status === 403) return "No tienes permiso para realizar esta operación.";
	if (status === 404) return "No se encontró el producto solicitado.";
	if (status === 409) return "El producto entra en conflicto con un registro existente.";
	if (status >= 500) return "El servicio de inventario no pudo completar la solicitud. Intenta más tarde.";
	return "No se pudo completar la solicitud de inventario.";
}

function invalidateSession(token: string | null) {
	if (typeof window === "undefined") return;
	if (!token) {
		window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
		return;
	}
	// A late 401 from an older request must not invalidate a newer login.
	if (token === getToken()) {
		clearToken();
		window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
	}
}

async function request<Result>(path: string, options: RequestInit = {}): Promise<Result> {
	const token = getToken();
	if (!token) {
		invalidateSession(null);
		throw new InventoryApiError(401, messageForStatus(401));
	}

	const headers = new Headers(options.headers);
	headers.set("Authorization", `Bearer ${token}`);
	if (options.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	let response: Response;
	try {
		response = await fetch(`/api${path}`, {
			...options,
			headers,
			cache: "no-store",
		});
	} catch {
		throw new InventoryApiError(0, "No se pudo conectar con el servicio de inventario. Comprueba la conexión e inténtalo de nuevo.");
	}

	if (!response.ok) {
		if (response.status === 401) invalidateSession(token);
		throw new InventoryApiError(response.status, messageForStatus(response.status));
	}

	try {
		return await response.json() as Result;
	} catch {
		throw new InventoryApiError(502, "El servicio devolvió una respuesta no válida.");
	}
}

function jsonBody(data: object): RequestInit {
	return { method: "POST", body: JSON.stringify(data) };
}

export function listProducts(): Promise<InventoryProduct[]> {
	return request("/inventory/products");
}

export function createInboundOrder(data: CreateInboundOrder): Promise<InventoryOrder> {
	return request("/inventory/orders/inbound", jsonBody(data));
}

export function createOutboundOrder(data: CreateOutboundOrder): Promise<InventoryOrder> {
	return request("/inventory/orders/outbound", jsonBody(data));
}

async function listOrderAuthors(ids: string[]): Promise<Map<string, string>> {
	if (ids.length === 0) return new Map();
	const authors = await request<OrderAuthor[]>("/users/display-names", {
		method: "POST",
		body: JSON.stringify({ ids }),
	});
	return new Map(authors.map((author) => [author.id, author.display_name]));
}

export async function listOrders(): Promise<InventoryOrder[]> {
	const orders = await request<Omit<InventoryOrder, "user_name">[]>("/inventory/orders");
	const authorIds = [...new Set(orders.map((order) => order.user_uuid))];
	const authors = await listOrderAuthors(authorIds);
	return orders.map((order) => ({
		...order,
		user_name: authors.get(order.user_uuid) ?? "Usuario sin nombre",
	}));
}
