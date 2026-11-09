import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/application-form";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Formulario de Interés | Brasaland",
  description: "Formulario de contacto para clientes interesados en conocer ofertas y novedades de Brasaland.",
  robots: { index: true, follow: true },
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Brasaland",
  description: "Cadena de restaurantes de cocina a la brasa en Colombia y Estados Unidos.",
  url: "https://brasaland.example",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "contacto@brasaland.com",
    availableLanguage: ["es", "en"],
  },
};

export default function ApplicationPage() {
  return (
    <>
      <a
        href="#formulario"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-amber-300 focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-stone-950"
      >
        Saltar al formulario
      </a>
      <main id="contenido-principal" className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <BrandLogo className="mb-6 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100" />
        <Link
          href="/"
          className="mb-8 inline-block rounded-full border border-stone-500 px-4 py-2 text-sm font-semibold transition hover:border-amber-300 hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
        >
          Volver al inicio
        </Link>

        <section id="formulario" className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5 sm:p-6 md:p-8">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Formulario de interesados</h1>
          <p className="mt-3 text-sm text-stone-300">
            Déjanos tus datos y te contactaremos con información sobre ofertas, novedades y oportunidades.
          </p>
          <ApplicationForm />
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }} />
    </>
  );
}
