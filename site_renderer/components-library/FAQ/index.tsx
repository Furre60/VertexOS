export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQProps {
  heading: string;
  items: FAQItem[];
}

/**
 * FAQ — question/answer list. One layout variant: a static expanded list
 * (no client-side accordion interactivity yet - that would make this a
 * client component, which is a reasonable future enhancement but not
 * needed for a demo landing page).
 */
export default function FAQ({ heading, items }: FAQProps) {
  return (
    <section className="border-t border-black/5 bg-background px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        <dl className="mt-8 flex flex-col gap-6">
          {items.map((item) => (
            <div key={item.question}>
              <dt className="text-base font-medium text-foreground">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
