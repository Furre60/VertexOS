export interface HeroProps {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref?: string;
}

/**
 * Hero — the top-of-page section. One layout variant for now (centered,
 * text-only). Additional variants (split-image, video-background) are
 * introduced in Sprint 7 alongside the rest of the component catalog.
 */
export default function Hero({
  headline,
  subheadline,
  ctaLabel,
  ctaHref = "#contact",
}: HeroProps) {
  return (
    <section className="bg-background px-6 py-24 sm:py-32">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {headline}
        </h1>
        <p className="max-w-xl text-lg text-muted">{subheadline}</p>
        <a
          href={ctaHref}
          className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}
