import {MenuItem, Price, MenuCategory, MenuItemStatus, SaleTransaction, PaymentMethod, Location, LocationStatus, Country, WasteReason, WasteRecord} from "../types/models";

// Filtrado de ventas por ubicación

export function filterSalesByLocation(sales: SaleTransaction[], locationId: string): SaleTransaction[] {
    const ventas = sales.filter(sale => sale.locationId === locationId);
    return ventas; 
}

// Filtrado de ventas por fechas

export function filterSalesByDateRange(sales: SaleTransaction[], startDate: Date, endDate: Date): SaleTransaction[] {
    const ventas = sales.filter(sale => sale.timestamp >= startDate && sale.timestamp <= endDate);
    return ventas; 
}

// Filtrado de menú por categoría

export function filterMenuItemsByCategory(items: MenuItem[], category: MenuCategory): MenuItem[] {
    const itemsFiltrados = items.filter(item => item.category === category);
    return itemsFiltrados; 
}

// Filtrado de locales activos

export function filterActiveLocations(locations: Location[]): Location[] {
    const locacionesActivas = locations.filter(location => location.status === "Active");
    return locacionesActivas; 
}

// Ordenamiento de locales por capacidad de asientos

export function sortLocationsByCapacity(locations: Location[], order: "asc" | "desc"): Location[] {
    const sortedLocations = [...locations].sort((a, b) => {
        if (order === "asc") {
            return a.seatingCapacity - b.seatingCapacity;
        } else {
            return b.seatingCapacity - a.seatingCapacity;
        }
    });
    return sortedLocations; 
}

// Ordenamiento de ítems del menú por precio

export function sortMenuItemsByPrice(items: MenuItem[], currency: "USD" | "COP", order: "asc" | "desc"): MenuItem[] {
    const sortedItems = [...items].sort((a, b) => {
        const priceA = a.basePrice[currency];
        const priceB = b.basePrice[currency];
        if (order === "asc") {
            return priceA - priceB;
        } else {
            return priceB - priceA;
        }
    });
    return sortedItems; 
}