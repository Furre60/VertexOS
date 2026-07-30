export interface GalleryItem {
  caption: string;
}

export interface GalleryProps {
  heading: string;
  items: GalleryItem[];
}

/**
 * Gallery — a grid of image slots with captions. Sprint 7 has no asset
 * resolution yet (that's Sprint 12), so each slot renders as a decorative
 * placeholder panel with its caption overlaid. Sprint 12 adds an optional
 * `imageUrl` to each item and swaps the placeholder for a real <img> when
 * present - this component's structure doesn't need to change for that.
 */
export default function Gallery({ heading, items }: GalleryProps) {
  return (
    <section className="border-t border-black/5 bg-background px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={`${item.caption}-${index}`}
              className="flex aspect-square flex-col items-center justify-end gap-2 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 p-4"
            >
              <p className="text-center text-xs font-medium text-muted">{item.caption}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
