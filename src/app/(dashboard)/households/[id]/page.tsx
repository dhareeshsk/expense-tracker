"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Household, HouseholdBudget } from "@/lib/types";

type Summary = {
  totalShared: number;
  byCategory: { name: string; color: string | null; total: number }[];
  byMember: { name: string | null; email: string; total: number }[];
  transactions: {
    id: string;
    type: string;
    amount: string;
    date: string;
    note: string | null;
    category: { name: string; color: string | null };
    memberName: string | null;
    memberEmail: string;
  }[];
};

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function progressColor(ratio: number) {
  if (ratio >= 1) return "#e34948";
  if (ratio >= 0.8) return "#eda100";
  return "#1baf7a";
}

export default function HouseholdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [household, setHousehold] = useState<Household | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [budgets, setBudgets] = useState<HouseholdBudget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const [budgetCategoryName, setBudgetCategoryName] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [budgetThreshold, setBudgetThreshold] = useState("80");
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  async function loadAll() {
    const [householdRes, summaryRes, budgetsRes] = await Promise.all([
      fetch(`/api/households/${id}`),
      fetch(`/api/households/${id}/summary`),
      fetch(`/api/households/${id}/budgets`),
    ]);
    if (!householdRes.ok) {
      router.push("/households");
      return;
    }
    const [householdData, summaryData, budgetsData] = await Promise.all([
      householdRes.json(),
      summaryRes.json(),
      budgetsRes.json(),
    ]);
    setHousehold(householdData);
    setSummary(summaryData);
    setBudgets(budgetsData);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load from the server
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAll is stable for this component's lifetime
  }, [id]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setIsInviting(true);

    const response = await fetch(`/api/households/${id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    setIsInviting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setInviteError(body?.error ?? "Something went wrong");
      return;
    }

    setInviteEmail("");
    await loadAll();
  }

  async function handleCancelInvite(inviteId: string) {
    const response = await fetch(`/api/households/invites/${inviteId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      alert("Could not cancel invite");
      return;
    }
    await loadAll();
  }

  async function handleLeave() {
    if (!confirm("Leave this household?")) return;
    const response = await fetch(`/api/households/${id}/leave`, {
      method: "POST",
    });
    if (!response.ok) {
      alert("Could not leave household");
      return;
    }
    router.push("/households");
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    setBudgetError(null);

    const parsedLimit = Number(budgetLimit);
    if (!budgetCategoryName.trim() || !Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      setBudgetError("Enter a category name and valid limit");
      return;
    }

    setIsSavingBudget(true);
    const response = await fetch(`/api/households/${id}/budgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryName: budgetCategoryName.trim(),
        monthlyLimit: parsedLimit,
        alertThreshold: Number(budgetThreshold),
      }),
    });
    setIsSavingBudget(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setBudgetError(body?.error ?? "Something went wrong");
      return;
    }

    setBudgetCategoryName("");
    setBudgetLimit("");
    await loadAll();
  }

  async function handleDeleteBudget(budgetId: string) {
    const response = await fetch(`/api/households/${id}/budgets/${budgetId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      alert("Could not delete budget");
      return;
    }
    await loadAll();
  }

  if (isLoading || !household || !summary) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {household.name}
          </h1>
          <p className="text-sm text-gray-500">
            {household.members.length} member
            {household.members.length === 1 ? "" : "s"} · shared spend this month
          </p>
        </div>
        <button
          onClick={handleLeave}
          className="text-sm text-red-600 hover:underline"
        >
          Leave household
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Total shared this month</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">
          {formatInr(summary.totalShared)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-900">
            Shared by category
          </h2>
          {summary.byCategory.length === 0 ? (
            <p className="text-sm text-gray-500">No shared expenses yet.</p>
          ) : (
            <ul className="space-y-2">
              {summary.byCategory.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.color ?? "#6b7280" }}
                    />
                    {c.name}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatInr(c.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-900">
            Contribution by member
          </h2>
          {summary.byMember.length === 0 ? (
            <p className="text-sm text-gray-500">No shared expenses yet.</p>
          ) : (
            <ul className="space-y-2">
              {summary.byMember.map((m) => (
                <li key={m.email} className="flex items-center justify-between text-sm">
                  <span>{m.name ?? m.email}</span>
                  <span className="font-medium text-gray-900">
                    {formatInr(m.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-900">
          Household budgets
        </h2>

        <form onSubmit={handleSaveBudget} className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category name
            </label>
            <input
              type="text"
              placeholder="EMI, Rent..."
              value={budgetCategoryName}
              onChange={(e) => setBudgetCategoryName(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Monthly limit (INR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              className="mt-1 w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Alert at (%)
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={budgetThreshold}
              onChange={(e) => setBudgetThreshold(e.target.value)}
              className="mt-1 w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSavingBudget}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Save
          </button>
        </form>
        {budgetError && <p className="mb-3 text-sm text-red-600">{budgetError}</p>}

        {budgets.length === 0 ? (
          <p className="text-sm text-gray-500">No household budgets set.</p>
        ) : (
          <ul className="space-y-3">
            {budgets.map((budget) => {
              const limit = Number(budget.monthlyLimit);
              const ratio = limit > 0 ? budget.spent / limit : 0;
              const pct = Math.min(ratio * 100, 100);
              return (
                <li key={budget.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {budget.categoryName}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-gray-500">
                        {formatInr(budget.spent)} / {formatInr(limit)}
                      </span>
                      <button
                        onClick={() => handleDeleteBudget(budget.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: progressColor(ratio),
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-900">Members</h2>
        <ul className="mb-4 divide-y divide-gray-100">
          {household.members.map((member) => (
            <li key={member.id} className="py-2 text-sm text-gray-700">
              {member.name ?? member.email}
            </li>
          ))}
        </ul>

        {household.invites && household.invites.length > 0 && (
          <div className="mb-4 space-y-1">
            <p className="text-xs font-medium uppercase text-gray-400">
              Pending invites
            </p>
            {household.invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between text-sm text-gray-600"
              >
                <span>{invite.email}</span>
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  className="text-red-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700">
              Invite by email
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isInviting}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Invite
          </button>
        </form>
        {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
      </div>
    </div>
  );
}
