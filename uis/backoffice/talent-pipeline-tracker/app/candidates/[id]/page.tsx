"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ActionsCard } from "@/components/candidate-detail/actions-card";
import { DetailTopBar } from "@/components/candidate-detail/detail-topbar";
import { GeneralInfo } from "@/components/candidate-detail/general-info";
import { HeroCard } from "@/components/candidate-detail/hero-card";
import { NotesSection } from "@/components/candidate-detail/notes-section";
import { ProcessInfo } from "@/components/candidate-detail/process-info";
import { CandidateDetail } from "@/types/candidate-detail";
import { publicErrorMessage, trackerFetch } from "@/utils/api";

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; item?: CandidateDetail; error?: string } | null>(null);
  const requestKey = `${id}:${revision}`;
  const current = result?.key === requestKey ? result : null;
  const item = current?.item;
  const refreshRecord = () => setRevision((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    void trackerFetch(`/records/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async (response) => {
        const item = await response.json() as CandidateDetail;
        if (!controller.signal.aborted) setResult({ key: requestKey, item });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, error: publicErrorMessage(error) });
      });
    return () => controller.abort();
  }, [id, requestKey]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--page-grad-start)_0%,_var(--page-grad-mid)_55%,_var(--page-grad-end)_100%)] pb-10">
      <DetailTopBar brand="BRASALAND" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        {!current && <p role="status">Cargando candidatura...</p>}
        {current?.error && <div role="alert" className="space-y-3"><p>{current.error}</p><button type="button" onClick={refreshRecord}>Reintentar</button></div>}
        {item && <>
          <HeroCard item={item} />
          <GeneralInfo item={item} />
          <ProcessInfo item={item} />
          <NotesSection recordId={item.id} />
          <ActionsCard id={item.id} status={item.status} stage={item.stage} onUpdated={refreshRecord} />
        </>}
      </main>
    </div>
  );
}
