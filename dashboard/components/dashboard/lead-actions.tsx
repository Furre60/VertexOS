"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSearch, Mail, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailModal } from "@/components/dashboard/email-modal";
import type { Business } from "@/lib/types";

interface LeadActionsProps {
  business: Business;
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

function GenerateEmailButton({ business }: { business: Business }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-vx-border bg-vx-surface px-2.5 py-1.5 text-xs font-medium text-vx-text-muted",
          "transition-colors hover:border-vx-accent/40 hover:bg-vx-surface-raised hover:text-vx-text"
        )}
      >
        <Mail className="size-3.5 shrink-0" />
        <span className="hidden md:inline">Generate Email</span>
      </button>
      {open && <EmailModal business={business} onClose={() => setOpen(false)} />}
    </>
  );
}

export function LeadActions({ business }: LeadActionsProps) {
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/business/${business.slug}`}
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-vx-border bg-vx-surface px-2.5 py-1.5 text-xs font-medium text-vx-text-muted",
          "transition-colors hover:border-vx-accent/40 hover:bg-vx-surface-raised hover:text-vx-text"
        )}
      >
        <FileSearch className="size-3.5 shrink-0" />
        <span className="hidden md:inline">View Audit</span>
      </Link>
      <GenerateEmailButton business={business} />
      <PlaceholderButton icon={MonitorPlay} label="Generate Demo" />
    </div>
  );
}
