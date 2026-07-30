export interface TestimonialItem {
  quote: string;
  author: string;
}

export interface TestimonialsProps {
  heading: string;
  items: TestimonialItem[];
}

/** Testimonials — customer quotes. One layout variant. */
export default function Testimonials({ heading, items }: TestimonialsProps) {
  return (
    <section className="border-t border-black/5 bg-background px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <figure
              key={item.author}
              className="flex flex-col gap-3 rounded-2xl bg-accent/5 p-6"
            >
              <blockquote className="text-sm leading-relaxed text-foreground">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="text-xs font-medium text-muted">
                {item.author}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
