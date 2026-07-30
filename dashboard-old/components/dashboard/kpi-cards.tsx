"use client";

import { motion } from "framer-motion";
import { Users, ShieldCheck, WifiOff, Gauge } from "lucide-react";
import type { LeadKpis } from "@/lib/types";
import { cn } from "@/lib/utils";

interface KpiCardsProps {
  kpis: LeadKpis;
}

const CARD_META = [
  {
    key: "total" as const,
    label: "Total Leads",
    icon: Users,
    accent: "text-vx-accent",
    accentSoft: "bg-vx-accent-soft",
  },
  {
    key: "highPriority" as const,
    label: "High Priority",
    icon: ShieldCheck,
    accent: "text-vx-green",
    accentSoft: "bg-vx-green-soft",
  },
  {
    key: "offline" as const,
    label: "Offline Websites",
    icon: WifiOff,
    accent: "text-vx-red",
    accentSoft: "bg-vx-red-soft",
  },
  {
    key: "averageScore" as const,
    label: "Average Score",
    icon: Gauge,
    accent: "text-vx-yellow",
    accentSoft: "bg-vx-yellow-soft",
  },
];

function formatValue(key: (typeof CARD_META)[number]["key"], kpis: LeadKpis): string {
  if (key === "averageScore") return kpis.averageScore.toFixed(1);
  return kpis[key].toLocaleString();
}

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {CARD_META.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05, ease: "easeOut" }}
            whileHover={{ y: -2 }}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-vx-border/80 bg-vx-surface/60 p-4 sm:p-5",
              "backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]",
              "transition-colors hover:border-vx-border"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-vx-text-muted">
                {card.label}
              </span>
              <span className={cn("flex size-8 items-center justify-center rounded-lg", card.accentSoft)}>
                <Icon className={cn("size-4", card.accent)} strokeWidth={2} />
              </span>
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-vx-text sm:text-3xl">
              {formatValue(card.key, kpis)}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
