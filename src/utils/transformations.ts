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

// Calcula el margen de ganancia para una locación

export function calculateLocationMargin(sales: SaleTransaction[], menuItems: MenuItem[], locationId: string, currency: "USD" | "COP"): number {
    const locationSales = sales.filter(sale => sale.locationId === locationId);

    let totalRevenue = 0;
    let totalCost = 0;

    locationSales.forEach(sale => {
        const item = menuItems.find(menuItem => menuItem.id === sale.itemId);
        if (item) {
            totalRevenue += sale.totalPrice[currency];
            totalCost += item.ingredientCost[currency] * sale.quantity;
        }
    });

    const margin = (totalRevenue - totalCost) / totalRevenue * 100;
    return parseFloat(margin.toFixed(2));
}

// Calcula el costo total de desperdicio para una locación

export function calculateWasteCost(wasteRecords: WasteRecord[], locationId: string, currency: "USD" | "COP"): number {
    const locationWaste = wasteRecords.filter(record => record.locationId === locationId);

    const totalWasteCost = locationWaste.reduce((total, record) => {
        return total + record.cost[currency];
    }, 0);

    return parseFloat(totalWasteCost.toFixed(2));
}

// Conversión de moneda USD a COP

export function convertCurrency(amount: number, fromCurrency: "USD" | "COP", toCurrency: "USD" | "COP"): number {
    const exchangeRate = 4000;

    if (fromCurrency === toCurrency) {
        return amount;
    } else if (fromCurrency === "USD" && toCurrency === "COP") {
        return parseFloat((amount * exchangeRate).toFixed(2));
    } else if (fromCurrency === "COP" && toCurrency === "USD") {
        return parseFloat((amount / exchangeRate).toFixed(2));
    } else {
        throw new Error("Moneda no soportada");
    }
}

// Scoring de perfomance de locación

export function scoreLocationPerformance(location: Location, sales: SaleTransaction[], wasteRecords: WasteRecord[], menuItems: MenuItem[]): number {
    const totalRevenue = sales.reduce((total, sale) => 
        total + sale.totalPrice.USD, 0);
    const workingDays = location.openingYear * 365;
    const averageDailyRevenue = totalRevenue / workingDays;
    const incomeScore = (averageDailyRevenue / 1000 * 40) <= 40 ? (averageDailyRevenue / 1000 * 40) : 40;

    const seatEficiency = totalRevenue / location.seatingCapacity;
    const seatScore = (seatEficiency / 100 * 30) <= 30 ? (seatEficiency / 100 * 30) : 30;

    const wasteCost = wasteRecords.reduce((total, record) => 
        total + record.cost.USD, 0);
    const wasteRatio = (wasteCost / totalRevenue) / 100;
    const wasteScore = (20 - (wasteRatio * 2)) > 0 ? (20 - (wasteRatio * 2)) : 0;

    const profitMargin = calculateLocationMargin(sales, menuItems, location.id, "USD");
    const marginScore = (profitMargin / 10) <= 10 ? (profitMargin / 10) : 10;
    return parseFloat((incomeScore + seatScore + wasteScore + marginScore).toFixed(2));
}

