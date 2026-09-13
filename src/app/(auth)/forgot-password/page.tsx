"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await response.json().catch(() => null);
    setIsSubmitting(false);
    setMessage(body?.message ?? "If that email has an account, a reset link has been sent.");
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-surface-card p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-text">Forgot password</h1>
          <p className="text-sm text-text-muted">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {message ? (
          <p className="text-sm text-text-muted">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting && (
                <Spinner />
              )}
              {isSubmitting ? "Sending..." : "Send reset link"}
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
