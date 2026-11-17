import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import styles from "./backoffice.module.css";
import "./backoffice-entry.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brasaland — Backoffice",
  description: "Puerta de entrada a las herramientas internas de Brasaland Digital.",
  robots: { index: false, follow: false },
};

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="http://127.0.0.1:8005" />
      <div data-platform-area="backoffice" className={`${styles.backoffice} ${geistSans.variable} flex min-h-screen flex-col bg-stone-950 text-stone-200 antialiased`}>
        <AuthProvider homePath="/backoffice" internalNavigation>{children}</AuthProvider>
      </div>
    </>
  );
}
