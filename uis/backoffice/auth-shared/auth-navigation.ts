export const EXTERNAL_APP_PREFIXES = ["/suppliers", "/incidents-manager", "/incidents-analyzer", "/inventory-management"] as const;

/** Rutas servidas por otra app Next.js en este mismo origen; requieren recarga completa. */
export function isExternalAppPath(pathname: string): boolean {
  return EXTERNAL_APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function safeAuthDestination(candidate: string | null): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return "/";
  if (/[\\\u0000-\u0020]/.test(candidate)) return "/";

  try {
    const destination = new URL(candidate, "https://backoffice.invalid");
    if (destination.origin !== "https://backoffice.invalid") return "/";
    if (!["/", "/account", "/account/profile", "/account/change-password", "/forgot-password", "/reset-password"].includes(destination.pathname)
      && !isExternalAppPath(destination.pathname)) return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}

export function loginDestination(pathname: string): string {
  const destination = safeAuthDestination(pathname.split(/[?#]/, 1)[0]);
  return `/login?next=${encodeURIComponent(destination)}`;
}