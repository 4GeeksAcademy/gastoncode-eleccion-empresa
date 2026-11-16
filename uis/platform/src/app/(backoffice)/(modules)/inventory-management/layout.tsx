import { ModuleFrame } from "@/components/module-frame";
import { InventoryShell } from "@/modules/inventory/components/inventory-shell";

export const metadata = { title: "Brasaland · Gestión de inventario" };

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <ModuleFrame name="inventory"><InventoryShell embedded>{children}</InventoryShell></ModuleFrame>;
}
