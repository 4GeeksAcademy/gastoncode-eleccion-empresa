import {MenuItem, SaleTransaction, PaymentMethod, Location, Country, WasteReason, WasteRecord, CountryMetrics} from "../types/models";


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

// Ranking de locales por score de perfomance

export function rankLocationsByPerformance(locations: Location[], sales: SaleTransaction[], wasteRecords: WasteRecord[], menuItems: MenuItem[]): Array<{location: Location, score: number}> {
    const locationScores = locations.map(location => {
        const score = scoreLocationPerformance(location, sales, wasteRecords, menuItems);
        return { location, score };
    });

    locationScores.sort((a, b) => b.score - a.score);
    return locationScores;
}

// Conteo de ventas por método de pago

export function countSalesByPaymentMethod(sales: SaleTransaction[]): Record<PaymentMethod, number> {
    const paymentMethodCounts: Record<PaymentMethod, number> = {
        "Cash": 0,
        "Credit card": 0,
        "Debit card": 0,
        "Digital wallet": 0
    };

    sales.forEach(sale => {
        paymentMethodCounts[sale.paymentMethod]++;
    });

    return paymentMethodCounts;
}

// Cálculo de valor promedio de venta por método de pago

export function calculateAverageTicket(sales: SaleTransaction[], currency: "USD" | "COP"): number {
    const totalRevenue = sales.reduce((total, sale) => total + sale.totalPrice[currency], 0);
    const totalTransactions = sales.length;

    if (totalTransactions === 0) {
        return 0;
    }

    const averageTicket = totalRevenue / totalTransactions;
    return parseFloat(averageTicket.toFixed(2));
}

// Identificación de ítems de menú con mayor cantidad de ventas

export function findTopSellingItems(sales: SaleTransaction[], menuItems: MenuItem[], topN: number): Array<{item: MenuItem, totalSold: number}> {
    const itemSalesMap: Record<string, number> = {};

    sales.forEach(sale => {
        if (!itemSalesMap[sale.itemId]) {
            itemSalesMap[sale.itemId] = 0;
        }
        itemSalesMap[sale.itemId] += sale.quantity;
    });

    const topSellingItems = Object.entries(itemSalesMap)
        .map(([itemId, totalSold]) => {
            const item = menuItems.find(menuItem => menuItem.id === itemId);
            return { item: item!, totalSold };
        })
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, topN);

    return topSellingItems;
}

// Agrupa desperdicios en función de la razón 

export function groupWasteByReason(wasteRecords: WasteRecord[]): Record<WasteReason, WasteRecord[]> {
    const wasteByReason: Record<WasteReason, WasteRecord[]> = {
        "Expired": [],
        "Cooking error": [],
        "Customer return": [],
        "Damage": [],
        "Other": []
    };

    wasteRecords.forEach(record => {
        wasteByReason[record.reason].push(record);
    });

    return wasteByReason;
}

// Retorna métricas comparativas para cada país

export function calculateCountryComparison(sales: SaleTransaction[], locations: Location[]): {Colombia: CountryMetrics, USA: CountryMetrics} {
    const countryMetrics: Record<Country, CountryMetrics> = {
        "Colombia": {
            totalLocations: 0,
            totalRevenue: { USD: 0, COP: 0 },
            averageRevenuePerLocation: { USD: 0, COP: 0 },
            totalSales: 0
        },
        "USA": {
            totalLocations: 0,
            totalRevenue: { USD: 0, COP: 0 },
            averageRevenuePerLocation: { USD: 0, COP: 0 },
            totalSales: 0
        }
    };

    locations.forEach(location => {
        countryMetrics[location.country].totalLocations++;
    });

    sales.forEach(sale => {
        const location = locations.find(loc => loc.id === sale.locationId);
        if (location) {
            countryMetrics[location.country].totalRevenue.USD += sale.totalPrice.USD;
            countryMetrics[location.country].totalRevenue.COP += sale.totalPrice.COP;
            countryMetrics[location.country].totalSales++;
        }
    });

    countryMetrics["Colombia"].averageRevenuePerLocation.USD = countryMetrics["Colombia"].totalLocations > 0 ? countryMetrics["Colombia"].totalRevenue.USD / countryMetrics["Colombia"].totalLocations : 0;
    countryMetrics["Colombia"].averageRevenuePerLocation.COP = countryMetrics["Colombia"].totalLocations > 0 ? countryMetrics["Colombia"].totalRevenue.COP / countryMetrics["Colombia"].totalLocations : 0;
    countryMetrics["USA"].averageRevenuePerLocation.USD = countryMetrics["USA"].totalLocations > 0 ? countryMetrics["USA"].totalRevenue.USD / countryMetrics["USA"].totalLocations : 0;
    countryMetrics["USA"].averageRevenuePerLocation.COP = countryMetrics["USA"].totalLocations > 0 ? countryMetrics["USA"].totalRevenue.COP / countryMetrics["USA"].totalLocations : 0;

    return {
        Colombia: countryMetrics["Colombia"],
        USA: countryMetrics["USA"]
    };
}

