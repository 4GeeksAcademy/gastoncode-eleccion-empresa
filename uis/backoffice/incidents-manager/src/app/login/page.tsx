import { redirect } from "next/navigation";
import { safeAuthDestination } from "../../../../auth-shared/auth-navigation";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3000";
const APP_ROOT = "/incidents-manager";

type LoginPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const requested = (await searchParams).next;
  const safeDestination = safeAuthDestination(typeof requested === "string" ? requested : null);
  const returnPath = new URL(safeDestination, "https://backoffice.invalid").pathname;
  const destination = returnPath === APP_ROOT || returnPath.startsWith(`${APP_ROOT}/`)
    ? returnPath
    : APP_ROOT;

  redirect(`${DASHBOARD_URL}/login?next=${encodeURIComponent(destination)}`);
}
