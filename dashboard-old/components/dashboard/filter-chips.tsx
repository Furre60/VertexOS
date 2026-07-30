"use client";

import { motion } from "framer-motion";
import { FILTERS, type FilterKey } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilterChipsProps {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
  counts: Record<FilterKey, number>;
}

export function FilterChips({ active, onChange, counts }: FilterChipsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter leads"
      className="flex w-fit flex-wrap gap-1 rounded-xl border border-vx-border/80 bg-vx-surface/60 p-1 backdrop-blur-md"
    >
      {FILTERS.map((filter) => {
        const isActive = filter.key === active;
        return (
          <button
            key={filter.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter.key)}
            className={cn(
              "relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              isActive ? "text-vx-text" : "text-vx-text-muted hover:text-vx-text"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="filter-pill"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                className="absolute inset-0 rounded-lg bg-vx-surface-raised border border-vx-border"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {filter.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-mono tabular-nums",
                  isActive ? "text-vx-text-muted" : "text-vx-text-faint"
                )}
              >
                {counts[filter.key]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
