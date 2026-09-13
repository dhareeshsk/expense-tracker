"use client";

import { useEffect, useState } from "react";
import { CardGridSkeleton, Skeleton } from "@/components/skeleton";

type Stats = {
  totalUsers: number;
  totalHouseholds: number;
  totalTransactions: number;
  activeThisMonth: number;
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  const cards = [
    { label: "Total users", value: stats.totalUsers },
    { label: "Households", value: stats.totalHouseholds },
    { label: "Transactions logged", value: stats.totalTransactions },
    { label: "Active this month", value: stats.activeThisMonth },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text">Admin overview</h1>
        <p className="text-sm text-text-muted">
          At-a-glance counts across all accounts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-surface-card p-4"
          >
            <p className="text-sm text-text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {card.value.toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
