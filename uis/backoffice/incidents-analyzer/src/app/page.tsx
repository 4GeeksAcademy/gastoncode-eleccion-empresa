import { ModuleLink } from "../../../auth-shared/module-link";


export default function Home() {

  return (

    <main className="container">

      <section className="hero">

        <span className="eyebrow">
          BRASALAND DIGITAL
        </span>


        <h1>
          Backoffice operativo
        </h1>


        <p>
          Herramientas internas
          para gestión y análisis
          de operaciones.
        </p>


        <ModuleLink
          basePath="/incidents-analyzer"
          href="/incidents"
          className="button"
        >
          Analizar incidencias
        </ModuleLink>

      </section>

    </main>

  );

}
