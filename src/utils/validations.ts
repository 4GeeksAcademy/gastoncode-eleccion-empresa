import {MenuItem, Price, MenuCategory, MenuItemStatus, SaleTransaction, PaymentMethod, Location, LocationStatus, Country, WasteReason, WasteRecord} from "../types/models";

// Validación de un ítem de menú

export function validateMenuItem(item: MenuItem): { valid: boolean, errors: string[] } {
    const validation: { valid: boolean, errors: string[] } = { valid: true, errors: [] };
    
    if (!item.id || typeof item.id !== "string") {
        validation.valid = false;
        validation.errors.push("ID is required and must be a string.");
    }
    if (!item.name || typeof item.name !== "string") {
        validation.valid = false;
        validation.errors.push("Name is required and must be a string.");
    }
    if (!item.category || !["Meat", "Side", "Beverage", "Dessert", "Combo"].includes(item.category)) {
        validation.valid = false;
        validation.errors.push("Category is required and must be one of: Meat, Side, Beverage, Dessert, Combo.");
    }
    if (!item.basePrice || typeof item.basePrice.USD !== "number" || typeof item.basePrice.COP !== "number") {
        validation.valid = false;
        validation.errors.push("Base price is required and must include USD and COP values.");
    }
    if (!item.ingredientCost || typeof item.ingredientCost.USD !== "number" || typeof item.ingredientCost.COP !== "number") {
        validation.valid = false;
        validation.errors.push("Ingredient cost is required and must include USD and COP values.");
    }
    if (typeof item.prepTimeMinutes !== "number" || item.prepTimeMinutes < 0) {
        validation.valid = false;
        validation.errors.push("Preparation time must be a non-negative number.");
    }
    if (typeof item.isAvailableInColombia !== "boolean") {
        validation.valid = false;
        validation.errors.push("isAvailableInColombia must be a boolean.");
    }
    if (typeof item.isAvailableInUSA !== "boolean") {
        validation.valid = false;
        validation.errors.push("isAvailableInUSA must be a boolean.");
    }
    if (!Array.isArray(item.allergens)) {
        validation.valid = false;
        validation.errors.push("Allergens must be an array of strings.");
    }
    if (!item.status || !["Active", "Seasonal", "Discontinued"].includes(item.status)) {
        validation.valid = false;
        validation.errors.push("Status is required and must be one of: Active, Seasonal, Discontinued.");
    }

    return validation;
}

// Validación de una transacción de venta

export function validateSaleTransaction(sale: SaleTransaction): { valid: boolean, errors: string[] } {
    const validation: { valid: boolean, errors: string[] } = { valid: true, errors: [] };
    
    if (!sale.id || typeof sale.id !== "string") {
        validation.valid = false;
        validation.errors.push("ID is required and must be a string.");
    }
    if (!sale.locationId || typeof sale.locationId !== "string") {
        validation.valid = false;
        validation.errors.push("Location ID is required and must be a string.");
    }
    if (!sale.itemId || typeof sale.itemId !== "string") {
        validation.valid = false;
        validation.errors.push("Item ID is required and must be a string.");
    }
    if (typeof sale.quantity !== "number" || sale.quantity <= 0) {
        validation.valid = false;
        validation.errors.push("Quantity must be a positive number.");
    }
    if (!sale.totalPrice || typeof sale.totalPrice.USD !== "number" || typeof sale.totalPrice.COP !== "number") {
        validation.valid = false;
        validation.errors.push("Total price is required and must include USD and COP values.");
    }
    if (!sale.paymentMethod || !["Cash", "Credit card", "Debit card", "Digital wallet"].includes(sale.paymentMethod)) {
        validation.valid = false;
        validation.errors.push("Payment method is required and must be one of: Cash, Credit card, Debit card, Digital wallet.");
    }
    if (!(sale.timestamp instanceof Date) || isNaN(sale.timestamp.getTime())) {
        validation.valid = false;
        validation.errors.push("Timestamp is required and must be a valid date.");
    }
    if (!sale.waiterName || typeof sale.waiterName !== "string") {
        validation.valid = false;
        validation.errors.push("Waiter name is required and must be a string.");
    }

    return validation;
}

// Validación de una locación

export function validateLocation(location: Location): { valid: boolean, errors: string[] } {
    const validation: { valid: boolean, errors: string[] } = { valid: true, errors: [] };
    
    if (!location.id || typeof location.id !== "string") {
        validation.valid = false;
        validation.errors.push("ID is required and must be a string.");
    }
    if (!location.name || typeof location.name !== "string") {
        validation.valid = false;
        validation.errors.push("Name is required and must be a string.");
    }
    if (!location.city || typeof location.city !== "string") {
        validation.valid = false;
        validation.errors.push("City is required and must be a string.");
    }
    if (!location.country || !["Colombia", "USA"].includes(location.country)) {
        validation.valid = false;
        validation.errors.push("Country is required and must be either Colombia or USA.");
    }
    if (typeof location.openingYear !== "number" || location.openingYear < 1900 || location.openingYear > new Date().getFullYear()) {
        validation.valid = false;
        validation.errors.push("Opening year must be a valid year.");
    }
    if (typeof location.seatingCapacity !== "number" || location.seatingCapacity < 0) {
        validation.valid = false;
        validation.errors.push("Seating capacity must be a non-negative number.");
    }
    if (typeof location.staffCount !== "number" || location.staffCount < 0) {
        validation.valid = false;
        validation.errors.push("Staff count must be a non-negative number.");
    }
    if (!location.monthlyRentCost || typeof location.monthlyRentCost.USD !== "number" || typeof location.monthlyRentCost.COP !== "number") {
        validation.valid = false;
        validation.errors.push("Monthly rent cost is required and must include USD and COP values.");
    }
    if (!location.averageMonthlyUtilities || typeof location.averageMonthlyUtilities.USD !== "number" || typeof location.averageMonthlyUtilities.COP !== "number") {
        validation.valid = false;
        validation.errors.push("Average monthly utilities cost is required and must include USD and COP values.");
    }
    if (!location.manager || typeof location.manager !== "string") {
        validation.valid = false;
        validation.errors.push("Manager name is required and must be a string.");
    }
    if (!location.status || !["Active", "Temporarily closed", "Under renovation"].includes(location.status)) {
        validation.valid = false;
        validation.errors.push("Status is required and must be one of: Active, Temporarily closed, Under renovation.");
    }

    return validation;
}

// Se puede verificar la ejecución de las funciones con los ejemplos de datos utilizando el comando npx tsx src/utils/validations.ts en la terminal. Esto permitirá ejecutar el archivo y ver los resultados de las funciones con los datos de ejemplo.