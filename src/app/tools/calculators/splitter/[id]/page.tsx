"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, X, Copy, Share2 } from "lucide-react";
import type { ExpenseSplitData, ExpenseSplitLineItem } from "@/lib/types";
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

const CATEGORY_SUGGESTIONS = ["Food", "Travel", "Stay", "Misc"];

function emptyData(): ExpenseSplitData {
  return { people: [], lineItems: [], advances: {}, comments: "" };
}

function newLineItemId() {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ExpenseSplitterPage({
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
  const [data, setData] = useState<ExpenseSplitData>(emptyData());
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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
        setData({ ...emptyData(), ...(local.data as ExpenseSplitData) });
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
  const perPersonShare = data.people.length > 0 ? total / data.people.length : 0;

  const perPersonBreakdown = useMemo(() => {
    return data.people.map((person) => {
      const paid = data.lineItems
        .filter((item) => item.paidBy === person)
        .reduce((sum, item) => sum + item.amount, 0);
      const advance = data.advances[person] ?? 0;
      const balance = perPersonShare - paid - advance;
      return { person, paid, advance, balance };
    });
  }, [data.people, data.lineItems, data.advances, perPersonShare]);

  const isFormValid = name.trim().length > 0 && data.people.length > 0;

  function addPerson() {
    const trimmed = newPersonName.trim();
    if (!trimmed || data.people.includes(trimmed)) return;
    setData((prev) => ({ ...prev, people: [...prev.people, trimmed] }));
    setNewPersonName("");
  }

  function removePerson(person: string) {
    setData((prev) => ({
      ...prev,
      people: prev.people.filter((p) => p !== person),
      lineItems: prev.lineItems.map((item) =>
        item.paidBy === person ? { ...item, paidBy: "" } : item,
      ),
      advances: Object.fromEntries(
        Object.entries(prev.advances).filter(([key]) => key !== person),
      ),
    }));
  }

  function addLineItem() {
    const item: ExpenseSplitLineItem = {
      id: newLineItemId(),
      amount: 0,
      category: CATEGORY_SUGGESTIONS[0],
      paidBy: data.people[0] ?? "",
    };
    setData((prev) => ({ ...prev, lineItems: [...prev.lineItems, item] }));
  }

  function updateLineItem(itemId: string, patch: Partial<ExpenseSplitLineItem>) {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function removeLineItem(itemId: string) {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== itemId),
    }));
  }

  function updateAdvance(person: string, value: number) {
    setData((prev) => ({ ...prev, advances: { ...prev.advances, [person]: value } }));
  }

  function buildSummaryText() {
    const lines = [`${name || "Expense Split"} — Total: ${formatInr(total)}`, ""];
    for (const row of perPersonBreakdown) {
      const status =
        row.balance > 0.5
          ? `owes ${formatInr(row.balance)}`
          : row.balance < -0.5
            ? `is owed ${formatInr(Math.abs(row.balance))}`
            : "is settled up";
      lines.push(`${row.person}: paid ${formatInr(row.paid)}, ${status}`);
    }
    if (data.comments.trim()) {
      lines.push("", data.comments.trim());
    }
    return lines.join("\n");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      setCopySuccess(true);
      toast.success("Summary copied to clipboard");
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      toast.error("Could not copy — clipboard access unavailable");
    }
  }

  async function handleShare() {
    const text = buildSummaryText();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text, title: name || "Expense Split" });
        return;
      } catch {
        // user canceled or share failed — fall through to WhatsApp link
      }
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSave() {
    if (!name.trim()) {
      setNameError("Calculation name is required");
      return;
    }
    if (data.people.length === 0) {
      toast.error("Add at least one person before saving");
      return;
    }
    setNameError(null);
    setIsSaving(true);

    if (!isLoggedIn) {
      const saved: LocalCalculator = saveLocalCalculator({
        id: recordId ?? undefined,
        type: "EXPENSE_SPLIT",
        name: name.trim(),
        data,
      });
      setRecordId(saved.id);
      setIsSaving(false);
      toast.success("Saved to this device");
      if (isNew) router.replace(`/tools/calculators/splitter/${saved.id}`);
      return;
    }

    const response = await fetch(
      recordId ? `/api/calculators/${recordId}` : "/api/calculators",
      {
        method: recordId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          recordId ? { name: name.trim(), data } : { type: "EXPENSE_SPLIT", name: name.trim(), data },
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
    if (isNew) router.replace(`/tools/calculators/splitter/${record.id}`);
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
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/tools/calculators" className="text-sm text-text-muted hover:underline">
            ← Calculators
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-text">Expense Splitter</h1>
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
          placeholder="Goa Trip, Flat 3B Rent..."
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
        <h2 className="mb-3 text-sm font-medium text-text">People</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {data.people.map((person) => (
            <span
              key={person}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-sm text-text"
            >
              {person}
              <button onClick={() => removePerson(person)} aria-label={`Remove ${person}`}>
                <X size={14} className="text-text-faint hover:text-budget-critical" />
              </button>
            </span>
          ))}
          {data.people.length === 0 && (
            <p className="text-sm text-text-muted">Add the people splitting this expense.</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a person..."
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPerson();
              }
            }}
            className="w-full max-w-xs rounded-md border border-border px-3 py-2 text-sm"
          />
          <button
            onClick={addPerson}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-surface-muted"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Line items</h2>
          <button
            onClick={addLineItem}
            disabled={data.people.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted disabled:opacity-40"
          >
            <Plus size={14} /> Add item
          </button>
        </div>

        {data.lineItems.length === 0 ? (
          <p className="text-sm text-text-muted">No line items yet.</p>
        ) : (
          <div className="space-y-2">
            {data.lineItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={item.amount || ""}
                  onChange={(e) => updateLineItem(item.id, { amount: Number(e.target.value) || 0 })}
                  className="col-span-3 rounded-md border border-border px-2 py-1.5 text-sm"
                />
                <input
                  type="text"
                  list="category-suggestions"
                  placeholder="Category"
                  value={item.category}
                  onChange={(e) => updateLineItem(item.id, { category: e.target.value })}
                  className="col-span-4 rounded-md border border-border px-2 py-1.5 text-sm"
                />
                <select
                  value={item.paidBy}
                  onChange={(e) => updateLineItem(item.id, { paidBy: e.target.value })}
                  className="col-span-4 rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  <option value="">Who paid?</option>
                  {data.people.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
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
        <datalist id="category-suggestions">
          {CATEGORY_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {data.people.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-card p-4">
          <h2 className="mb-3 text-sm font-medium text-text">Advance paid</h2>
          <div className="space-y-2">
            {data.people.map((person) => (
              <div key={person} className="flex items-center justify-between gap-3">
                <span className="text-sm text-text">{person}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.advances[person] || ""}
                  onChange={(e) => updateAdvance(person, Number(e.target.value) || 0)}
                  className="w-32 rounded-md border border-border px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <label className="block text-sm font-medium text-text">Other comments</label>
        <textarea
          rows={2}
          value={data.comments}
          onChange={(e) => setData((prev) => ({ ...prev, comments: e.target.value }))}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Summary</h2>
          <span className="text-lg font-semibold text-primary">{formatInr(total)}</span>
        </div>
        {data.people.length === 0 ? (
          <p className="text-sm text-text-muted">Add people to see the split.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {perPersonBreakdown.map((row) => (
              <li key={row.person} className="flex items-center justify-between">
                <span className="text-text">{row.person}</span>
                <span
                  className={
                    row.balance > 0.5
                      ? "text-budget-critical"
                      : row.balance < -0.5
                        ? "text-budget-good"
                        : "text-text-muted"
                  }
                >
                  {row.balance > 0.5
                    ? `owes ${formatInr(row.balance)}`
                    : row.balance < -0.5
                      ? `is owed ${formatInr(Math.abs(row.balance))}`
                      : "settled up"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            disabled={data.people.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted disabled:opacity-40"
          >
            <Copy size={14} /> {copySuccess ? "Copied!" : "Copy summary"}
          </button>
          <button
            onClick={handleShare}
            disabled={data.people.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted disabled:opacity-40"
          >
            <Share2 size={14} /> Share
          </button>
        </div>
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
