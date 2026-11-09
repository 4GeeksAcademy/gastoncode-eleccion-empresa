import Link from "next/link";
import { BenefitCard } from "@/components/benefit-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const benefits = [
  {
    title: "Calidad consistente",
    description: "Procesos y estándares que garantizan la misma experiencia de sabor en Colombia y Estados Unidos.",
  },
  {
    title: "Servicio cercano",
    description: "Cultura de atención cálida y eficiente, pensada para fidelizar a cada cliente en todos los canales.",
  },
  {
    title: "Escala operativa",
    description: "14 locales, equipos especializados y capacidad de ejecución para sostener crecimiento ordenado.",
  },
  {
    title: "Innovación real",
    description: "Digitalizamos procesos y decisiones con datos para responder mejor a clientes y tendencias del mercado.",
  },
];

export default function HomePage() {
  return (
    <>
      <a
        href="#inicio"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-amber-300 focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-stone-950"
      >
        Saltar al contenido principal
      </a>
      <SiteHeader />
      <main id="inicio">
        <section id="nosotros" className="relative scroll-mt-24 overflow-hidden border-b border-stone-800 snap-center snap-always">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_46%),radial-gradient(circle_at_80%_20%,_rgba(248,113,113,0.15),_transparent_42%)]" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-6 py-10 md:min-h-[calc(92svh-5rem)] md:grid-cols-2 md:gap-10 md:py-14">
            <div>
              <p className="mb-4 inline-block rounded-full border border-amber-400/50 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                Desde 2008 en Medellín y Florida
              </p>
              <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
                Cocina a la brasa con <span className="text-amber-400">consistencia, calidez y velocidad</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-300 md:text-lg">
                Brasaland opera 14 restaurantes propios y combina experiencia operativa con evolución digital para ofrecer la misma calidad en cada visita, sin importar el país.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/application"
                  className="rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-stone-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
                >
                  Recibir novedades
                </Link>
                <a
                  href="#beneficios"
                  className="rounded-full border border-stone-500 px-6 py-3 text-sm font-semibold transition hover:border-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
                >
                  Ver por qué elegirnos
                </a>
              </div>
            </div>
            <figure className="rounded-2xl border border-amber-400/20 bg-stone-900/60 p-3 shadow-2xl shadow-amber-950/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1200&q=80"
                alt="Hamburguesa gourmet a la parrilla servida en mesa de madera"
                className="h-64 w-full rounded-xl object-cover md:h-[24rem]"
              />
              <figcaption className="px-2 pt-3 text-sm text-stone-400">
                Hamburguesas y cortes a la brasa con sabor consistente en cada restaurante.
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="beneficios" className="scroll-mt-24 snap-center snap-always" aria-labelledby="beneficios-titulo">
          <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-6xl flex-col justify-center px-6 py-12 md:py-16">
            <div className="mb-10">
              <h2 id="beneficios-titulo" className="text-3xl font-black text-white md:text-4xl">Beneficios clave de Brasaland</h2>
              <p className="mt-3 max-w-3xl text-stone-300">
                Nuestra experiencia operando una cadena multipaís nos permite convertir complejidad en servicio de alto nivel para cada cliente.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit) => <BenefitCard key={benefit.title} {...benefit} />)}
            </div>
          </div>
        </section>

        <section id="contacto" className="scroll-mt-24 border-y border-stone-800 bg-stone-900/50 snap-center snap-always">
          <div className="mx-auto grid min-h-[calc(100svh-5rem)] w-full max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-16">
            <div>
              <h2 className="text-3xl font-black text-white md:text-4xl">Conecta con Brasaland</h2>
              <p className="mt-4 text-stone-300">
                Si quieres conocer nuestras ofertas, novedades y oportunidades de colaboración, comparte tus datos en nuestro formulario de interesados.
              </p>
              <Link
                href="/application"
                className="mt-8 inline-block rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-stone-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
              >
                Ir al formulario de contacto
              </Link>
              <p className="mt-6 text-sm text-stone-400">También puedes escribirnos a: contacto@brasaland.com</p>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-amber-500/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=1200&q=80"
                alt="Corte de hamburguesas a la parrilla sobre fuego"
                className="h-full w-full object-cover"
              />
            </figure>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
