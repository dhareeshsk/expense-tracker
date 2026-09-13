"use client";

import { useId, useMemo, useState } from "react";

const CATEGORIES = [
  "Uncategorized",
  "EMI",
  "Groceries",
  "Travel",
  "Credit Card Bills",
  "Utilities",
  "Others",
];

type LineItem = {
  id: string;
  label: string;
  amount: string;
  category: string;
};

function newItem(): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    label: "",
    amount: "",
    category: CATEGORIES[0],
  };
}

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ExpenseCalculatorPage() {
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const headingId = useId();

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [items],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const amount = Number(item.amount) || 0;
      if (amount <= 0) continue;
      map.set(item.category, (map.get(item.category) ?? 0) + amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(id: string) {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((item) => item.id !== id),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function clearAll() {
    setItems([newItem()]);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 id={headingId} className="text-lg font-semibold text-text">
        Expense calculator
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        Add up a quick list of costs — nothing here is saved. Refreshing
        clears it. Want it saved instead? Sign up and add it as a real
        transaction.
      </p>

      <div className="mt-6 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-card p-3 sm:grid-cols-[1fr_140px_140px_auto] sm:items-center"
          >
            <input
              type="text"
              placeholder="Item"
              value={item.label}
              onChange={(e) => updateItem(item.id, { label: e.target.value })}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={item.amount}
              onChange={(e) => updateItem(item.id, { amount: e.target.value })}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <select
              value={item.category}
              onChange={(e) => updateItem(item.id, { category: e.target.value })}
              className="rounded-md border border-border px-2 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeItem(item.id)}
              disabled={items.length === 1}
              className="justify-self-start text-sm text-accent hover:underline disabled:opacity-30 sm:justify-self-center"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          onClick={addItem}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
        >
          + Add item
        </button>
        <button
          onClick={clearAll}
          className="rounded-md px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-muted"
        >
          Clear all
        </button>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface-card p-5">
        <p className="text-sm text-text-muted">Total</p>
        <p className="mt-1 text-2xl font-semibold text-primary">
          {formatInr(total)}
        </p>

        {byCategory.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-border pt-4">
            {byCategory.map(([category, amount]) => (
              <div
                key={category}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text-muted">{category}</span>
                <span className="font-medium text-text">
                  {formatInr(amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
