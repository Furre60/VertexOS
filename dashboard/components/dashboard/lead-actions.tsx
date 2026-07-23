"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSearch, Mail, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadActionsProps {
  slug: string;
}

function PlaceholderButton({
  icon: Icon,
  label,
}: {
  icon: typeof Mail;
  label: string;
}) {
  const [justClicked, setJustClicked] = useState(false);

  return (
    <button
      type="button"
      title="Coming soon"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setJustClicked(true);
        window.setTimeout(() => setJustClicked(false), 1200);
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-vx-border bg-vx-surface px-2.5 py-1.5 text-xs font-medium text-vx-text-muted",
        "transition-colors hover:border-vx-accent/40 hover:bg-vx-surface-raised hover:text-vx-text"
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="hidden md:inline">{justClicked ? "Coming soon" : label}</span>
    </button>
  );
}

export function LeadActions({ slug }: LeadActionsProps) {
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/business/${slug}`}
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-vx-border bg-vx-surface px-2.5 py-1.5 text-xs font-medium text-vx-text-muted",
          "transition-colors hover:border-vx-accent/40 hover:bg-vx-surface-raised hover:text-vx-text"
        )}
      >
        <FileSearch className="size-3.5 shrink-0" />
        <span className="hidden md:inline">View Audit</span>
      </Link>
      <PlaceholderButton icon={Mail} label="Generate Email" />
      <PlaceholderButton icon={MonitorPlay} label="Generate Demo" />
    </div>
  );
}
