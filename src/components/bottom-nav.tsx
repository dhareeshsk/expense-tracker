"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, PiggyBank, Users } from "lucide-react";
import { motion } from "framer-motion";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/households", label: "Households", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-card/95 pb-safe backdrop-blur md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-5xl items-stretch justify-around">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <motion.span whileTap={{ scale: 0.88 }} className="flex flex-col items-center gap-0.5">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className={isActive ? "text-primary" : "text-text-faint"}
                />
                <span className={isActive ? "text-primary" : "text-text-faint"}>
                  {tab.label}
                </span>
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
