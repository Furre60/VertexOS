export interface ServiceItem {
  name: string;
  description: string;
}

export interface ServicesProps {
  heading: string;
  items: ServiceItem[];
}

/** Services — a grid of what the business offers. One layout variant. */
export default function Services({ heading, items }: ServicesProps) {
  return (
    <section className="border-t border-black/5 bg-background px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.name} className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-foreground">{item.name}</h3>
              <p className="text-sm leading-relaxed text-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
