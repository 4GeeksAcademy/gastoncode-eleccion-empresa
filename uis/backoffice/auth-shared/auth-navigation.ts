export const EXTERNAL_APP_PREFIXES = ["/suppliers", "/incidents-manager", "/incidents-analyzer", "/inventory-management", "/talent-pipeline-tracker"] as const;

export type BackofficeHome = "/" | "/backoffice";

/** Rutas servidas por otra app Next.js en este mismo origen; requieren recarga completa. */
export function isExternalAppPath(pathname: string): boolean {
  return EXTERNAL_APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function safeAuthDestination(candidate: string | null, homePath: BackofficeHome = "/"): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return homePath;
  if (/[\\\u0000-\u0020]/.test(candidate)) return homePath;

  try {
    const destination = new URL(candidate, "https://backoffice.invalid");
    if (destination.origin !== "https://backoffice.invalid") return homePath;
    if (!["/", homePath, "/account", "/account/profile", "/account/change-password", "/forgot-password", "/reset-password"].includes(destination.pathname)
      && !isExternalAppPath(destination.pathname)) return homePath;
    if (destination.pathname === "/") destination.pathname = homePath;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return homePath;
  }
}

export function loginDestination(pathname: string, homePath: BackofficeHome = "/"): string {
  const destination = safeAuthDestination(pathname.split(/[?#]/, 1)[0], homePath);
  return `/login?next=${encodeURIComponent(destination)}`;
}