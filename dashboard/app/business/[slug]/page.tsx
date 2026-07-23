import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CircleAlert, Lightbulb, Globe, MapPin } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { buttonVariants } from "@/components/ui/button";
import { getBusinessBySlug, getBusinesses } from "@/lib/data";

export const dynamic = "force-dynamic";

interface BusinessPageProps {
  params: Promise<{ slug: string }>;
}

function normalizeUrl(url: string) {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
}

export async function generateStaticParams() {
  try {
    const businesses = await getBusinesses();
    return businesses.map((b) => ({ slug: b.slug }));
  } catch {
    return [];
  }
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    notFound();
  }

  const href = normalizeUrl(business.website);

  return (
    <div className="vx-grid-fade min-h-screen">
      <DashboardHeader />

      <main className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-vx-text-muted transition-colors hover:text-vx-text"
        >
          <ArrowLeft className="size-4" />
          Back to all leads
        </Link>

        <div className="rounded-2xl border border-vx-border bg-vx-surface p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-vx-text sm:text-3xl">
                {business.name}
              </h1>
              {business.address && (
                <span className="flex items-center gap-1.5 text-sm text-vx-text-muted">
                  <MapPin className="size-3.5 shrink-0 text-vx-text-faint" />
                  {business.address}
                </span>
              )}
              {href && (
                <span className="flex items-center gap-1.5 text-sm text-vx-text-muted">
                  <Globe className="size-3.5 shrink-0 text-vx-text-faint" />
                  {href.replace(/^https?:\/\//, "")}
                </span>
              )}
            </div>
            <ScoreBadge score={business.score} size="lg" />
          </div>

          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "default", className: "mt-6 w-full sm:w-auto" })}
            >
              Open website
              <ArrowUpRight className="size-4" />
            </a>
          )}
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border border-vx-border bg-vx-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-vx-text-muted">
              <CircleAlert className="size-4 text-vx-red" />
              Issues
            </h2>
            {business.issues.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {business.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-vx-text">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-vx-red" />
                    {issue}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-vx-text-faint">No issues flagged.</p>
            )}
          </section>

          <section className="rounded-2xl border border-vx-border bg-vx-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-vx-text-muted">
              <Lightbulb className="size-4 text-vx-yellow" />
              Recommendations
            </h2>
            {business.recommendations.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {business.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-vx-text">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-vx-accent" />
                    {rec}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-vx-text-faint">No recommendations yet.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
