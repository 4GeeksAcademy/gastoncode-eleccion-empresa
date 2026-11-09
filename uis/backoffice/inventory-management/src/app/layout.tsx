import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { InventoryShell } from "./components/inventory-shell";
import "./globals.css";

const ui = Hanken_Grotesk({ variable: "--font-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brasaland · Gestión de inventario",
  description: "Existencias y movimientos de inventario por sede.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-theme="dark" className={ui.variable}>
      <body><InventoryShell>{children}</InventoryShell></body>
    </html>
  );
}
