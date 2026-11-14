import { restaurantStructuredData, websiteMetadata } from "../lib/site-metadata";
import "./globals.css";

export const metadata = websiteMetadata;

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
