"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/skeleton";

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "SUPER_ADMIN";
  createdAt: string;
  transactionCount: number;
  householdCount: number;
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  async function load(query: string, targetPage: number) {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(targetPage));
    params.set("pageSize", String(PAGE_SIZE));
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    const data = await res.json();
    setUsers(data.users);
    setPage(data.page);
    setTotalPages(data.totalPages);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load from the server
    load("", 1);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text">Users</h1>
        <p className="text-sm text-text-muted">
          Search and inspect any account.
        </p>
      </div>

      <input
        type="search"
        placeholder="Search by name or email..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") load(q, 1);
        }}
        className="w-full max-w-sm rounded-md border border-border px-3 py-2 text-sm"
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-muted text-left text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Signed up</th>
                <th className="px-4 py-2 text-right font-medium">Transactions</th>
                <th className="px-4 py-2 text-right font-medium">Households</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-2">
                    <Link href={`/admin/users/${u.id}`} className="text-primary hover:underline">
                      {u.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-text-muted">{u.email}</td>
                  <td className="px-4 py-2">
                    {u.role === "SUPER_ADMIN" ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        Super Admin
                      </span>
                    ) : (
                      <span className="text-text-faint">User</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-text-muted">
                    {new Date(u.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-2 text-right text-text">
                    {u.transactionCount}
                  </td>
                  <td className="px-4 py-2 text-right text-text">
                    {u.householdCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="p-4 text-sm text-text-muted">No users found.</p>
          )}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-text-muted">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => load(q, page - 1)}
            className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => load(q, page + 1)}
            className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
