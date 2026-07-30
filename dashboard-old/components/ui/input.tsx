import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-vx-border bg-vx-surface px-4 py-2 text-sm text-vx-text placeholder:text-vx-text-faint transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vx-accent focus-visible:border-vx-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
