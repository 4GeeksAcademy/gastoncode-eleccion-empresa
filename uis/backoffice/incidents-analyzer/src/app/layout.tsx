import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import Link from "next/link";
import { AuthProvider } from "../../../auth-shared/auth-context";
import { AuthGuard } from "../../../auth-shared/auth-guard";
import "./globals.css";

const ui = Hanken_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
});

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
        <AuthProvider>
          <AuthGuard>
        <nav className="navbar">
          <div className="navContent">
            <Link href="/" className="logo">
              BRASALAND
            </Link>

            <div className="navLinks">
              <Link href="/">Inicio</Link>
              <Link href="/incidents">Incidencias</Link>
              <a href="/" className="backLink">
                ← Backoffice
              </a>
            </div>
          </div>
        </nav>

        {children}
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
