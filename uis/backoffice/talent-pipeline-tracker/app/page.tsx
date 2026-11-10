"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CandidateGrid } from "@/components/candidates/candidate-grid";
import { NewCandidateSection } from "@/components/candidates/new-candidate-section";
import { PageHeader } from "@/components/candidates/page-header";
import { TopBar } from "@/components/candidates/top-bar";
import { RecordsResponse } from "@/types/candidates";
import { publicErrorMessage, trackerFetch } from "@/utils/api";
import { FilterBar } from "@/utils/candidates/filter-bar";
import { Pagination } from "@/utils/candidates/pagination";
import { paginationParams } from "@/utils/candidates/pagination-params";

export default function Home() {
  return <Suspense fallback={<p role="status">Cargando candidaturas...</p>}><CandidatesPage /></Suspense>;
}

function CandidatesPage() {
  const params = useSearchParams();
  const status = params.get("status") || "";
  const stage = params.get("stage") || "";
  const search = params.get("search") || "";
  const email = params.get("email") || "";
  const { page, limit, limitValue } = paginationParams(params.get("page"), params.get("limit"));
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: RecordsResponse; error?: string } | null>(null);
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [field, value] of Object.entries({ status, stage, search: [search, email].filter(Boolean).join(" ").trim() })) {
    if (value) query.set(field, value);
  }
  const queryString = query.toString();
  const requestKey = `${queryString}:${revision}`;
  const current = result?.key === requestKey ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    void trackerFetch(`/records?${queryString}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as RecordsResponse;
        if (!controller.signal.aborted) setResult({ key: requestKey, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, error: publicErrorMessage(error) });
      });
    return () => controller.abort();
  }, [queryString, requestKey]);

  const refreshRecords = () => setRevision((value) => value + 1);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--page-grad-start)_0%,_var(--page-grad-mid)_50%,_var(--page-grad-end)_100%)]">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader total={current?.data?.total ?? 0} />
        <NewCandidateSection onCreated={refreshRecords} />
        <FilterBar stage={stage} status={status} search={search} email={email} limitValue={limitValue} />
        {!current && <p role="status">Cargando candidaturas...</p>}
        {current?.error && <div role="alert" className="space-y-3 py-6"><p>{current.error}</p><button type="button" onClick={refreshRecords}>Reintentar</button></div>}
        {current?.data && <>
          <CandidateGrid data={current.data.data} />
          <Pagination page={current.data.page} limit={current.data.limit} total={current.data.total} stage={stage} status={status} search={search} email={email} />
        </>}
      </main>
    </div>
  );
}
