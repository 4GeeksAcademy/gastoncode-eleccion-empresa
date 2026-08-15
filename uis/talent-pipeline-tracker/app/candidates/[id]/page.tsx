import { notFound } from "next/navigation";
import { ActionsCard } from "@/components/candidate-detail/actions-card";
import { DetailTopBar } from "@/components/candidate-detail/detail-topbar";
import { GeneralInfo } from "@/components/candidate-detail/general-info";
import { HeroCard } from "@/components/candidate-detail/hero-card";
import { NotesSection } from "@/components/candidate-detail/notes-section";
import { ProcessInfo } from "@/components/candidate-detail/process-info";
import { CandidateDetail } from "@/types/candidate-detail";

type Params = { id: string };

export default async function CandidateDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const item = await getRecord(id);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--page-grad-start)_0%,_var(--page-grad-mid)_55%,_var(--page-grad-end)_100%)] pb-10">
      <DetailTopBar brand="BRASALAND" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        <HeroCard item={item} />
        <GeneralInfo item={item} />
        <ProcessInfo item={item} />
        <NotesSection recordId={item.id} />
        <ActionsCard id={item.id} status={item.status} stage={item.stage} />
      </main>
    </div>
  );
}

async function getRecord(id: string): Promise<CandidateDetail> {
  const response = await fetch(`https://playground.4geeks.com/tracker/api/v1/records/${id}`, {
    cache: "no-store",
  });

  if (response.status === 404) notFound();
  if (!response.ok) {
    throw new Error("No se pudo cargar la candidatura. Intenta nuevamente.");
  }

  return (await response.json()) as CandidateDetail;
}
