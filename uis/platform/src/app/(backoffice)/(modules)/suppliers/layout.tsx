import { ModuleFrame } from "@/components/module-frame";

export const metadata = { title: "Brasaland · Proveedores" };

export default function SuppliersLayout({ children }: { children: React.ReactNode }) {
  return <ModuleFrame name="suppliers">{children}</ModuleFrame>;
}
