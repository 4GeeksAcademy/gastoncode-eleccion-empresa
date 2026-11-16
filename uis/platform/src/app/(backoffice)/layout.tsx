import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import styles from "./backoffice.module.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brasaland — Backoffice",
  description: "Puerta de entrada a las herramientas internas de Brasaland Digital.",
  robots: { index: false, follow: false },
};

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-platform-area="backoffice" className={`${styles.backoffice} ${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-stone-950 text-stone-200 antialiased`}>
      <AuthProvider homePath="/backoffice" internalNavigation>{children}</AuthProvider>
    </div>
  );
}
