"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  /** Lazy so the caller can always hand over the current tab's text
   *  without recomputing it on every render. */
  getText: () => string;
  label: string;
  variant?: "default" | "outline";
  className?: string;
}

/** Small stateless-feeling copy button: copies `getText()` to the
 *  clipboard and flips to a "Copied" confirmation for a moment. No email
 *  copy lives in this file — it only ever copies what it's handed. */
export function CopyButton({ getText, label, variant = "outline", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permissions can fail silently in some embedded contexts;
      // there's nothing destructive to roll back, so just leave the
      // button in its normal state.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        variant === "default"
          ? "border-transparent bg-vx-accent text-white hover:bg-vx-accent-hover"
          : "border-vx-border bg-vx-surface text-vx-text-muted hover:border-vx-accent/40 hover:bg-vx-surface-raised hover:text-vx-text",
        className
      )}
    >
      {copied ? <Check className="size-3.5 shrink-0 text-vx-green" /> : <Copy className="size-3.5 shrink-0" />}
      {copied ? "Copied" : label}
    </button>
  );
}
