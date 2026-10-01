export function dateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
