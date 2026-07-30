export interface FooterProps {
  businessName: string;
  year?: number;
}

/**
 * Footer — closing section with business name and copyright line.
 * One layout variant for now; see Hero's doc comment for why.
 */
export default function Footer({ businessName, year }: FooterProps) {
  const displayYear = year ?? new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-black/5 bg-background px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium text-foreground">{businessName}</p>
        <p className="text-xs text-muted">
          &copy; {displayYear} {businessName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
