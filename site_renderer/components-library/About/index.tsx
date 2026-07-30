export interface AboutProps {
  heading: string;
  body: string;
}

/**
 * About — a single-column text section for business background/story.
 * One layout variant for now; see Hero's doc comment for why.
 */
export default function About({ heading, body }: AboutProps) {
  return (
    <section className="border-t border-black/5 bg-background px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">{body}</p>
      </div>
    </section>
  );
}
