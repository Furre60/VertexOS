export interface HeroProps {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref?: string;
  /** "centered" (default) or "split-image". */
  variant?: "centered" | "split-image";
}

function CenteredHero({ headline, subheadline, ctaLabel, ctaHref }: Required<Omit<HeroProps, "variant">>) {
  return (
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
  );
}

function SplitImageHero({ headline, subheadline, ctaLabel, ctaHref }: Required<Omit<HeroProps, "variant">>) {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {headline}
        </h1>
        <p className="max-w-xl text-lg text-muted">{subheadline}</p>
        <a
          href={ctaHref}
          className="w-fit rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {ctaLabel}
        </a>
      </div>
      {/*
       * Decorative placeholder for the business's real photography.
       * Sprint 12 (Image/Asset Resolution) replaces this block with an
       * actual <img>, resolved from scraped, stock, or fallback sources -
       * this component doesn't need to change when that lands, only the
       * spec gains a resolved image URL to pass through.
       */}
      <div
        aria-hidden="true"
        className="aspect-[4/3] w-full rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5"
      />
    </div>
  );
}

/**
 * Hero — the top-of-page section. Two layout variants: "centered" (default,
 * text-only) and "split-image" (text + a decorative image-area
 * placeholder). Both variants are driven purely by the `variant` prop; the
 * exported component is a thin dispatcher over them.
 */
export default function Hero({
  headline,
  subheadline,
  ctaLabel,
  ctaHref = "#contact",
  variant = "centered",
}: HeroProps) {
  const body =
    variant === "split-image" ? (
      <SplitImageHero
        headline={headline}
        subheadline={subheadline}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
      />
    ) : (
      <CenteredHero
        headline={headline}
        subheadline={subheadline}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
      />
    );

  return <section className="bg-background px-6 py-24 sm:py-32">{body}</section>;
}
