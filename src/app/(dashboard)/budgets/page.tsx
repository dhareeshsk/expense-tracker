"use client";

import { useEffect, useMemo, useState } from "react";
import type { Budget, Category } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { resolveIcon } from "@/lib/icon-map";
import { Spinner } from "@/components/spinner";

function progressColor(ratio: number) {
  if (ratio >= 1) return "#e34948";
  if (ratio >= 0.8) return "#eda100";
  return "#1baf7a";
}

type FieldErrors = {
  categoryId?: string;
  monthlyLimit?: string;
  alertThreshold?: string;
};

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("80");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  const isFormValid = useMemo(() => {
    const parsedLimit = Number(monthlyLimit);
    const parsedThreshold = Number(alertThreshold);
    return (
      categoryId.length > 0 &&
      monthlyLimit.trim().length > 0 &&
      Number.isFinite(parsedLimit) &&
      parsedLimit > 0 &&
      alertThreshold.trim().length > 0 &&
      Number.isInteger(parsedThreshold) &&
      parsedThreshold >= 1 &&
      parsedThreshold <= 200
    );
  }, [categoryId, monthlyLimit, alertThreshold]);

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

  function resetForm() {
    setEditingId(null);
    setMonthlyLimit("");
    setAlertThreshold("80");
    setFieldErrors({});
    setError(null);
  }

  function startEdit(budget: Budget) {
    setEditingId(budget.id);
    setCategoryId(budget.categoryId);
    setMonthlyLimit(String(budget.monthlyLimit));
    setAlertThreshold(String(budget.alertThreshold));
    setFieldErrors({});
    setError(null);
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const parsedLimit = Number(monthlyLimit);
    const parsedThreshold = Number(alertThreshold);

    if (!categoryId) {
      errors.categoryId = "Please select a category";
    }
    if (!monthlyLimit.trim()) {
      errors.monthlyLimit = "Monthly limit is required";
    } else if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      errors.monthlyLimit = "Monthly limit must be greater than 0";
    }
    if (!alertThreshold.trim()) {
      errors.alertThreshold = "Alert threshold is required";
    } else if (!Number.isInteger(parsedThreshold)) {
      errors.alertThreshold = "Alert threshold must be a whole number";
    } else if (parsedThreshold < 1 || parsedThreshold > 200) {
      errors.alertThreshold = "Alert threshold must be between 1% and 200%";
    }
    return errors;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const payload = {
      categoryId,
      monthlyLimit: Number(monthlyLimit),
      alertThreshold: Number(alertThreshold),
    };

    const response = await fetch(
      editingId ? `/api/budgets/${editingId}` : "/api/budgets",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Something went wrong";
      setError(message);
      toast.error(message);
      return;
    }

    const wasEditing = Boolean(editingId);
    resetForm();
    await loadAll();
    toast.success(wasEditing ? "Budget updated" : "Budget created");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const response = await fetch(`/api/budgets/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setIsDeleting(false);

    if (!response.ok) {
      setError("Could not delete budget");
      toast.error("Could not delete budget");
      setDeleteTarget(null);
      return;
    }
    if (editingId === deleteTarget.id) {
      resetForm();
    }
    setDeleteTarget(null);
    await loadAll();
    toast.success("Budget deleted");
  }

  const categoriesWithoutBudget = categories.filter(
    (category) => !budgets.some((budget) => budget.categoryId === category.id),
  );
  const categoryOptions = editingId
    ? categories
    : categoriesWithoutBudget.length > 0
      ? categoriesWithoutBudget
      : categories;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text">Budgets</h1>
        <p className="text-sm text-text-muted">
          Set a monthly spending limit per category and get warned as you approach it.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        noValidate
        className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-surface-card p-4"
      >
        <div>
          <label className="block text-sm font-medium text-text">Category</label>
          <select
            value={categoryId}
            disabled={editingId !== null}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
            }}
            className="mt-1 rounded-md border border-border px-2 py-2 text-sm disabled:opacity-60"
          >
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && (
            <p className="mt-1 text-xs text-budget-critical">{fieldErrors.categoryId}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text">
            Monthly limit (INR)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={monthlyLimit}
            onChange={(e) => {
              setMonthlyLimit(e.target.value);
              setFieldErrors((prev) => ({ ...prev, monthlyLimit: undefined }));
            }}
            className="mt-1 w-40 rounded-md border border-border px-2 py-2 text-sm"
          />
          {fieldErrors.monthlyLimit && (
            <p className="mt-1 text-xs text-budget-critical">{fieldErrors.monthlyLimit}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text">Alert at (%)</label>
          <input
            type="number"
            min="1"
            max="200"
            value={alertThreshold}
            onChange={(e) => {
              setAlertThreshold(e.target.value);
              setFieldErrors((prev) => ({ ...prev, alertThreshold: undefined }));
            }}
            className="mt-1 w-24 rounded-md border border-border px-2 py-2 text-sm"
          />
          {fieldErrors.alertThreshold && (
            <p className="mt-1 text-xs text-budget-critical">{fieldErrors.alertThreshold}</p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-6">
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting && (
              <Spinner />
            )}
            {isSubmitting
              ? "Saving..."
              : editingId
                ? "Save changes"
                : "Save budget"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-text-muted hover:underline"
            >
              Cancel edit
            </button>
          )}
        </div>

        {error && <p className="w-full text-sm text-budget-critical">{error}</p>}
      </form>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : budgets.length === 0 ? (
        <p className="text-sm text-text-muted">No budgets set yet.</p>
      ) : (
        <ul className="space-y-3">
          {budgets.map((budget) => {
            const limit = Number(budget.monthlyLimit);
            const ratio = limit > 0 ? budget.spent / limit : 0;
            const pct = Math.min(ratio * 100, 100);
            const overAlert = ratio * 100 >= budget.alertThreshold;
            const CategoryIcon = resolveIcon(budget.category.icon);

            return (
              <li
                key={budget.id}
                className={`rounded-lg border border-border p-4 ${
                  editingId === budget.id ? "bg-surface-muted" : "bg-surface-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon
                      size={16}
                      style={{ color: budget.category.color ?? "#6b7280" }}
                    />
                    <span className="text-sm font-medium text-text">
                      {budget.category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-muted">
                      ₹{budget.spent.toLocaleString("en-IN")} / ₹
                      {limit.toLocaleString("en-IN")}
                    </span>
                    <button
                      onClick={() => startEdit(budget)}
                      className="text-sm text-text-muted hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(budget)}
                      className="text-sm text-budget-critical hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this budget?"
        description={
          deleteTarget
            ? `The budget for ${deleteTarget.category.name} will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
