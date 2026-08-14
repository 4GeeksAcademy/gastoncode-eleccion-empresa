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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#2a2a2a_0%,_#131313_55%,_#0e0e0e_100%)] pb-10">
      <DetailTopBar brand="BRASALAND" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        <HeroCard item={item} />
        <GeneralInfo item={item} />
        <ProcessInfo item={item} />
        <NotesSection item={item} />
        <ActionsCard />
      </main>
    </div>
  );
}

async function getRecord(id: string): Promise<CandidateDetail> {
  const response = await fetch(`https://playground.4geeks.com/tracker/api/v1/records/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) notFound();
  return (await response.json()) as CandidateDetail;
}
