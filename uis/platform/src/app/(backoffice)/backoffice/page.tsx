import { DashboardHome } from "@dashboard/components/dashboard-home";

export default function BackofficePage() {
  return <DashboardHome serviceOrigin={process.env.LEGACY_BACKOFFICE_URL ?? "http://localhost:3000"} />;
}
