import type { Metadata } from "next";
import "./globals.css";

const restaurantStructuredData = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Brasaland",
  description: "Cadena de restaurantes de cocina a la brasa con presencia en Colombia y Estados Unidos.",
  foundingDate: "2008",
  numberOfEmployees: "115",
  areaServed: ["CO", "US"],
  address: [
    { "@type": "PostalAddress", addressLocality: "Medellín", addressCountry: "CO" },
    { "@type": "PostalAddress", addressLocality: "Miami", addressRegion: "FL", addressCountry: "US" },
  ],
  url: "https://brasaland.example",
};

export const metadata: Metadata = {
  title: "Brasaland | Cocina a la Brasa con Innovación Digital",
  description:
    "Brasaland es una cadena de 14 restaurantes en Colombia y Florida. Descubre una experiencia de cocina a la brasa consistente, rápida y cálida en dos mercados.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Brasaland",
    description: "Sabor consistente, servicio cálido y operaciones modernas para una experiencia gastronómica superior.",
    type: "website",
    images: ["https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=1400&q=80"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-stone-950 text-stone-100 antialiased">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantStructuredData) }}
        />
      </body>
    </html>
  );
}
