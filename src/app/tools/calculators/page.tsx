"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Users, Wallet, Plus, Trash2 } from "lucide-react";
import type { Calculator } from "@/lib/types";
import { listLocalCalculators, deleteLocalCalculator, type LocalCalculator } from "@/lib/local-calculators";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";

const TILES = [
  {
    type: "EXPENSE_SPLIT" as const,
    title: "Expense Splitter",
    body: "Split trips, rent, or group expenses fairly between people.",
    icon: Users,
    href: "/tools/calculators/splitter/new",
  },
  {
    type: "BUDGET" as const,
    title: "Budget Calculator",
    body: "Plan a daily, monthly, or yearly budget by category.",
    icon: Wallet,
    href: "/tools/calculators/budget/new",
  },
];

type SavedItem = { id: string; type: "EXPENSE_SPLIT" | "BUDGET"; name: string; local: boolean };

export default function CalculatorsHubPage() {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const [saved, setSaved] = useState<SavedItem[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  async function loadSaved() {
    if (isLoggedIn) {
      const res = await fetch("/api/calculators");
      const data: Calculator[] = await res.json();
      setSaved(data.map((c) => ({ id: c.id, type: c.type, name: c.name, local: false })));
    } else {
      const local: LocalCalculator[] = listLocalCalculators();
      setSaved(local.map((c) => ({ id: c.id, type: c.type, name: c.name, local: true })));
    }
  }

  useEffect(() => {
    if (status === "loading") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load, gated on session status resolving
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSaved is stable for this component's lifetime
  }, [status]);

  function editHref(item: SavedItem) {
    const base = item.type === "EXPENSE_SPLIT" ? "/tools/calculators/splitter" : "/tools/calculators/budget";
    return `${base}/${item.id}`;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    if (deleteTarget.local) {
      deleteLocalCalculator(deleteTarget.id);
      setIsDeleting(false);
      setDeleteTarget(null);
      await loadSaved();
      toast.success("Calculator deleted");
      return;
    }
    const response = await fetch(`/api/calculators/${deleteTarget.id}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!response.ok) {
      toast.error("Could not delete calculator");
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    await loadSaved();
    toast.success("Calculator deleted");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-lg font-semibold text-text">Calculators</h1>
        <p className="text-sm text-text-muted">
          Free tools for splitting expenses and planning a budget — no account needed.
          {!isLoggedIn && (
            <>
              {" "}
              <Link href="/signup" className="text-primary underline">
                Sign up
              </Link>{" "}
              to save these permanently and access them from any device.
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <Link
            key={tile.type}
            href={tile.href}
            className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-card p-5 transition-colors hover:bg-surface-muted"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <tile.icon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text">{tile.title}</h3>
              <p className="mt-1 text-sm text-text-muted">{tile.body}</p>
            </div>
          </Link>
        ))}
        {isLoggedIn && (
          <Link
            href="/tools/calculators/splitter/new"
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-5 text-text-muted transition-colors hover:border-primary hover:text-primary"
          >
            <Plus size={22} />
            <span className="text-sm font-medium">Add calculator</span>
          </Link>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-text">
          {isLoggedIn ? "Your saved calculators" : "Saved on this device"}
        </h2>
        {saved === null ? (
          <ListSkeleton rows={2} />
        ) : saved.length === 0 ? (
          <p className="text-sm text-text-muted">Nothing saved yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface-card">
            {saved.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-4 py-3">
                <Link href={editHref(item)} className="flex-1 text-sm text-text hover:underline">
                  {item.name}{" "}
                  <span className="text-text-faint">
                    ({item.type === "EXPENSE_SPLIT" ? "Expense Splitter" : "Budget Calculator"})
                  </span>
                </Link>
                <button
                  onClick={() => setDeleteTarget(item)}
                  aria-label={`Delete ${item.name}`}
                  className="text-text-faint hover:text-budget-critical"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-sm text-text-faint">
        Need a one-off, no-save quick total instead?{" "}
        <Link href="/tools/calculator" className="text-primary underline">
          Try the simple calculator
        </Link>
        .
      </p>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this calculator?"
        description={deleteTarget ? `"${deleteTarget.name}" will be permanently removed.` : undefined}
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
