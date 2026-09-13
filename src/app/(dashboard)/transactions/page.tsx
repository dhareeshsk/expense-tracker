"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, Household, Transaction, TransactionType } from "@/lib/types";

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  investment: "Investment",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [householdId, setHouseholdId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadAll() {
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (categoryFilter !== "all") params.set("categoryId", categoryFilter);

    const [txRes, catRes, householdRes] = await Promise.all([
      fetch(`/api/transactions?${params.toString()}`),
      fetch("/api/categories"),
      fetch("/api/households"),
    ]);
    const [txData, catData, householdData] = await Promise.all([
      txRes.json(),
      catRes.json(),
      householdRes.json(),
    ]);
    setTransactions(txData);
    setCategories(catData);
    setHouseholds(householdData);
    if (!categoryId && catData.length > 0) {
      setCategoryId(catData[0].id);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when filters change
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAll is stable for this component's lifetime
  }, [typeFilter, categoryFilter]);

  function resetForm() {
    setEditingId(null);
    setType("expense");
    setAmount("");
    setDate(todayIso());
    setNote("");
    setPaymentMethod("");
    setHouseholdId("");
  }

  function startEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setCategoryId(transaction.categoryId);
    setDate(transaction.date.slice(0, 10));
    setNote(transaction.note ?? "");
    setPaymentMethod(transaction.paymentMethod ?? "");
    setHouseholdId(transaction.householdId ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!categoryId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount and category");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      type,
      amount: parsedAmount,
      categoryId,
      date,
      note: note || null,
      paymentMethod: paymentMethod || null,
      householdId: householdId || null,
    };

    const response = await fetch(
      editingId ? `/api/transactions/${editingId}` : "/api/transactions",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      return;
    }

    resetForm();
    await loadAll();
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/transactions/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      alert("Could not delete transaction");
      return;
    }
    if (editingId === id) {
      resetForm();
    }
    await loadAll();
  }

  const categoryOptionsForType = useMemo(() => categories, [categories]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500">
          Log income, expenses, and investments.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Amount (INR)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
          >
            {categoryOptionsForType.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Payment method
          </label>
          <input
            type="text"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="UPI, card..."
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
          />
        </div>

        {households.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Shared with
            </label>
            <select
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">Private (only me)</option>
              {households.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Note
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {editingId ? "Save changes" : "Add transaction"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancel edit
            </button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </form>

      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as TransactionType | "all")
          }
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-gray-500">No transactions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Note</th>
                <th className="px-4 py-2 font-medium">Shared</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={
                    editingId === transaction.id ? "bg-gray-50" : undefined
                  }
                >
                  <td className="px-4 py-2 text-gray-700">
                    {new Date(transaction.date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-2 capitalize text-gray-700">
                    {transaction.type}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            transaction.category.color ?? "#6b7280",
                        }}
                      />
                      {transaction.category.name}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {transaction.note ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {transaction.householdId ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {households.find((h) => h.id === transaction.householdId)
                          ?.name ?? "Shared"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Private</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    ₹{Number(transaction.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <button
                      onClick={() => startEdit(transaction)}
                      className="mr-3 text-sm text-gray-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
