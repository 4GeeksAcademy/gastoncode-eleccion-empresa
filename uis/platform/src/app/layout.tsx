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
          Preload de imagen crítica (hero) con fetchpriority="high" para priorizar
          la descarga temprana del Largest Contentful Paint (LCP). Las imágenes
          se sirven desde el mismo origen (self-hosted) para eliminar latencia
          de conexión externa (DNS, TCP, SSL). imageSrcSet/imageSizes permiten
          que el navegador descargue la resolución adecuada según el viewport.

          El logo /logo-brasaland.svg no se preloadea manualmente porque
          Next.js lo promueve automáticamente al encontrar fetchPriority="high"
          en el componente BrandLogo.
        */}
        <link
          rel="preload"
          href="/images/hero-800w.webp"
          as="image"
          fetchPriority="high"
          imageSrcSet="
            /images/hero-400w.webp 400w,
            /images/hero-800w.webp 800w,
            /images/hero-1200w.webp 1200w
          "
          imageSizes="(max-width: 768px) 100vw, 50vw"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
