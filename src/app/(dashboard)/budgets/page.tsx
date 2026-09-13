"use client";

import { useEffect, useState } from "react";
import type { Budget, Category } from "@/lib/types";

function progressColor(ratio: number) {
  if (ratio >= 1) return "#e34948";
  if (ratio >= 0.8) return "#eda100";
  return "#1baf7a";
}

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("80");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadAll() {
    const [catRes, budgetRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/budgets"),
    ]);
    const [catData, budgetData] = await Promise.all([
      catRes.json(),
      budgetRes.json(),
    ]);
    setCategories(catData);
    setBudgets(budgetData);
    if (!categoryId && catData.length > 0) {
      setCategoryId(catData[0].id);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load from the server
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAll is stable for this component's lifetime
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedLimit = Number(monthlyLimit);
    const parsedThreshold = Number(alertThreshold);
    if (!categoryId || !Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      setError("Enter a valid category and monthly limit");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        monthlyLimit: parsedLimit,
        alertThreshold: parsedThreshold,
      }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      return;
    }

    setMonthlyLimit("");
    await loadAll();
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Could not delete budget");
      return;
    }
    await loadAll();
  }

  const categoriesWithoutBudget = categories.filter(
    (category) => !budgets.some((budget) => budget.categoryId === category.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Budgets</h1>
        <p className="text-sm text-gray-500">
          Set a monthly spending limit per category and get warned as you approach it.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-2 py-2 text-sm"
          >
            {(categoriesWithoutBudget.length > 0
              ? categoriesWithoutBudget
              : categories
            ).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Monthly limit (INR)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            className="mt-1 w-40 rounded-md border border-gray-300 px-2 py-2 text-sm"
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
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(e.target.value)}
            className="mt-1 w-24 rounded-md border border-gray-300 px-2 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Save budget
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : budgets.length === 0 ? (
        <p className="text-sm text-gray-500">No budgets set yet.</p>
      ) : (
        <ul className="space-y-3">
          {budgets.map((budget) => {
            const limit = Number(budget.monthlyLimit);
            const ratio = limit > 0 ? budget.spent / limit : 0;
            const pct = Math.min(ratio * 100, 100);
            const overAlert = ratio * 100 >= budget.alertThreshold;

            return (
              <li
                key={budget.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: budget.category.color ?? "#6b7280" }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {budget.category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      ₹{budget.spent.toLocaleString("en-IN")} / ₹
                      {limit.toLocaleString("en-IN")}
                    </span>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: progressColor(ratio),
                    }}
                  />
                </div>

                {overAlert && (
                  <p
                    className="mt-2 text-xs font-medium"
                    style={{ color: progressColor(ratio) }}
                  >
                    {ratio >= 1
                      ? `Over budget by ₹${(budget.spent - limit).toLocaleString("en-IN")}`
                      : `${Math.round(ratio * 100)}% of limit used`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
