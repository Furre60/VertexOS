export interface PricingPlan {
  name: string;
  price: string;
  features: string[];
}

export interface PricingProps {
  heading: string;
  plans: PricingPlan[];
  /** "cards" (default) or "table". */
  variant?: "cards" | "table";
}

function PricingCards({ plans }: { plans: PricingPlan[] }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className="flex flex-col gap-4 rounded-2xl border border-black/10 p-6"
        >
          <h3 className="text-base font-medium text-foreground">{plan.name}</h3>
          <p className="text-2xl font-semibold text-foreground">{plan.price}</p>
          <ul className="flex flex-col gap-2">
            {plan.features.map((feature) => (
              <li key={feature} className="text-sm text-muted">
                {feature}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PricingTable({ plans }: { plans: PricingPlan[] }) {
  return (
    <div className="mt-8 overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-black/10">
            <th className="py-3 pr-4 text-sm font-medium text-foreground">Plan</th>
            <th className="py-3 pr-4 text-sm font-medium text-foreground">Price</th>
            <th className="py-3 text-sm font-medium text-foreground">Features</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.name} className="border-b border-black/5">
              <td className="py-3 pr-4 align-top text-sm font-medium text-foreground">
                {plan.name}
              </td>
              <td className="py-3 pr-4 align-top text-sm text-foreground">{plan.price}</td>
              <td className="py-3 align-top text-sm text-muted">
                {plan.features.join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pricing — plan comparison. Two layout variants: "cards" and "table". */
export default function Pricing({ heading, plans, variant = "cards" }: PricingProps) {
  return (
    <section className="border-t border-black/5 bg-background px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        {variant === "table" ? <PricingTable plans={plans} /> : <PricingCards plans={plans} />}
      </div>
    </section>
  );
}
