"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import type { BudgetCalcData, BudgetCalcLineItem, BudgetCalcPeriodType } from "@/lib/types";
import {
  getLocalCalculator,
  saveLocalCalculator,
  deleteLocalCalculator,
  type LocalCalculator,
} from "@/lib/local-calculators";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { Spinner } from "@/components/spinner";

function emptyData(): BudgetCalcData {
  return { periodType: "monthly", lineItems: [] };
}

function newLineItemId() {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

const PERIOD_LABELS: Record<BudgetCalcPeriodType, string> = {
  daily: "Daily",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom range",
};

export default function BudgetCalculatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const toast = useToast();

  const isNew = id === "new";
  const [recordId, setRecordId] = useState<string | null>(isNew ? null : id);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [data, setData] = useState<BudgetCalcData>(emptyData());
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (isNew) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load, gated on session status resolving
      setIsLoading(false);
      return;
    }

    if (id.startsWith("local-")) {
      const local = getLocalCalculator(id);
      if (local) {
        setName(local.name);
        setData({ ...emptyData(), ...(local.data as BudgetCalcData) });
      }
      setIsLoading(false);
      return;
    }

    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }

    fetch(`/api/calculators/${id}`).then(async (res) => {
      if (!res.ok) {
        router.push("/tools/calculators");
        return;
      }
      const record = await res.json();
      setName(record.name);
      setData({ ...emptyData(), ...record.data });
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when id/session status changes
  }, [id, isNew, status, isLoggedIn]);

  const total = useMemo(
    () => data.lineItems.reduce((sum, item) => sum + item.amount, 0),
    [data.lineItems],
  );
  const isFormValid = name.trim().length > 0;

  function addLineItem() {
    const item: BudgetCalcLineItem = { id: newLineItemId(), category: "", amount: 0 };
    setData((prev) => ({ ...prev, lineItems: [...prev.lineItems, item] }));
  }

  function updateLineItem(itemId: string, patch: Partial<BudgetCalcLineItem>) {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }));
  }

  function removeLineItem(itemId: string) {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== itemId),
    }));
  }

  async function handleSave() {
    if (!name.trim()) {
      setNameError("Calculation name is required");
      return;
    }
    setNameError(null);
    setIsSaving(true);

    if (!isLoggedIn) {
      const saved: LocalCalculator = saveLocalCalculator({
        id: recordId ?? undefined,
        type: "BUDGET",
        name: name.trim(),
        data,
      });
      setRecordId(saved.id);
      setIsSaving(false);
      toast.success("Saved to this device");
      if (isNew) router.replace(`/tools/calculators/budget/${saved.id}`);
      return;
    }

    const response = await fetch(
      recordId ? `/api/calculators/${recordId}` : "/api/calculators",
      {
        method: recordId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          recordId ? { name: name.trim(), data } : { type: "BUDGET", name: name.trim(), data },
        ),
      },
    );
    setIsSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Could not save calculator");
      return;
    }

    const record = await response.json();
    setRecordId(record.id);
    toast.success("Saved");
    if (isNew) router.replace(`/tools/calculators/budget/${record.id}`);
  }

  async function confirmDelete() {
    if (!recordId) return;
    setIsDeleting(true);
    if (!isLoggedIn) {
      deleteLocalCalculator(recordId);
      setIsDeleting(false);
      setDeleteOpen(false);
      toast.success("Deleted");
      router.push("/tools/calculators");
      return;
    }
    const response = await fetch(`/api/calculators/${recordId}`, { method: "DELETE" });
    setIsDeleting(false);
    setDeleteOpen(false);
    if (!response.ok) {
      toast.error("Could not delete calculator");
      return;
    }
    toast.success("Deleted");
    router.push("/tools/calculators");
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/tools/calculators" className="text-sm text-text-muted hover:underline">
            ← Calculators
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-text">Budget Calculator</h1>
        </div>
        {recordId && (
          <button
            onClick={() => setDeleteOpen(true)}
            className="text-sm text-budget-critical hover:underline"
          >
            Delete
          </button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <label className="block text-sm font-medium text-text">Calculation name</label>
        <input
          type="text"
          placeholder="Monthly household budget..."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(null);
          }}
          className="mt-1 w-full max-w-sm rounded-md border border-border px-3 py-2 text-sm"
        />
        {nameError && <p className="mt-1 text-xs text-budget-critical">{nameError}</p>}
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <label className="block text-sm font-medium text-text">Period</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(PERIOD_LABELS) as BudgetCalcPeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setData((prev) => ({ ...prev, periodType: p }))}
              className={`rounded-md px-3 py-1.5 text-sm ${
                data.periodType === p
                  ? "bg-primary text-white"
                  : "border border-border text-text hover:bg-surface-muted"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {data.periodType === "custom" && (
          <div className="mt-3 flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted">From</label>
              <input
                type="date"
                value={data.customFrom ?? ""}
                onChange={(e) => setData((prev) => ({ ...prev, customFrom: e.target.value }))}
                className="mt-1 rounded-md border border-border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted">To</label>
              <input
                type="date"
                value={data.customTo ?? ""}
                onChange={(e) => setData((prev) => ({ ...prev, customTo: e.target.value }))}
                className="mt-1 rounded-md border border-border px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Budget line items</h2>
          <button
            onClick={addLineItem}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted"
          >
            <Plus size={14} /> Add item
          </button>
        </div>

        {data.lineItems.length === 0 ? (
          <p className="text-sm text-text-muted">No budget items yet.</p>
        ) : (
          <div className="space-y-2">
            {data.lineItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 items-center gap-2">
                <input
                  type="text"
                  placeholder="Category"
                  value={item.category}
                  onChange={(e) => updateLineItem(item.id, { category: e.target.value })}
                  className="col-span-7 rounded-md border border-border px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={item.amount || ""}
                  onChange={(e) => updateLineItem(item.id, { amount: Number(e.target.value) || 0 })}
                  className="col-span-4 rounded-md border border-border px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => removeLineItem(item.id)}
                  aria-label="Remove line item"
                  className="col-span-1 text-text-faint hover:text-budget-critical"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Total budgeted</h2>
          <span className="text-lg font-semibold text-primary">{formatInr(total)}</span>
        </div>
        <p className="mt-2 text-xs text-text-faint">
          Comparing against your actual spend from Transactions is coming in a future update.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving || !isFormValid}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {isSaving && (
          <Spinner />
        )}
        {isSaving ? "Saving..." : "Save"}
      </button>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this calculator?"
        description={`"${name}" will be permanently removed.`}
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
