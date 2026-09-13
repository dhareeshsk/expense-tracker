"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Household, Transaction, TransactionType } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { resolveIcon } from "@/lib/icon-map";
import { Spinner } from "@/components/spinner";

const PAGE_SIZE = 20;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type FieldErrors = {
  transactionTypeId?: string;
  amount?: string;
  categoryId?: string;
  date?: string;
  paymentMethod?: string;
};

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} cols={6} />}>
      <TransactionsPageContent />
    </Suspense>
  );
}

function TransactionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<string>(
    () => searchParams.get("transactionTypeId") ?? "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    () => searchParams.get("categoryId") ?? "all",
  );
  const [dateFrom, setDateFrom] = useState<string | null>(() => searchParams.get("from"));
  const [dateTo, setDateTo] = useState<string | null>(() => searchParams.get("to"));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [transactionTypeId, setTransactionTypeId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [householdId, setHouseholdId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  const isFormValid = useMemo(() => {
    const parsedAmount = Number(amount);
    return (
      transactionTypeId.length > 0 &&
      amount.trim().length > 0 &&
      Number.isFinite(parsedAmount) &&
      parsedAmount > 0 &&
      categoryId.length > 0 &&
      date.length > 0 &&
      paymentMethod.trim().length > 0
    );
  }, [transactionTypeId, amount, categoryId, date, paymentMethod]);

  async function loadAll(targetPage = page) {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("transactionTypeId", typeFilter);
    if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (search.trim()) params.set("q", search.trim());
    params.set("page", String(targetPage));
    params.set("pageSize", String(PAGE_SIZE));

    const [txRes, catRes, householdRes, typeRes] = await Promise.all([
      fetch(`/api/transactions?${params.toString()}`),
      fetch("/api/categories"),
      fetch("/api/households"),
      fetch("/api/transaction-types"),
    ]);
    const [txData, catData, householdData, typeData] = await Promise.all([
      txRes.json(),
      catRes.json(),
      householdRes.json(),
      typeRes.json(),
    ]);
    setTransactions(txData.transactions ?? []);
    setPage(txData.page ?? 1);
    setTotalPages(txData.totalPages ?? 1);
    setCategories(catData);
    setHouseholds(householdData);
    setTransactionTypes(typeData);
    if (!categoryId && catData.length > 0) {
      setCategoryId(catData[0].id);
    }
    if (!transactionTypeId && typeData.length > 0) {
      setTransactionTypeId(typeData[0].id);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when filters change
    loadAll(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAll is stable for this component's lifetime
  }, [typeFilter, categoryFilter, search, dateFrom, dateTo]);

  function clearDateFilter() {
    setDateFrom(null);
    setDateTo(null);
    router.replace("/transactions");
  }

  function resetForm() {
    setEditingId(null);
    setTransactionTypeId(
      transactionTypes.find((t) => t.name === "Expense")?.id ??
        transactionTypes[0]?.id ??
        "",
    );
    setAmount("");
    setDate(todayIso());
    setNote("");
    setPaymentMethod("");
    setHouseholdId("");
    setFieldErrors({});
    setError(null);
  }

  function startEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setTransactionTypeId(transaction.transactionTypeId);
    setAmount(String(transaction.amount));
    setCategoryId(transaction.categoryId);
    setDate(transaction.date.slice(0, 10));
    setNote(transaction.note ?? "");
    setPaymentMethod(transaction.paymentMethod ?? "");
    setHouseholdId(transaction.householdId ?? "");
    setFieldErrors({});
    setError(null);
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const parsedAmount = Number(amount);

    if (!transactionTypeId) {
      errors.transactionTypeId = "Please select a transaction type";
    }
    if (!amount.trim()) {
      errors.amount = "Amount is required";
    } else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.amount = "Amount must be greater than 0";
    }
    if (!categoryId) {
      errors.categoryId = "Please select a category";
    }
    if (!date) {
      errors.date = "Date is required";
    }
    if (!paymentMethod.trim()) {
      errors.paymentMethod = "Payment method is required";
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const payload = {
      transactionTypeId,
      amount: Number(amount),
      categoryId,
      date,
      note: note.trim() || null,
      paymentMethod: paymentMethod.trim(),
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
      const message = body?.error ?? "Something went wrong";
      setError(message);
      toast.error(message);
      return;
    }

    const wasEditing = Boolean(editingId);
    resetForm();
    await loadAll(1);
    toast.success(wasEditing ? "Transaction updated" : "Transaction added");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const response = await fetch(`/api/transactions/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setIsDeleting(false);

    if (!response.ok) {
      setError("Could not delete transaction");
      toast.error("Could not delete transaction");
      setDeleteTarget(null);
      return;
    }
    if (editingId === deleteTarget.id) {
      resetForm();
    }
    setDeleteTarget(null);
    await loadAll(page);
    toast.success("Transaction deleted");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text">Transactions</h1>
        <p className="text-sm text-text-muted">
          Log income, expenses, and investments.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface-card p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div>
          <label className="block text-sm font-medium text-text">Type</label>
          <select
            value={transactionTypeId}
            onChange={(e) => {
              setTransactionTypeId(e.target.value);
              setFieldErrors((prev) => ({ ...prev, transactionTypeId: undefined }));
            }}
            className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
          >
            {transactionTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {fieldErrors.transactionTypeId && (
            <p className="mt-1 text-xs text-budget-critical">{fieldErrors.transactionTypeId}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text">
            Amount (INR)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setFieldErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
          />
          {fieldErrors.amount && (
            <p className="mt-1 text-xs text-budget-critical">{fieldErrors.amount}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
            }}
            className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
          >
            {categories.map((category) => (
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
          <label className="block text-sm font-medium text-text">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setFieldErrors((prev) => ({ ...prev, date: undefined }));
            }}
            className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
          />
          {fieldErrors.date && (
            <p className="mt-1 text-xs text-budget-critical">{fieldErrors.date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text">
            Payment method
          </label>
          <input
            type="text"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setFieldErrors((prev) => ({ ...prev, paymentMethod: undefined }));
            }}
            placeholder="UPI, card..."
            className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
          />
          {fieldErrors.paymentMethod && (
            <p className="mt-1 text-xs text-budget-critical">{fieldErrors.paymentMethod}</p>
          )}
        </div>

        {households.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-text">
              Shared with
            </label>
            <select
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
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
          <label className="block text-sm font-medium text-text">Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-6">
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting && (
              <Spinner />
            )}
            {isSubmitting
              ? editingId
                ? "Saving..."
                : "Adding..."
              : editingId
                ? "Save changes"
                : "Add transaction"}
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
          {error && <p className="text-sm text-budget-critical">{error}</p>}
        </div>
      </form>

      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-border px-2 py-1.5 text-sm"
        >
          <option value="all">All types</option>
          {transactionTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-border px-2 py-1.5 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search note, payment method, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
        />
      </div>

      {(dateFrom || dateTo) && (
        <div className="flex items-center gap-2 rounded-md bg-primary-soft px-3 py-2 text-sm text-primary">
          <span>
            Showing{" "}
            {dateFrom ? new Date(dateFrom).toLocaleDateString("en-IN") : "the start"} –{" "}
            {dateTo ? new Date(dateTo).toLocaleDateString("en-IN") : "now"}
            {" "}(from dashboard drill-down)
          </span>
          <button
            type="button"
            onClick={clearDateFilter}
            className="font-medium underline"
          >
            Clear
          </button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : transactions.length === 0 ? (
        <p className="text-sm text-text-muted">No transactions yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted text-left text-text-muted">
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
              <tbody className="divide-y divide-border">
                {transactions.map((transaction) => {
                  const TypeIcon = resolveIcon(transaction.transactionType.icon);
                  const CategoryIcon = resolveIcon(transaction.category.icon);
                  return (
                  <tr
                    key={transaction.id}
                    className={editingId === transaction.id ? "bg-surface-muted" : undefined}
                  >
                    <td className="px-4 py-2 text-text-muted">
                      {new Date(transaction.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-2 text-text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <TypeIcon size={14} className="text-text-faint" />
                        {transaction.transactionType.name}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <CategoryIcon
                          size={14}
                          style={{ color: transaction.category.color ?? "#6b7280" }}
                        />
                        {transaction.category.name}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-text-muted">
                      {transaction.note ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      {transaction.householdId ? (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                          {households.find((h) => h.id === transaction.householdId)?.name ??
                            "Shared"}
                        </span>
                      ) : (
                        <span className="text-xs text-text-faint">Private</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-text">
                      ₹{Number(transaction.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <button
                        onClick={() => startEdit(transaction)}
                        className="mr-3 text-sm text-text-muted hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(transaction)}
                        className="text-sm text-budget-critical hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-text-muted">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => loadAll(page - 1)}
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
                onClick={() => loadAll(page + 1)}
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this transaction?"
        description={
          deleteTarget
            ? `${deleteTarget.transactionType.name} of ₹${Number(deleteTarget.amount).toLocaleString("en-IN")} on ${new Date(deleteTarget.date).toLocaleDateString("en-IN")} will be permanently removed.`
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
