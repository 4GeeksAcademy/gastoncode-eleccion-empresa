import { restaurantStructuredData, websiteMetadata } from "@/website/lib/site-metadata";
import styles from "./public.module.css";

export const metadata = websiteMetadata;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-platform-area="public" className={`${styles.website} min-h-screen bg-stone-950 text-stone-100 antialiased`}>
      {children}
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantStructuredData) }} />
    </div>
  );
}
