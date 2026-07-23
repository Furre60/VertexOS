"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/dashboard/copy-button";
import { EMAIL_VARIANTS, type EmailVariantKey, type EmailVariants } from "@/lib/email-generator";

interface EmailTabsProps {
  variants: EmailVariants;
}

/** Renders the Professional / Friendly / Short tab strip plus the
 *  subject, body, and signature for whichever tab is active. No email
 *  copy is written here — everything displayed comes from `variants`,
 *  produced by lib/email-generator.ts. */
export function EmailTabs({ variants }: EmailTabsProps) {
  const [active, setActive] = useState<EmailVariantKey>("professional");
  const email = variants[active];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 rounded-lg border border-vx-border bg-vx-surface p-1">
        {EMAIL_VARIANTS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active === key
                ? "bg-vx-accent text-white"
                : "text-vx-text-muted hover:bg-vx-surface-raised hover:text-vx-text"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-vx-border bg-vx-surface p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-vx-text-muted">Subject</span>
          <p className="text-sm font-medium text-vx-text">{email.subject}</p>
        </div>

        <div className="h-px bg-vx-border-soft" />

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-vx-text-muted">Email body</span>
          <p className="whitespace-pre-line text-sm leading-relaxed text-vx-text">{email.body}</p>
        </div>

        <div className="h-px bg-vx-border-soft" />

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-vx-text-muted">Signature</span>
          <p className="whitespace-pre-line text-sm leading-relaxed text-vx-text-muted">{email.signature}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CopyButton label="Copy Subject" getText={() => email.subject} />
        <CopyButton label="Copy Email" getText={() => `${email.body}\n\n${email.signature}`} />
        <CopyButton
          variant="default"
          label="Copy Both"
          getText={() => `Subject: ${email.subject}\n\n${email.body}\n\n${email.signature}`}
        />
      </div>
    </div>
  );
}
