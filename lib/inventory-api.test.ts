import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { setToken } from "../uis/backoffice/auth-shared/auth-api";
import { createInboundOrder, listOrders, listProducts } from "./inventory";

const jsonResponse = (value: unknown): Response =>
	({ ok: true, status: 200, json: async () => value }) as Response;

describe("inventory API requests", () => {
	beforeEach(() => {
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: { localStorage: { getItem: () => "test-token", setItem: jest.fn(), removeItem: jest.fn() }, dispatchEvent: jest.fn() },
		});
		setToken("test-token");
		globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(jsonResponse([]));
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("sends bearer authorization on protected product and author requests", async () => {
		jest.mocked(globalThis.fetch)
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([{ user_uuid: "user-1" }]))
			.mockResolvedValueOnce(jsonResponse([]));
		await listProducts();
		await listOrders();

		const calls = jest.mocked(globalThis.fetch).mock.calls;
		expect(calls).toHaveLength(3);
		for (const [, init] of calls) {
			expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
		}
	});

	it("sends the inbound order with the required JSON payload and bearer token", async () => {
		const order = { id: 3 };
		jest.mocked(globalThis.fetch).mockResolvedValueOnce(jsonResponse(order));
		const payload = { ingredient_id: 12, location_id: 4, quantity: 2.5, supplier_name: "Proveedor" };

		await createInboundOrder(payload);

		const [url, init] = jest.mocked(globalThis.fetch).mock.calls[0];
		expect(url).toBe("/api/inventory/orders/inbound");
		expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
		expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
		expect(JSON.parse(String(init?.body))).toEqual(payload);
	});

	it("preserves every inbound and outbound order field from the history response", async () => {
		const orders = [
			{ id: 1, type: "inbound", ingredient_id: 12, ingredient_name: "Carne", quantity: 2.5, supplier_name: "Proveedor", reason: null, location_id: 4, created_at: "2026-10-31T12:00:00Z", user_uuid: "author-1" },
			{ id: 2, type: "outbound", ingredient_id: 13, ingredient_name: "Tomate", quantity: 1, supplier_name: null, reason: "waste", location_id: 2, created_at: "2026-10-31T13:00:00Z", user_uuid: "author-2" },
		];
		jest.mocked(globalThis.fetch)
			.mockResolvedValueOnce(jsonResponse(orders))
			.mockResolvedValueOnce(jsonResponse([
				{ id: "author-1", display_name: "Ana" },
				{ id: "author-2", display_name: "Luis" },
			]));

		const result = await listOrders();

		expect(result).toEqual([
			{ ...orders[0], user_name: "Ana" },
			{ ...orders[1], user_name: "Luis" },
		]);
	});
});
