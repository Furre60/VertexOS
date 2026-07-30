import Link from "next/link";
import { SearchX } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { buttonVariants } from "@/components/ui/button";

export default function BusinessNotFound() {
  return (
    <div className="vx-grid-fade flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 py-20 text-center sm:px-8">
        <span className="mb-5 flex size-12 items-center justify-center rounded-full border border-vx-border bg-vx-surface-raised text-vx-text-faint">
          <SearchX className="size-5" />
        </span>
        <h1 className="text-xl font-semibold text-vx-text">Business not found</h1>
        <p className="mt-2 max-w-sm text-sm text-vx-text-muted">
          There&rsquo;s no scored business at this address. It may have been removed from the dataset.
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
          Back to all leads
        </Link>
      </main>
    </div>
  );
}
