export interface ContactProps {
  heading: string;
  email: string;
  phone?: string;
  address?: string;
}

/** Contact — business contact details. One layout variant. */
export default function Contact({ heading, email, phone, address }: ContactProps) {
  return (
    <section id="contact" className="border-t border-black/5 bg-background px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        <dl className="mt-6 flex flex-col gap-3 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium text-foreground">Email:</dt>
            <dd className="text-muted">
              <a href={`mailto:${email}`} className="hover:text-accent">
                {email}
              </a>
            </dd>
          </div>
          {phone ? (
            <div className="flex gap-2">
              <dt className="font-medium text-foreground">Phone:</dt>
              <dd className="text-muted">
                <a href={`tel:${phone}`} className="hover:text-accent">
                  {phone}
                </a>
              </dd>
            </div>
          ) : null}
          {address ? (
            <div className="flex gap-2">
              <dt className="font-medium text-foreground">Address:</dt>
              <dd className="text-muted">{address}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}
