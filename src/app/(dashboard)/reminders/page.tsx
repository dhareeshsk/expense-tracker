"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Clock } from "lucide-react";
import type { Reminder, RecurrenceInterval } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { Spinner } from "@/components/spinner";

const PAGE_SIZE = 20;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(reminder: Reminder) {
  return reminder.status === "PENDING" && reminder.dueDate.slice(0, 10) < todayIso();
}

type FieldErrors = {
  label?: string;
  category?: string;
  amount?: string;
  dueDate?: string;
  recurrenceInterval?: string;
  customIntervalDays?: string;
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const toast = useToast();

  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>("MONTHLY");
  const [customIntervalDays, setCustomIntervalDays] = useState("30");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  async function loadAll(targetPage = page) {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", String(targetPage));
    params.set("pageSize", String(PAGE_SIZE));

    const res = await fetch(`/api/reminders?${params.toString()}`);
    const data = await res.json();
    setReminders(data.reminders ?? []);
    setPage(data.page ?? 1);
    setTotalPages(data.totalPages ?? 1);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when the status filter changes
    loadAll(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAll is stable for this component's lifetime
  }, [statusFilter]);

  const isFormValid = useMemo(() => {
    const parsedAmount = Number(amount);
    const baseValid =
      label.trim().length > 0 &&
      category.trim().length > 0 &&
      amount.trim().length > 0 &&
      Number.isFinite(parsedAmount) &&
      parsedAmount > 0 &&
      dueDate.length > 0;
    if (!baseValid) return false;
    if (!isRecurring) return true;
    if (recurrenceInterval === "CUSTOM_DAYS") {
      const days = Number(customIntervalDays);
      return Number.isInteger(days) && days > 0;
    }
    return true;
  }, [label, category, amount, dueDate, isRecurring, recurrenceInterval, customIntervalDays]);

  function resetForm() {
    setLabel("");
    setCategory("");
    setAmount("");
    setDueDate(todayIso());
    setIsRecurring(false);
    setRecurrenceInterval("MONTHLY");
    setCustomIntervalDays("30");
    setFieldErrors({});
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const parsedAmount = Number(amount);

    if (!label.trim()) errors.label = "Label is required";
    if (!category.trim()) errors.category = "Category is required";
    if (!amount.trim()) {
      errors.amount = "Amount is required";
    } else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.amount = "Amount must be greater than 0";
    }
    if (!dueDate) errors.dueDate = "Due date is required";
    if (isRecurring && recurrenceInterval === "CUSTOM_DAYS") {
      const days = Number(customIntervalDays);
      if (!Number.isInteger(days) || days <= 0) {
        errors.customIntervalDays = "Enter how many days between repeats";
      }
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    const response = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim(),
        category: category.trim(),
        amount: Number(amount),
        dueDate,
        isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : null,
        customIntervalDays:
          isRecurring && recurrenceInterval === "CUSTOM_DAYS" ? Number(customIntervalDays) : null,
      }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Something went wrong");
      return;
    }

    resetForm();
    await loadAll(1);
    toast.success("Reminder added");
  }

  async function markPaid(reminder: Reminder) {
    setMarkingPaidId(reminder.id);
    const response = await fetch(`/api/reminders/${reminder.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    setMarkingPaidId(null);

    if (!response.ok) {
      toast.error("Could not update reminder");
      return;
    }
    await loadAll(page);
    toast.success(
      reminder.isRecurring ? "Marked paid — next occurrence scheduled" : "Marked paid",
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const response = await fetch(`/api/reminders/${deleteTarget.id}`, { method: "DELETE" });
    setIsDeleting(false);

    if (!response.ok) {
      toast.error("Could not delete reminder");
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    await loadAll(page);
    toast.success("Reminder deleted");
  }

  function statusBadge(reminder: Reminder) {
    if (reminder.status === "PAID") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-budget-good-soft px-2 py-0.5 text-xs font-medium text-budget-good">
          <CheckCircle2 size={12} /> Paid
        </span>
      );
    }
    if (reminder.status === "MISSED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-budget-critical-soft px-2 py-0.5 text-xs font-medium text-budget-critical">
          <AlertTriangle size={12} /> Missed
        </span>
      );
    }
    if (isOverdue(reminder)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-budget-warn-soft px-2 py-0.5 text-xs font-medium text-budget-warn">
          <AlertTriangle size={12} /> Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted">
        <Clock size={12} /> Pending
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text">Reminders</h1>
        <p className="text-sm text-text-muted">
          Track recurring or one-off obligations — EMI, electricity, rent, credit card dues.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label className="block text-sm font-medium text-text">Label</label>
          <input
            type="text"
            placeholder="Electricity bill, Home loan EMI..."
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setFieldErrors((prev) => ({ ...prev, label: undefined }));
            }}
            className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
          />
          {fieldErrors.label && (
            <p className="mt-1 text-xs text-budget-critical">{fieldErrors.label}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text">Category</label>
          <input
            type="text"
            placeholder="Utilities, Loan..."
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setFieldErrors((prev) => ({ ...prev, category: undefined }));
            }}
            className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
          />
          {fieldErrors.category && (
            <p className="mt-1 text-xs text-budget-critical">{fieldErrors.category}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text">Amount (INR)</label>
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
          <label className="block text-sm font-medium text-text">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              setFieldErrors((prev) => ({ ...prev, dueDate: undefined }));
            }}
            className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
          />
          {fieldErrors.dueDate && (
            <p className="mt-1 text-xs text-budget-critical">{fieldErrors.dueDate}</p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
          <input
            type="checkbox"
            id="isRecurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="isRecurring" className="text-sm text-text">
            This repeats
          </label>
        </div>

        {isRecurring && (
          <>
            <div>
              <label className="block text-sm font-medium text-text">Repeats every</label>
              <select
                value={recurrenceInterval}
                onChange={(e) => {
                  setRecurrenceInterval(e.target.value as RecurrenceInterval);
                  setFieldErrors((prev) => ({ ...prev, recurrenceInterval: undefined }));
                }}
                className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
              >
                <option value="WEEKLY">Week</option>
                <option value="MONTHLY">Month</option>
                <option value="CUSTOM_DAYS">Custom (days)</option>
              </select>
            </div>
            {recurrenceInterval === "CUSTOM_DAYS" && (
              <div>
                <label className="block text-sm font-medium text-text">Every N days</label>
                <input
                  type="number"
                  min="1"
                  value={customIntervalDays}
                  onChange={(e) => {
                    setCustomIntervalDays(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, customIntervalDays: undefined }));
                  }}
                  className="mt-1 w-full rounded-md border border-border px-2 py-2 text-sm"
                />
                {fieldErrors.customIntervalDays && (
                  <p className="mt-1 text-xs text-budget-critical">
                    {fieldErrors.customIntervalDays}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting && (
              <Spinner />
            )}
            {isSubmitting ? "Adding..." : "Add reminder"}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border px-2 py-1.5 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="MISSED">Missed</option>
        </select>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : reminders.length === 0 ? (
        <p className="text-sm text-text-muted">No reminders yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface-card">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Bell size={16} className="text-text-faint" />
                  <div>
                    <p className="text-sm font-medium text-text">
                      {reminder.label}{" "}
                      <span className="text-text-faint">({reminder.category})</span>
                    </p>
                    <p className="text-xs text-text-muted">
                      Due {new Date(reminder.dueDate).toLocaleDateString("en-IN")}
                      {reminder.isRecurring && " · repeats"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(reminder)}
                  <span className="text-sm font-medium text-text">
                    ₹{Number(reminder.amount).toLocaleString("en-IN")}
                  </span>
                  {reminder.status === "PENDING" && (
                    <button
                      onClick={() => markPaid(reminder)}
                      disabled={markingPaidId === reminder.id}
                      className="text-sm text-primary hover:underline disabled:opacity-50"
                    >
                      {markingPaidId === reminder.id ? "Saving..." : "Mark paid"}
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(reminder)}
                    className="text-sm text-budget-critical hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

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
        title="Delete this reminder?"
        description={deleteTarget ? `"${deleteTarget.label}" will be permanently removed.` : undefined}
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
