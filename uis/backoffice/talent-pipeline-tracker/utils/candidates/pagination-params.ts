export function paginationParams(page: unknown, limit: unknown) {
  const parsedPage = typeof page === "string" && /^[1-9]\d*$/.test(page) ? Number(page) : 1;
  const validPage = Number.isSafeInteger(parsedPage) ? parsedPage : 1;
  const limitValue = limit === "all" || limit === "1000" ? "all"
    : limit === "12" || limit === "24" ? limit : "9";
  return {
    page: validPage,
    limit: limitValue === "all" ? 1000 : Number(limitValue),
    limitValue,
  };
}
