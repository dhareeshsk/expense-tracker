"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import type { Category, Household, TransactionType } from "@/lib/types";
import { emitTransactionsChanged } from "@/lib/events";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useToast } from "@/components/toast-provider";
import { Spinner } from "@/components/spinner";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AddTransactionFab() {
  const [open, setOpen] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  const [categories, setCategories] = useState<Category[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);

  const [transactionTypeId, setTransactionTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [householdId, setHouseholdId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    transactionTypeId?: string;
    amount?: string;
    categoryId?: string;
    date?: string;
    paymentMethod?: string;
  }>({});
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

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/households").then((r) => r.json()),
      fetch("/api/transaction-types").then((r) => r.json()),
    ]).then(([cats, hhs, types]) => {
      setCategories(cats);
      setHouseholds(hhs);
      setTransactionTypes(types);
      setCategoryId((prev) => prev || cats[0]?.id || "");
      setTransactionTypeId(
        (prev) =>
          prev ||
          types.find((t: TransactionType) => t.name === "Expense")?.id ||
          types[0]?.id ||
          "",
      );
    });
  }, [open]);

  function reset() {
    setAmount("");
    setDate(todayIso());
    setNote("");
    setPaymentMethod("");
    setHouseholdId("");
    setError(null);
    setFieldErrors({});
  }

  function validate() {
    const errors: typeof fieldErrors = {};
    const parsedAmount = Number(amount);

    if (!transactionTypeId) errors.transactionTypeId = "Please select a transaction type";
    if (!amount.trim()) {
      errors.amount = "Amount is required";
    } else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.amount = "Amount must be greater than 0";
    }
    if (!categoryId) errors.categoryId = "Please select a category";
    if (!date) errors.date = "Date is required";
    if (!paymentMethod.trim()) errors.paymentMethod = "Payment method is required";

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
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionTypeId,
        amount: Number(amount),
        categoryId,
        date,
        note: note.trim() || null,
        paymentMethod: paymentMethod.trim(),
        householdId: householdId || null,
      }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Something went wrong";
      setError(message);
      toast.error(message);
      return;
    }

    reset();
    setOpen(false);
    emitTransactionsChanged();
    toast.success("Transaction added");
  }

  const sheetTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 38 };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileTap={reduceMotion ? undefined : { scale: 0.9 }}
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 md:bottom-6"
        aria-label="Add transaction"
      >
        <Plus size={26} strokeWidth={2.25} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-2xl border border-border bg-surface-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:rounded-2xl sm:pb-5"
              initial={{ y: "100%", opacity: reduceMotion ? 1 : 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: reduceMotion ? 1 : 0 }}
              transition={sheetTransition}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-text">
                  Add transaction
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-text-faint hover:bg-surface-muted"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted">
                      Type
                    </label>
                    <select
                      value={transactionTypeId}
                      onChange={(e) => {
                        setTransactionTypeId(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, transactionTypeId: undefined }));
                      }}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                    >
                      {transactionTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.transactionTypeId && (
                      <p className="mt-1 text-xs text-budget-critical">
                        {fieldErrors.transactionTypeId}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted">
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
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                    />
                    {fieldErrors.amount && (
                      <p className="mt-1 text-xs text-budget-critical">{fieldErrors.amount}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
                    }}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.categoryId && (
                    <p className="mt-1 text-xs text-budget-critical">{fieldErrors.categoryId}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, date: undefined }));
                      }}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                    />
                    {fieldErrors.date && (
                      <p className="mt-1 text-xs text-budget-critical">{fieldErrors.date}</p>
                    )}
                  </div>
                  {households.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-text-muted">
                        Shared with
                      </label>
                      <select
                        value={householdId}
                        onChange={(e) => setHouseholdId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                      >
                        <option value="">Private</option>
                        {households.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted">
                    Payment method
                  </label>
                  <input
                    type="text"
                    placeholder="UPI, card..."
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, paymentMethod: undefined }));
                    }}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                  />
                  {fieldErrors.paymentMethod && (
                    <p className="mt-1 text-xs text-budget-critical">
                      {fieldErrors.paymentMethod}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted">
                    Note
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                  />
                </div>

                {error && <p className="text-sm text-budget-critical">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Spinner size="md" />
                  )}
                  {isSubmitting ? "Adding..." : "Add transaction"}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
