import { Hanken_Grotesk, Libre_Caslon_Text } from "next/font/google";
import type { ReactNode } from "react";

const ui = Hanken_Grotesk({ variable: "--font-ui", subsets: ["latin"] });
const brand = Libre_Caslon_Text({ variable: "--font-talent-brand", subsets: ["latin"], weight: ["400", "700"] });

export function ModuleFrame({ name, children }: { name: "suppliers" | "analyzer" | "manager" | "inventory" | "talent"; children: ReactNode }) {
  const className = name === "suppliers" ? "flex min-h-screen flex-col" : `${ui.variable} ${name === "talent" ? brand.variable : ""}`;
  return <section data-platform-module={name} data-theme="dark" className={className}>{children}</section>;
}
