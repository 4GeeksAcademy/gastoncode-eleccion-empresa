import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import Link from "next/link";
import { AuthProvider } from "./components/auth-context";
import SessionMenu from "./components/session-menu";
import "./globals.css";

const ui = Hanken_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brasaland · Gestor de incidencias",
  description: "Registro centralizado de incidencias de los locales de Brasaland.",
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
          <nav className="navbar">
            <div className="navContent">
              <Link href="/" className="logo">
                BRASALAND
              </Link>
              <div className="navLinks">
                <Link href="/">Registrar incidencia</Link>
                <SessionMenu />
              </div>
            </div>
          </nav>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
