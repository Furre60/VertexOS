"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mail, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmailTabs } from "@/components/dashboard/email-tabs";
import { generateEmailVariants, type EmailVariants } from "@/lib/email-generator";
import type { Business } from "@/lib/types";

interface EmailModalProps {
  business: Business;
  onClose: () => void;
}

/** Opens on "Generate Email", generates all three tones for this lead,
 *  and lets the user regenerate a fresh variation without leaving the
 *  modal. All copy comes from lib/email-generator.ts — this component
 *  only handles layout, loading state, and the regenerate counter. */
export function EmailModal({ business, onClose }: EmailModalProps) {
  const [variants, setVariants] = useState<EmailVariants | null>(null);
  const [variation, setVariation] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    generateEmailVariants(business, { variation }).then((result) => {
      if (!cancelled) {
        setVariants(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.slug, variation]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="email-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
        onClick={onClose}
      >
        <motion.div
          key="email-modal-panel"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="vx-scrollbar max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-vx-border bg-vx-surface-raised p-6 shadow-2xl"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-vx-border bg-vx-surface text-vx-accent">
                <Mail className="size-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-vx-text">Generate Email</h2>
                <p className="text-xs text-vx-text-muted">Cold outreach drafts for {business.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-vx-text-faint transition-colors hover:bg-vx-surface hover:text-vx-text"
            >
              <X className="size-4" />
            </button>
          </div>

          {loading || !variants ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-vx-text-muted">
              <Loader2 className="size-5 animate-spin text-vx-accent" />
              <p className="text-sm">Drafting personalized emails…</p>
            </div>
          ) : (
            <>
              <EmailTabs variants={variants} />

              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVariation((v) => v + 1)}
                >
                  <RefreshCw className="size-3.5" />
                  Regenerate
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
