import {MenuItem, Price, MenuCategory, MenuItemStatus, SaleTransaction, PaymentMethod, Location, LocationStatus, Country, WasteReason, WasteRecord} from "../types/models";


// Cálculos financieros

// Calcula el ingreso total para una fecha específica en la moneda especificada

export function calculateDailyRevenue(sales: SaleTransaction[], date: Date, currency: "USD" | "COP"): number {
    const dailySales = sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate.getFullYear() === date.getFullYear() &&
               saleDate.getMonth() === date.getMonth() &&
               saleDate.getDate() === date.getDate();
    });

    const totalRevenue = dailySales.reduce((total, sale) => {
        const saleRevenue = sale.totalPrice[currency];
        return total + saleRevenue;
    }, 0);

    return parseFloat(totalRevenue.toFixed(2));
}

