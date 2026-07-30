import { cn } from "@/lib/utils";
import { scoreTier } from "@/lib/types";

const TIER_STYLES = {
  green: {
    text: "text-vx-green",
    bg: "bg-vx-green-soft",
    dot: "bg-vx-green shadow-[0_0_8px_theme(colors.vx-green)]",
  },
  yellow: {
    text: "text-vx-yellow",
    bg: "bg-vx-yellow-soft",
    dot: "bg-vx-yellow shadow-[0_0_8px_theme(colors.vx-yellow)]",
  },
  red: {
    text: "text-vx-red",
    bg: "bg-vx-red-soft",
    dot: "bg-vx-red shadow-[0_0_8px_theme(colors.vx-red)]",
  },
} as const;

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "lg";
  className?: string;
}

/**
 * The signature element of the dashboard: a compact "signal" readout
 * rather than a plain number — a pulsing dot (like a lead's live signal
 * strength) plus the score set in mono type, color-coded by tier.
 */
export function ScoreBadge({ score, size = "sm", className }: ScoreBadgeProps) {
  const tier = scoreTier(score);
  const styles = TIER_STYLES[tier];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-vx-border font-mono tabular-nums",
        styles.bg,
        styles.text,
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-lg",
        className
      )}
    >
      <span className={cn("rounded-full", styles.dot, size === "sm" ? "size-1.5" : "size-2.5")} />
      {score.toFixed(0)}
    </span>
  );
}
