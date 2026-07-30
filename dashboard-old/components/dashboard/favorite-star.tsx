"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteStarProps {
  slug: string;
  initialFavorite: boolean;
  size?: "sm" | "lg";
  className?: string;
}

/** Toggle a lead's favorite flag. Updates optimistically and rolls back on
 *  a failed request. Stops propagation so it can sit inside a row that
 *  otherwise links through to the business detail page. */
export function FavoriteStar({ slug, initialFavorite, size = "sm", className }: FavoriteStarProps) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const next = !favorite;
    setFavorite(next);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/leads/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ favorite: next }),
        });
        if (!res.ok) throw new Error("Failed to update favorite");
      } catch {
        setFavorite(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={favorite}
      title={favorite ? "Remove from favorites" : "Mark as favorite"}
      className={cn(
        "flex items-center justify-center rounded-md text-vx-text-faint transition-colors",
        "hover:text-vx-yellow disabled:cursor-not-allowed disabled:opacity-60",
        favorite && "text-vx-yellow",
        size === "sm" ? "size-7" : "size-10",
        className
      )}
    >
      <Star
        className={cn(size === "sm" ? "size-4" : "size-5")}
        fill={favorite ? "currentColor" : "none"}
        strokeWidth={2}
      />
    </button>
  );
}
