"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

type ToastKind = "success" | "error";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const reduceMotion = usePrefersReducedMotion();

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: reduceMotion ? 0 : -16, scale: reduceMotion ? 1 : 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -12, scale: reduceMotion ? 1 : 0.95 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border p-3 shadow-lg ${
                toast.kind === "success"
                  ? "border-budget-good/30 bg-budget-good-soft text-budget-good"
                  : "border-budget-critical/30 bg-budget-critical-soft text-budget-critical"
              }`}
              role="status"
            >
              {toast.kind === "success" ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              ) : (
                <XCircle size={18} className="mt-0.5 shrink-0" />
              )}
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="shrink-0 opacity-70 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
