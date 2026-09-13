import Link from "next/link";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Site settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center gap-1 border-b border-border pb-3">
        {ADMIN_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-muted"
          >
            {link.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
