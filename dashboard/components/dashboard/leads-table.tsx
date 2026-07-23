"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Globe, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { FilterChips } from "@/components/dashboard/filter-chips";
import { LeadActions } from "@/components/dashboard/lead-actions";
import {
  applyFilter,
  type Business,
  type FilterKey,
  type SortDirection,
  type SortKey,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface LeadsTableProps {
  businesses: Business[];
}

function displayUrl(url: string) {
  if (!url) return "—";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LeadsTable({ businesses }: LeadsTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(
    () => ({
      all: businesses.length,
      "high-priority": applyFilter(businesses, "high-priority").length,
      offline: applyFilter(businesses, "offline").length,
      "no-booking": applyFilter(businesses, "no-booking").length,
      contacted: applyFilter(businesses, "contacted").length,
    }),
    [businesses]
  );

  const filtered = useMemo(() => {
    const byFilter = applyFilter(businesses, filter);

    const q = query.trim().toLowerCase();
    const bySearch = q
      ? byFilter.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            displayUrl(b.website).toLowerCase().includes(q) ||
            (b.address ?? "").toLowerCase().includes(q)
        )
      : byFilter;

    const sorted = [...bySearch].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      if (sortKey === "score") cmp = a.score - b.score;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [businesses, query, sortKey, sortDir, filter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "score" ? "desc" : "asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="size-3.5 text-vx-text-faint" />;
    return sortDir === "asc" ? (
      <ArrowUp className="size-3.5 text-vx-accent" />
    ) : (
      <ArrowDown className="size-3.5 text-vx-accent" />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips active={filter} onChange={setFilter} counts={counts} />

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-vx-text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, address, website…"
            className="pl-10"
            aria-label="Search leads"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-vx-border bg-vx-surface shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
        <div className="vx-scrollbar overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-vx-border bg-vx-surface-raised/50 text-xs uppercase tracking-wide text-vx-text-muted">
                <th scope="col" className="px-5 py-3 font-medium">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-1.5 transition-colors hover:text-vx-text"
                  >
                    Business Name
                    <SortIcon column="name" />
                  </button>
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  <button
                    onClick={() => toggleSort("score")}
                    className="flex items-center gap-1.5 transition-colors hover:text-vx-text"
                  >
                    Score
                    <SortIcon column="score" />
                  </button>
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Website
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false} mode="popLayout">
                {filtered.map((business, i) => (
                  <motion.tr
                    key={business.slug}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i, 12) * 0.02 }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.025)" }}
                    className="group border-b border-vx-border-soft last:border-b-0"
                  >
                    <td className="p-0">
                      <Link
                        href={`/business/${business.slug}`}
                        className="block px-5 py-3.5 outline-none focus-visible:bg-vx-surface-raised"
                      >
                        <span className="block font-medium text-vx-text">{business.name}</span>
                        {business.address && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-vx-text-faint">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{business.address}</span>
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/business/${business.slug}`} className="block px-5 py-3.5">
                        <ScoreBadge score={business.score} />
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/business/${business.slug}`}
                        className="flex items-center gap-1.5 px-5 py-3.5 text-vx-text-muted transition-colors group-hover:text-vx-text"
                      >
                        <Globe className="size-3.5 shrink-0 text-vx-text-faint" />
                        <span className="truncate">{displayUrl(business.website)}</span>
                      </Link>
                    </td>
                    <td className="p-0">
                      <div className="flex justify-end px-5 py-3">
                        <LeadActions slug={business.slug} />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-vx-text-muted">
                    {filter === "contacted"
                      ? "Contacted tracking isn't wired up yet — this filter is a placeholder."
                      : query
                        ? `No businesses match \u201c${query}\u201d.`
                        : "No businesses match this filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-vx-text-faint">
        Showing {filtered.length} of {businesses.length} scored businesses.
      </p>
    </div>
  );
}
