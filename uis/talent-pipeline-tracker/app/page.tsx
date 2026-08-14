import { CandidateGrid } from "@/components/candidates/candidate-grid";
import { PageHeader } from "@/components/candidates/page-header";
import { TopBar } from "@/components/candidates/top-bar";
import { RecordsResponse } from "@/types/candidates";
import { FilterBar } from "@/utils/candidates/filter-bar";
import { Pagination } from "@/utils/candidates/pagination";

type SearchParams = {
  status?: string;
  stage?: string;
  search?: string;
  email?: string;
  page?: string;
  limit?: string;
};

type QueryParams = {
  status: string;
  stage: string;
  search: string;
  email: string;
  page: number;
  limit: number;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = params.status || "";
  const stage = params.stage || "";
  const search = params.search || "";
  const email = params.email || "";
  const page = Number(params.page || "1");
  const limitValue = params.limit === "all" ? "all" : params.limit || "9";
  const limit = limitValue === "all" ? 1000 : Number(limitValue);
  const data = await getRecords({ status, stage, search, email, page, limit });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#393939_0%,_#131313_50%,_#0e0e0e_100%)]">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader total={data.total} />
        <FilterBar stage={stage} status={status} search={search} email={email} limitValue={limitValue} />
        <CandidateGrid data={data.data} />
        <Pagination
          page={data.page}
          limit={data.limit}
          total={data.total}
          stage={stage}
          status={status}
          search={search}
          email={email}
        />
      </main>
    </div>
  );
}

async function getRecords(params: QueryParams) {
  const searchValue = [params.search, params.email].filter(Boolean).join(" ").trim();
  const query = new URLSearchParams();
  Object.entries({ ...params, search: searchValue }).forEach(([key, value]) => {
    if (key === "email") return;
    if (String(value)) query.set(key, String(value));
  });

  const res = await fetch(`https://playground.4geeks.com/tracker/api/v1/records?${query}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return { total: 0, page: params.page, limit: params.limit, data: [] };
  }

  return (await res.json()) as RecordsResponse;
}
