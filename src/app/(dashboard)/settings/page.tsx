import Link from "next/link";
import { User, Tag, Wallet, Users, BellRing } from "lucide-react";

const LINKS = [
  {
    href: "/profile",
    label: "Profile & password",
    body: "Update your name, email, and password.",
    icon: User,
  },
  {
    href: "/categories",
    label: "Categories",
    body: "Add, edit, or remove spending categories.",
    icon: Tag,
  },
  {
    href: "/budgets",
    label: "Budgets",
    body: "Set monthly limits per category.",
    icon: Wallet,
  },
  {
    href: "/reminders",
    label: "Reminders",
    body: "Track upcoming and recurring bills like EMI, rent, or utilities.",
    icon: BellRing,
  },
  {
    href: "/households",
    label: "Households",
    body: "Create or manage shared expense groups.",
    icon: Users,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text">Settings</h1>
        <p className="text-sm text-text-muted">
          Manage your account and app preferences.
        </p>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border bg-surface-card">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center justify-between px-4 py-3 hover:bg-surface-muted"
            >
              <div className="flex items-center gap-3">
                <link.icon size={18} className="text-text-faint" />
                <div>
                  <p className="text-sm font-medium text-text">{link.label}</p>
                  <p className="text-xs text-text-muted">{link.body}</p>
                </div>
              </div>
              <span className="text-text-faint">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
