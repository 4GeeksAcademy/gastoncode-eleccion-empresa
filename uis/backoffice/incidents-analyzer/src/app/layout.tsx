import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const ui = Hanken_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
});

const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Brasaland · Incidencias",
  description: "Analizador de incidencias de los locales de Brasaland.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark" className={ui.variable}>
      <body>
        <nav className="navbar">
          <div className="navContent">
            <Link href="/" className="logo">
              BRASALAND
            </Link>

            <div className="navLinks">
              <Link href="/">Inicio</Link>
              <Link href="/incidents">Incidencias</Link>
              <a href={DASHBOARD_URL} className="backLink">
                ← Backoffice
              </a>
            </div>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}
