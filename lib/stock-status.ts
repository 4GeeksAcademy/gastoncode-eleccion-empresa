export const LOW_STOCK_THRESHOLD = 50;
export type StockStatus = "empty" | "low" | "ok";

export function getStockStatus(stock: number): StockStatus {
	if (stock <= 0) return "empty";
	if (stock <= LOW_STOCK_THRESHOLD) return "low";
	return "ok";
}