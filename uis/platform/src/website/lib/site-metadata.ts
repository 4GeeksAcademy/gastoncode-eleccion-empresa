import type { Metadata } from "next";

export const restaurantStructuredData = {
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

export const websiteMetadata: Metadata = {
  title: "Brasaland | Cocina a la Brasa con Innovación Digital",
  description:
    "Brasaland es una cadena de 14 restaurantes en Colombia y Florida. Descubre una experiencia de cocina a la brasa consistente, rápida y cálida en dos mercados.",
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Brasaland",
    description: "Sabor consistente, servicio cálido y operaciones modernas para una experiencia gastronómica superior.",
    type: "website",
    images: ["/images/og-800w.webp"],
  },
};
