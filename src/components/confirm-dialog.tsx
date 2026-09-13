"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            onClick={onCancel}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="fixed inset-x-4 top-1/2 z-[61] mx-auto max-w-sm -translate-y-1/2 rounded-xl border border-border bg-surface-card p-5 shadow-2xl"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
          >
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-text">
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-sm text-text-muted">{description}</p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isConfirming}
                className="rounded-md px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-muted disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isConfirming}
                className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  isDestructive
                    ? "bg-budget-critical hover:opacity-90"
                    : "bg-primary hover:bg-primary-hover"
                }`}
              >
                {isConfirming ? "Please wait..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
