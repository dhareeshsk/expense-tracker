"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Calculator } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";

type SessionInfo = {
  name: string | null | undefined;
  email: string | null | undefined;
  role: "USER" | "SUPER_ADMIN";
} | null;

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/households", label: "Households" },
];

export function SiteHeader({
  siteName,
  session,
}: {
  siteName: string;
  session: SessionInfo;
}) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  const homeHref = session ? "/dashboard" : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href={homeHref}
          className="flex items-center gap-2 text-base font-semibold text-text"
        >
          <Image
            src="/logo.svg"
            alt={`${siteName} logo`}
            width={28}
            height={28}
            className="h-7 w-7"
            priority
          />
          {siteName}
        </Link>

        {session ? (
          <div className="flex items-center gap-1">
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    pathname === link.href
                      ? "bg-primary text-white"
                      : "text-text-muted hover:bg-surface-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <Link
              href="/tools/calculators"
              title="Calculators"
              aria-label="Calculators"
              className={`flex h-9 w-9 items-center justify-center rounded-md ${
                pathname.startsWith("/tools/calculator")
                  ? "bg-primary text-white"
                  : "text-text-muted hover:bg-surface-muted"
              }`}
            >
              <Calculator className="h-5 w-5" />
            </Link>

            <NotificationBell />

            <div ref={menuRef} className="relative">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setProfileOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
              >
                {(session.name ?? session.email ?? "?").charAt(0).toUpperCase()}
              </motion.button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-surface-card py-1 shadow-lg">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-text hover:bg-surface-muted"
                    onClick={() => setProfileOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-text hover:bg-surface-muted"
                    onClick={() => setProfileOpen(false)}
                  >
                    Settings
                  </Link>
                  {session.role === "SUPER_ADMIN" && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-text hover:bg-surface-muted"
                      onClick={() => setProfileOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full px-4 py-2 text-left text-sm text-accent hover:bg-surface-muted"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/tools/calculators"
              title="Calculators"
              aria-label="Calculators"
              className={`flex h-9 w-9 items-center justify-center rounded-md ${
                pathname.startsWith("/tools/calculator")
                  ? "bg-primary text-white"
                  : "text-text-muted hover:bg-surface-muted"
              }`}
            >
              <Calculator className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-muted"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
