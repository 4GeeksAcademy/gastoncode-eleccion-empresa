import { redirect } from "next/navigation";
import { safeAuthDestination } from "../../../../auth-shared/auth-navigation";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "";
const APP_ROOT = "/inventory-management";

type LoginPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const requested = (await searchParams).next;
  const candidate = safeAuthDestination(typeof requested === "string" ? requested : null);
  const requestedPath = new URL(candidate, "https://backoffice.invalid").pathname;
  const destination = requestedPath === APP_ROOT || requestedPath.startsWith(`${APP_ROOT}/`)
    ? candidate
    : APP_ROOT;
  redirect(`${DASHBOARD_URL}/login?next=${encodeURIComponent(destination)}`);
}
