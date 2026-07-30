import Link from "next/link";
import { Radar } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-vx-border-soft bg-vx-bg/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg border border-vx-border bg-vx-surface-raised text-vx-accent">
            <Radar className="size-4.5" strokeWidth={2} />
          </span>
          <span className="font-mono text-lg font-semibold tracking-tight text-vx-text">
            VertexOS
          </span>
        </Link>
        <span className="mx-1 h-4 w-px bg-vx-border" aria-hidden />
        <p className="text-sm text-vx-text-muted">Business Lead Intelligence</p>
      </div>
    </header>
  );
}
