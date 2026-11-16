import { restaurantStructuredData, websiteMetadata } from "@/website/lib/site-metadata";
import styles from "./public.module.css";

export const metadata = websiteMetadata;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-platform-area="public" className={`${styles.website} min-h-screen bg-stone-950 text-stone-100 antialiased`}>
      {children}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantStructuredData) }} />
    </div>
  );
}
