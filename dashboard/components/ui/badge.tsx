import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-vx-border bg-vx-surface-raised text-vx-text-muted",
        green: "border-transparent bg-vx-green-soft text-vx-green",
        yellow: "border-transparent bg-vx-yellow-soft text-vx-yellow",
        red: "border-transparent bg-vx-red-soft text-vx-red",
        accent: "border-transparent bg-vx-accent-soft text-vx-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
