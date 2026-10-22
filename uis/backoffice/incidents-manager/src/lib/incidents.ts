export const CATEGORY_OPTIONS = [
  { value: "equipment_failure", label: "Fallo de equipamiento" },
  { value: "supply_issue", label: "Problema de insumos" },
  { value: "customer_complaint", label: "Queja de cliente" },
  { value: "staff_issue", label: "Incidencia de personal" },
  { value: "facility_issue", label: "Problema de instalaciones" },
  { value: "pos_system", label: "Sistema de caja / TPV" },
  { value: "delivery_issue", label: "Pedidos a domicilio / delivery" },
  { value: "other", label: "Otra" },
] as const;

export const ORIGIN_OPTIONS = [
  { value: "customer", label: "Cliente" },
  { value: "branch", label: "Sede" },
  { value: "internal", label: "Equipo interno" },
] as const;

export const BRANCH_OPTIONS = [
  { value: "central", label: "Central (Medellín / Miami)" },
  { value: "medellin_centro", label: "Medellín Centro" },
  { value: "medellin_laureles", label: "Medellín Laureles" },
  { value: "medellin_envigado", label: "Medellín Envigado" },
  { value: "medellin_bello", label: "Medellín Bello" },
  { value: "medellin_itagui", label: "Medellín Itagüí" },
  { value: "bogota_chapinero", label: "Bogotá Chapinero" },
  { value: "bogota_usaquen", label: "Bogotá Usaquén" },
  { value: "cali_granada", label: "Cali Granada" },
  { value: "barranquilla_norte", label: "Barranquilla Norte" },
  { value: "miami_doral", label: "Miami Doral" },
  { value: "miami_hialeah", label: "Miami Hialeah" },
  { value: "miami_kendall", label: "Miami Kendall" },
  { value: "orlando_international", label: "Orlando International Drive" },
  { value: "fort_lauderdale", label: "Fort Lauderdale" },
] as const;

export type IncidentCategory = (typeof CATEGORY_OPTIONS)[number]["value"];
export type IncidentOrigin = (typeof ORIGIN_OPTIONS)[number]["value"];
export type IncidentBranch = (typeof BRANCH_OPTIONS)[number]["value"];
export type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";

export interface IncidentInput {
  title: string;
  description: string;
  category: IncidentCategory;
  origin: IncidentOrigin;
  branch: IncidentBranch;
}

export interface Incident extends IncidentInput {
  id: string;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
}

export type IncidentField = keyof IncidentInput;
