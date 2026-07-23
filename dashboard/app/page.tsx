import { DashboardHeader } from "@/components/dashboard/header";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { getBusinesses } from "@/lib/data";
import { computeKpis } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let businesses: Awaited<ReturnType<typeof getBusinesses>> = [];
  let loadError: string | null = null;

  try {
    businesses = await getBusinesses();
  } catch {
    loadError = "Could not read ../data/scored.json. Make sure the file exists relative to the project root.";
  }

  const kpis = computeKpis(businesses);

  return (
    <div className="vx-grid-fade min-h-screen">
      <DashboardHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-12">
        <div className="mb-8 flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-vx-text sm:text-3xl">
            Scored leads
          </h1>
          <p className="text-sm text-vx-text-muted">
            Every business your pipeline has scored, ranked by lead quality.
          </p>
        </div>

        {loadError ? (
          <div className="flex items-start gap-3 rounded-xl border border-vx-red/30 bg-vx-red-soft px-5 py-4 text-sm text-vx-red">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{loadError}</p>
          </div>
        ) : businesses.length === 0 ? (
          <div className="rounded-xl border border-vx-border bg-vx-surface px-5 py-12 text-center text-sm text-vx-text-muted">
            No scored businesses yet. Once <code className="font-mono text-vx-text">../data/scored.json</code> has
            records, they&rsquo;ll show up here.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <KpiCards kpis={kpis} />
            <LeadsTable businesses={businesses} />
          </div>
        )}
      </main>
    </div>
  );
}
