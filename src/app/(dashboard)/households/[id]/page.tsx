"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import type { Household, HouseholdBudget } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { Spinner } from "@/components/spinner";

type Summary = {
  totalShared: number;
  byCategory: { name: string; color: string | null; total: number }[];
  byMember: { name: string | null; email: string; total: number }[];
  transactions: {
    id: string;
    transactionType: { name: string };
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

type DeleteTarget =
  | { kind: "budget"; id: string; label: string }
  | { kind: "invite"; id: string; label: string }
  | { kind: "leave" };

export default function HouseholdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();

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

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const isInviteValid = useMemo(
    () => /\S+@\S+\.\S+/.test(inviteEmail.trim()),
    [inviteEmail],
  );
  const isBudgetValid = useMemo(() => {
    const parsedLimit = Number(budgetLimit);
    const parsedThreshold = Number(budgetThreshold);
    return (
      budgetCategoryName.trim().length > 0 &&
      Number.isFinite(parsedLimit) &&
      parsedLimit > 0 &&
      Number.isInteger(parsedThreshold) &&
      parsedThreshold >= 1 &&
      parsedThreshold <= 200
    );
  }, [budgetCategoryName, budgetLimit, budgetThreshold]);

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

    if (!isInviteValid) {
      setInviteError("Enter a valid email address");
      return;
    }

    setIsInviting(true);
    const response = await fetch(`/api/households/${id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    setIsInviting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Something went wrong";
      setInviteError(message);
      toast.error(message);
      return;
    }

    setInviteEmail("");
    await loadAll();
    toast.success("Invite sent");
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    setBudgetError(null);

    if (!isBudgetValid) {
      setBudgetError("Enter a category name and a valid monthly limit");
      return;
    }

    setIsSavingBudget(true);
    const response = await fetch(`/api/households/${id}/budgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryName: budgetCategoryName.trim(),
        monthlyLimit: Number(budgetLimit),
        alertThreshold: Number(budgetThreshold),
      }),
    });
    setIsSavingBudget(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Something went wrong";
      setBudgetError(message);
      toast.error(message);
      return;
    }

    setBudgetCategoryName("");
    setBudgetLimit("");
    await loadAll();
    toast.success("Household budget saved");
  }

  async function confirmDeleteAction() {
    if (!deleteTarget) return;
    setIsProcessingDelete(true);

    if (deleteTarget.kind === "leave") {
      const response = await fetch(`/api/households/${id}/leave`, { method: "POST" });
      setIsProcessingDelete(false);
      setDeleteTarget(null);
      if (!response.ok) {
        toast.error("Could not leave household");
        return;
      }
      router.push("/households");
      return;
    }

    if (deleteTarget.kind === "invite") {
      const response = await fetch(`/api/households/invites/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setIsProcessingDelete(false);
      setDeleteTarget(null);
      if (!response.ok) {
        toast.error("Could not cancel invite");
        return;
      }
      await loadAll();
      toast.success("Invite canceled");
      return;
    }

    const response = await fetch(`/api/households/${id}/budgets/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setIsProcessingDelete(false);
    setDeleteTarget(null);
    if (!response.ok) {
      toast.error("Could not delete budget");
      return;
    }
    await loadAll();
    toast.success("Budget deleted");
  }

  if (isLoading || !household || !summary) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text">
            {household.name}
          </h1>
          <p className="text-sm text-text-muted">
            {household.members.length} member
            {household.members.length === 1 ? "" : "s"} · shared spend this month
          </p>
        </div>
        <button
          onClick={() => setDeleteTarget({ kind: "leave" })}
          className="text-sm text-budget-critical hover:underline"
        >
          Leave household
        </button>
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <p className="text-sm text-text-muted">Total shared this month</p>
        <p className="mt-1 text-2xl font-semibold text-text">
          {formatInr(summary.totalShared)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-card p-4">
          <h2 className="mb-3 text-sm font-medium text-text">
            Shared by category
          </h2>
          {summary.byCategory.length === 0 ? (
            <p className="text-sm text-text-muted">No shared expenses yet.</p>
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
                  <span className="font-medium text-text">
                    {formatInr(c.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface-card p-4">
          <h2 className="mb-3 text-sm font-medium text-text">
            Contribution by member
          </h2>
          {summary.byMember.length === 0 ? (
            <p className="text-sm text-text-muted">No shared expenses yet.</p>
          ) : (
            <ul className="space-y-2">
              {summary.byMember.map((m) => (
                <li key={m.email} className="flex items-center justify-between text-sm">
                  <span>{m.name ?? m.email}</span>
                  <span className="font-medium text-text">
                    {formatInr(m.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <h2 className="mb-3 text-sm font-medium text-text">
          Household budgets
        </h2>

        <form onSubmit={handleSaveBudget} noValidate className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-text">
              Category name
            </label>
            <input
              type="text"
              placeholder="EMI, Rent..."
              value={budgetCategoryName}
              onChange={(e) => setBudgetCategoryName(e.target.value)}
              className="mt-1 rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              Monthly limit (INR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              className="mt-1 w-32 rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              Alert at (%)
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={budgetThreshold}
              onChange={(e) => setBudgetThreshold(e.target.value)}
              className="mt-1 w-20 rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSavingBudget || !isBudgetValid}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSavingBudget && (
              <Spinner />
            )}
            {isSavingBudget ? "Saving..." : "Save"}
          </button>
        </form>
        {budgetError && <p className="mb-3 text-sm text-budget-critical">{budgetError}</p>}

        {budgets.length === 0 ? (
          <p className="text-sm text-text-muted">No household budgets set.</p>
        ) : (
          <ul className="space-y-3">
            {budgets.map((budget) => {
              const limit = Number(budget.monthlyLimit);
              const ratio = limit > 0 ? budget.spent / limit : 0;
              const pct = Math.min(ratio * 100, 100);
              return (
                <li key={budget.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text">
                      {budget.categoryName}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-text-muted">
                        {formatInr(budget.spent)} / {formatInr(limit)}
                      </span>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            kind: "budget",
                            id: budget.id,
                            label: budget.categoryName,
                          })
                        }
                        className="text-budget-critical hover:underline"
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full transition-all"
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

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text">
          <Users size={16} className="text-text-faint" />
          Members
        </h2>
        <ul className="mb-4 divide-y divide-border">
          {household.members.map((member) => (
            <li key={member.id} className="py-2 text-sm text-text-muted">
              {member.name ?? member.email}
            </li>
          ))}
        </ul>

        {household.invites && household.invites.length > 0 && (
          <div className="mb-4 space-y-1">
            <p className="text-xs font-medium uppercase text-text-faint">
              Pending invites
            </p>
            {household.invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between text-sm text-text-muted"
              >
                <span>{invite.email}</span>
                <button
                  onClick={() =>
                    setDeleteTarget({ kind: "invite", id: invite.id, label: invite.email })
                  }
                  className="text-budget-critical hover:underline"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleInvite} noValidate className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="block text-sm font-medium text-text">
              Invite by email
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setInviteError(null);
              }}
              className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isInviting || !isInviteValid}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isInviting && (
              <Spinner />
            )}
            {isInviting ? "Sending..." : "Invite"}
          </button>
        </form>
        {inviteError && <p className="mt-2 text-sm text-budget-critical">{inviteError}</p>}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind === "leave"
            ? "Leave this household?"
            : deleteTarget?.kind === "invite"
              ? "Cancel this invite?"
              : "Delete this budget?"
        }
        description={
          deleteTarget?.kind === "leave"
            ? "You'll lose access to this household's shared transactions and budgets."
            : deleteTarget?.kind === "invite"
              ? `The invite to ${deleteTarget.label} will be canceled.`
              : deleteTarget?.kind === "budget"
                ? `The household budget for ${deleteTarget.label} will be permanently removed.`
                : undefined
        }
        confirmLabel={deleteTarget?.kind === "leave" ? "Leave" : "Delete"}
        isConfirming={isProcessingDelete}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
