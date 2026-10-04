/** Apps del backoffice que existen en el monorepo y se pueden levantar hoy. */
export type BackofficeService = {
  id: string;
  name: string;
  area: string;
  owner: string;
  description: string;
  icon: string;
  /** Carpeta de la app dentro del monorepo. */
  path: string;
  /** Origen donde queda expuesta al levantarla en local. */
  url: string;
};

export const SERVICES: BackofficeService[] = [
  {
    id: "suppliers-management",
    name: "Gestión de proveedores",
    area: "Compras y Proveedores",
    owner: "Lucía Fernández",
    description:
      "Ficha de proveedores, historial de precios y compras consolidadas de Colombia y Florida.",
    icon: "🛒",
    path: "uis/backoffice/suppliers-management",
    url: "/suppliers",
  },
  {
    id: "incidents-analyzer",
    name: "Analizador de incidencias",
    area: "Operaciones de Restaurante",
    owner: "Felipe Guerrero",
    description:
      "Clasificación y seguimiento de incidencias reportadas por los 14 locales.",
    icon: "🍖",
    path: "uis/backoffice/incidents-analyzer",
    url: process.env.NEXT_PUBLIC_INCIDENTS_UI_URL ?? "http://localhost:3002",
  },
  {
    id: "talent-pipeline-tracker",
    name: "Pipeline de talento",
    area: "Personas y Cultura",
    owner: "Ashley Turner",
    description:
      "Seguimiento de vacantes, candidaturas y onboarding de personal de cocina y sala.",
    icon: "🧑‍🤝‍🧑",
    path: "uis/backoffice/talent-pipeline-tracker",
    url: process.env.NEXT_PUBLIC_TALENT_UI_URL ?? "http://localhost:3003",
  },
];
