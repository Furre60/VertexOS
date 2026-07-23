"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { FavoriteStar } from "@/components/dashboard/favorite-star";
import { Button } from "@/components/ui/button";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

interface LeadEditorProps {
  slug: string;
  initialFavorite: boolean;
  initialStatus: LeadStatus;
  initialNotes: string;
  initialLastContacted: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const fieldClasses =
  "rounded-lg border border-vx-border bg-vx-surface px-3 py-2 text-sm text-vx-text " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vx-accent focus-visible:border-vx-accent";

/**
 * Sprint 3 lead-management editor, shown on the business detail page.
 * Favorite / status / last-contacted save immediately on change; notes
 * save on an explicit button click to avoid a request per keystroke.
 */
export function LeadEditor({
  slug,
  initialFavorite,
  initialStatus,
  initialNotes,
  initialLastContacted,
}: LeadEditorProps) {
  const [status, setStatus] = useState<LeadStatus>(initialStatus);
  const [lastContacted, setLastContacted] = useState(initialLastContacted ?? "");
  const [notes, setNotes] = useState(initialNotes);
  const [notesDirty, setNotesDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [, startTransition] = useTransition();

  async function patch(updates: Record<string, unknown>) {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/leads/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveState("saved");
      window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1600);
    } catch {
      setSaveState("error");
    }
  }

  function handleStatusChange(next: LeadStatus) {
    setStatus(next);
    startTransition(() => {
      void patch({ status: next });
    });
  }

  function handleDateChange(next: string) {
    setLastContacted(next);
    startTransition(() => {
      void patch({ lastContacted: next || null });
    });
  }

  function saveNotes() {
    setNotesDirty(false);
    startTransition(() => {
      void patch({ notes });
    });
  }

  return (
    <section className="rounded-2xl border border-vx-border bg-vx-surface p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-vx-text-muted">
        Lead management
      </h2>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <FavoriteStar slug={slug} initialFavorite={initialFavorite} size="lg" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lead-status" className="text-xs font-medium uppercase tracking-wide text-vx-text-muted">
              Status
            </label>
            <select
              id="lead-status"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className={fieldClasses}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lead-last-contacted" className="text-xs font-medium uppercase tracking-wide text-vx-text-muted">
            Last Contacted
          </label>
          <input
            id="lead-last-contacted"
            type="date"
            value={lastContacted}
            onChange={(e) => handleDateChange(e.target.value)}
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="lead-notes" className="text-xs font-medium uppercase tracking-wide text-vx-text-muted">
            Notes
          </label>
          <span className="flex items-center gap-1.5 text-xs text-vx-text-faint" role="status" aria-live="polite">
            {saveState === "saving" && (
              <>
                <Loader2 className="size-3 animate-spin" /> Saving…
              </>
            )}
            {saveState === "saved" && (
              <>
                <Check className="size-3 text-vx-green" /> Saved
              </>
            )}
            {saveState === "error" && <span className="text-vx-red">Failed to save — try again</span>}
          </span>
        </div>
        <textarea
          id="lead-notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          rows={4}
          placeholder="Add notes about this lead…"
          className={`w-full resize-none ${fieldClasses} placeholder:text-vx-text-faint`}
        />
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={saveNotes} disabled={!notesDirty}>
            Save notes
          </Button>
        </div>
      </div>
    </section>
  );
}
