import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brasaland Digital",
  description: "Website y herramientas internas de Brasaland.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <head>
        {/*
          El preload de la imagen hero (LCP) se define exclusivamente en
          app/(public)/layout.tsx para que solo afecte al website público.
          El backoffice no muestra imágenes, por lo que cargar 127 KB de
          imagen precargada en /backoffice es innecesario.
        */}
      </head>
      <body>{children}</body>
    </html>
  );
}
