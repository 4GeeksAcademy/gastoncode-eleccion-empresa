export function safeAuthDestination(candidate: string | null): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return "/";
  if (/[\\\u0000-\u0020]/.test(candidate)) return "/";

  try {
    const destination = new URL(candidate, "https://backoffice.invalid");
    if (destination.origin !== "https://backoffice.invalid") return "/";
    if (!["/", "/account", "/account/profile", "/suppliers"].includes(destination.pathname)
      && !destination.pathname.startsWith("/suppliers/")) return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}