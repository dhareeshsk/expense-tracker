"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/spinner";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const isFormValid = useMemo(
    () => newPassword.length >= 8 && confirmPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (confirmPassword !== newPassword) {
      setConfirmError("Passwords do not match");
      return;
    }
    setConfirmError(null);

    setIsSubmitting(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-surface-card p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-text">Set a new password</h1>
        </div>

        {done ? (
          <p className="text-sm text-budget-good">
            Password updated. Redirecting to login...
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-text-faint">At least 8 characters.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmError(null);
                }}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              {confirmError && (
                <p className="mt-1 text-xs text-budget-critical">{confirmError}</p>
              )}
            </div>
            {error && <p className="text-sm text-budget-critical">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting && (
                <Spinner />
              )}
              {isSubmitting ? "Saving..." : "Set new password"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-text-muted">
          <Link href="/login" className="font-medium text-primary underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
