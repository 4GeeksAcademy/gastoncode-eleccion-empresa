import {MenuItem, Price, MenuCategory, MenuItemStatus, SaleTransaction, PaymentMethod, Location, LocationStatus, Country, WasteReason, WasteRecord} from "../types/models";

// Encontrar local por ID con búsqueda lineal

export function findLocationById(sortedLocations: Location[], id: string): Location | null {
  let left = 0;
  let right = sortedLocations.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midId = sortedLocations[mid].id;

    if (midId === id) {
      return sortedLocations[mid];
    } else if (midId < id) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return null; // Not found
}

// Encontrar ítem de menú por nombre con búsqueda lineal

export function findMenuItemByName(items: MenuItem[], name: string): MenuItem | null {
  for (const item of items) {
    if (item.name.toLowerCase() === name.toLowerCase()) {
      return item;
    }
  }
  return null; // Not found
}

// Búsqueda de local por capacidad de asientos con búsqueda binaria

export function binarySearchLocationByCapacity(sortedLocations: Location[], targetCapacity: number): number {
  let left = 0;
  let right = sortedLocations.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midCapacity = sortedLocations[mid].seatingCapacity;

    if (midCapacity === targetCapacity) {
      return mid;
    } else if (midCapacity < targetCapacity) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1; // Not found
}