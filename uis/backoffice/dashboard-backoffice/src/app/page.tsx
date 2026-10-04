import { ServiceCard } from "./components/service-card";
import { AuthGuard } from "./components/auth-guard";
import { SiteHeader } from "./components/site-header";
import { StatCard } from "./components/stat-card";
import { SectionHeading } from "./components/ui/section-heading";
import { SERVICES } from "./catalog/services";

const AREAS = new Set(SERVICES.map((service) => service.area));

export default function Home() {
  return (
    <AuthGuard>
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <section className="brasa-glow overflow-hidden rounded-3xl border border-stone-800 bg-stone-900/40 px-6 py-10 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brasa-400">
            Brasaland Digital
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-stone-50 sm:text-4xl">
            Todas las herramientas internas de la cadena, en un mismo lugar.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-400">
            Este backoffice reúne los servicios que el equipo de Brasaland usa a
            diario para operar 14 locales en dos países. Elige un área para
            empezar.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-4">
          <StatCard
            label="Herramientas"
            value={String(SERVICES.length)}
            detail="Apps operativas en el backoffice"
          />
          <StatCard
            label="Áreas cubiertas"
            value={String(AREAS.size)}
            detail="Departamentos con soporte digital"
          />
        </section>

        <section className="mt-12">
          <SectionHeading
            title="Servicios del backoffice"
            subtitle="Cada tarjeta abre la app correspondiente en su propio origen."
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-800/80 px-6 py-6">
        <p className="mx-auto w-full max-w-6xl text-xs text-stone-600">
          Brasaland · Cocina a la brasa desde 2008 — Medellín, Colombia
        </p>
      </footer>
    </AuthGuard>
  );
}
