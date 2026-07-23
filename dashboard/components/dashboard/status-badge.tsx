import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { LeadStatus } from "@/lib/types";

const STATUS_VARIANT: Record<LeadStatus, NonNullable<BadgeProps["variant"]>> = {
  New: "default",
  Contacted: "yellow",
  Replied: "accent",
  Won: "green",
  Lost: "red",
};

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {status}
    </Badge>
  );
}
