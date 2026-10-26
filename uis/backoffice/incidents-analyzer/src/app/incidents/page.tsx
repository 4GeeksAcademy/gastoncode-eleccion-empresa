"use client";


import {
  useState
} from "react";


import type {
  FormEvent
} from "react";

import {
  analyzeFile,
  exportAnalysis,
  publicIncidentErrorMessage,
  type AnalysisResult,
} from "@/lib/incidents-api";


export default function IncidentsPage() {


  const [
    file,
    setFile,
  ] = useState<
    File | null
  >(null);


  const [
    result,
    setResult,
  ] = useState<
    AnalysisResult | null
  >(null);


  const [
    error,
    setError,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    exporting,
    setExporting,
  ] = useState(false);


  async function handleSubmit(

    event:
      FormEvent<HTMLFormElement>

  ) {

    event.preventDefault();

    if (loading) return;

    if (!file) {

      setError(
        "Seleccioná un archivo CSV."
      );

      return;

    }


    setLoading(true);

    setError("");

    setResult(null);


    try {
      setResult(await analyzeFile(file));

    } catch (error) {
      setError(publicIncidentErrorMessage(error, "No se pudo analizar el archivo. Inténtalo de nuevo."));

    } finally {

      setLoading(false);

    }

  }


  async function downloadResults() {

    if (!result || exporting) return;

    setExporting(true);
    setError("");


    try {

      const blob = await exportAnalysis(result.analysis_id);


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          "a"
        );


      link.href =
        url;


      link.download =
        "results.csv";


      document.body
        .appendChild(
          link
        );


      link.click();

      link.remove();


      URL.revokeObjectURL(
        url
      );


    } catch (error) {
      setError(publicIncidentErrorMessage(error, "No se pudo descargar el archivo CSV. Inténtalo de nuevo."));
    } finally {
      setExporting(false);
    }

  }


  return (

    <main className="container">


      <header className="pageHeader">

        <span className="eyebrow">
          OPERACIONES
        </span>


        <h1>
          Análisis de incidencias
        </h1>


        <p>
          Cargá el archivo CSV
          para validar registros
          y consultar sus métricas.
        </p>

      </header>


      <section className="card">


        <form
          onSubmit={handleSubmit}
          className="uploadForm"
        >


          <div className="fileArea">

            <label htmlFor="csvFile">

              Archivo CSV

            </label>


            <input

              id="csvFile"

              type="file"
              disabled={loading}

              accept=".csv,text/csv"

              onChange={(
                event
              ) => {

                const selected =
                  event
                    .target
                    .files?.[0]
                  ?? null;


                setFile(
                  selected
                );
                setResult(null);
                setError("");

              }}

            />


            {
              file
              && (

                <small>

                  Seleccionado:
                  {" "}
                  {file.name}

                </small>

              )
            }

          </div>


          <button
            type="submit"
            disabled={loading}
          >

            {
              loading
              ? "Analizando..."
              : "Analizar CSV"
            }

          </button>


        </form>


        {
          error
          && (

            <div className="error" role="alert">

              {error}

            </div>

          )
        }


      </section>


      {
        result
        && (

          <>

            <p role="status">Resultados de: {result.source_file}</p>

            <section className="metrics">


              <article className="metric">

                <span>
                  Total
                </span>

                <strong>
                  {
                    result
                      .total_records
                  }
                </strong>

              </article>


              <article className="metric">

                <span>
                  Válidos
                </span>

                <strong>
                  {
                    result
                      .valid_records
                  }
                </strong>

              </article>


              <article className="metric">

                <span>
                  Inválidos
                </span>

                <strong>
                  {
                    result
                      .invalid_records
                  }
                </strong>

              </article>


              <article className="metric">

                <span>
                  Satisfacción
                </span>

                <strong>

                  {
                    result
                      .satisfaction
                      .average
                      ?.toFixed(2)
                    ?? "N/A"
                  }

                </strong>

              </article>


            </section>


            <section className="card">


              <h2>
                Registros inválidos
              </h2>


              {
                Object.keys(
                  result
                    .invalid_breakdown
                ).length === 0

                ? (

                  <p>
                    No hay registros
                    inválidos.
                  </p>

                )

                : (

                  <ul className="dataList">


                    {
                      Object.entries(

                        result
                          .invalid_breakdown

                      ).map(
                        ([
                          reason,
                          count,
                        ]) => (

                          <li key={reason}>

                            <span>
                              {reason}
                            </span>

                            <strong>
                              {count}
                            </strong>

                          </li>

                        )
                      )
                    }


                  </ul>

                )
              }


            </section>


            <section className="twoColumns">


              <article className="card">


                <h2>
                  Categorías
                </h2>


                <ul className="dataList">


                  {
                    Object.entries(

                      result
                        .by_category

                    ).map(
                      ([
                        category,
                        data,
                      ]) => (

                        <li key={category}>

                          <span>
                            {category}
                          </span>

                          <strong>

                            {data.count}

                            {" "}

                            (
                            {
                              data
                                .percentage
                                .toFixed(1)
                            }
                            %)

                          </strong>

                        </li>

                      )
                    )
                  }


                </ul>


              </article>


              <article className="card">


                <h2>
                  Estados
                </h2>


                <ul className="dataList">


                  {
                    Object.entries(

                      result
                        .by_status

                    ).map(
                      ([
                        status,
                        data,
                      ]) => (

                        <li key={status}>

                          <span>
                            {status}
                          </span>

                          <strong>

                            {data.count}

                            {" "}

                            (
                            {
                              data
                                .percentage
                                .toFixed(1)
                            }
                            %)

                          </strong>

                        </li>

                      )
                    )
                  }


                </ul>


              </article>


            </section>


            <section className="card">


              <h2>
                Índice de satisfacción
              </h2>


              <div className="satisfactionGrid">


                <div>

                  <span>
                    Casos cerrados
                  </span>

                  <strong>
                    {
                      result
                        .satisfaction
                        .closed_cases
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Casos puntuados
                  </span>

                  <strong>
                    {
                      result
                        .satisfaction
                        .scored_cases
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Promedio
                  </span>

                  <strong>

                    {
                      result
                        .satisfaction
                        .average
                        ?.toFixed(2)
                      ?? "N/A"
                    }

                  </strong>

                </div>


              </div>


              <h3>
                Distribución de puntajes
              </h3>


              <ul className="dataList">


                {
                  Object.entries(

                    result
                      .satisfaction
                      .scores

                  ).map(
                    ([
                      score,
                      count,
                    ]) => (

                      <li key={score}>

                        <span>
                          Puntaje {score}
                        </span>

                        <strong>
                          {count}
                        </strong>

                      </li>

                    )
                  )
                }


              </ul>


              <button
                type="button"
                onClick={
                  downloadResults
                }
                disabled={exporting}
                className="downloadButton"
              >

                {exporting ? "Preparando descarga..." : error ? "Reintentar descarga CSV" : "Descargar resultados CSV"}

              </button>


            </section>


          </>

        )
      }


    </main>

  );

}
