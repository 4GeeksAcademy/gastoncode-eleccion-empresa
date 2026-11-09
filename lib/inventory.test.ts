import { describe, expect, it } from "@jest/globals";
import { getStockStatus } from "./stock-status";

describe("getStockStatus", () => {
	it.each([
		[-1, "empty"],
		[0, "empty"],
		[1, "low"],
		[50, "low"],
		[51, "ok"],
	])("returns the expected status for stock %i", (stock, expected) => {
		expect(getStockStatus(stock)).toBe(expected);
	});
});