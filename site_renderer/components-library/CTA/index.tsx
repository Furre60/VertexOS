export interface CTAProps {
  heading: string;
  ctaLabel: string;
  ctaHref?: string;
}

/** CTA — a closing call-to-action band. One layout variant. */
export default function CTA({ heading, ctaLabel, ctaHref = "#contact" }: CTAProps) {
  return (
    <section className="border-t border-black/5 bg-accent px-6 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{heading}</h2>
        <a
          href={ctaHref}
          className="rounded-full bg-white px-6 py-3 text-sm font-medium text-accent transition-opacity hover:opacity-90"
        >
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}
