"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/skeleton";

type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "SUPER_ADMIN";
  createdAt: string;
  categories: { id: string; name: string; color: string | null; isDefault: boolean }[];
  budgets: {
    id: string;
    categoryName: string;
    monthlyLimit: string;
    alertThreshold: number;
  }[];
  households: { id: string; name: string }[];
  recentTransactions: {
    id: string;
    amount: string;
    date: string;
    note: string | null;
    category: { name: string };
    transactionType: { name: string };
  }[];
};

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`).then(async (res) => {
      if (!res.ok) {
        router.push("/admin/users");
        return;
      }
      setUser(await res.json());
    });
  }, [id, router]);

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text">
          {user.name ?? user.email}
        </h1>
        <p className="text-sm text-text-muted">
          {user.email} · joined {new Date(user.createdAt).toLocaleDateString("en-IN")}
          {user.role === "SUPER_ADMIN" && (
            <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              Super Admin
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-card p-4">
          <h2 className="mb-2 text-sm font-medium text-text">Categories</h2>
          {user.categories.length === 0 ? (
            <p className="text-sm text-text-muted">None.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {user.categories.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.color ?? "#948f85" }}
                  />
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface-card p-4">
          <h2 className="mb-2 text-sm font-medium text-text">Budgets</h2>
          {user.budgets.length === 0 ? (
            <p className="text-sm text-text-muted">None.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {user.budgets.map((b) => (
                <li key={b.id} className="flex items-center justify-between">
                  <span>{b.categoryName}</span>
                  <span className="text-text-muted">
                    {formatInr(Number(b.monthlyLimit))}/mo
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface-card p-4">
          <h2 className="mb-2 text-sm font-medium text-text">Households</h2>
          {user.households.length === 0 ? (
            <p className="text-sm text-text-muted">None.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {user.households.map((h) => (
                <li key={h.id}>{h.name}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface-card p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-medium text-text">
            Recent transactions
          </h2>
          {user.recentTransactions.length === 0 ? (
            <p className="text-sm text-text-muted">None.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-text-muted">
                  <tr>
                    <th className="py-1 pr-4 font-medium">Date</th>
                    <th className="py-1 pr-4 font-medium">Type</th>
                    <th className="py-1 pr-4 font-medium">Category</th>
                    <th className="py-1 pr-4 font-medium">Note</th>
                    <th className="py-1 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {user.recentTransactions.map((t) => (
                    <tr key={t.id}>
                      <td className="py-1.5 pr-4 text-text-muted">
                        {new Date(t.date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-1.5 pr-4 text-text-muted">
                        {t.transactionType.name}
                      </td>
                      <td className="py-1.5 pr-4">{t.category.name}</td>
                      <td className="py-1.5 pr-4 text-text-muted">
                        {t.note ?? "—"}
                      </td>
                      <td className="py-1.5 text-right font-medium text-text">
                        {formatInr(Number(t.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
