import Link from "next/link";

export function SiteFooter({
  siteName,
  footerText,
}: {
  siteName: string;
  footerText: string;
}) {
  return (
    <footer className="border-t border-border bg-surface-card pb-safe">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-text-faint">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-text-muted">{siteName}</p>
          <Link href="/tools/calculator" className="hover:text-text-muted">
            Expense calculator
          </Link>
        </div>
        <p className="mt-2">
          {footerText || `${new Date().getFullYear()} ${siteName}. All rights reserved.`}
        </p>
      </div>
    </footer>
  );
}
