import { redirect } from "next/navigation";
import { safeAuthDestination } from "@/lib/auth/auth-navigation";

export async function moduleLogin(searchParams: Promise<{ next?: string | string[] }>, fallback: string) {
  const { next } = await searchParams;
  const requested = next === undefined ? fallback : typeof next === "string" ? next : null;
  const destination = safeAuthDestination(requested, "/backoffice");
  redirect(`/login?next=${encodeURIComponent(destination)}`);
}
