"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useToast } from "@/components/toast-provider";
import { Spinner } from "@/components/spinner";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const isFormValid = useMemo(
    () => /\S+@\S+\.\S+/.test(email.trim()) && password.length > 0,
    [email, password],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password");
      toast.error("Invalid email or password");
      return;
    }

    router.push(searchParams.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-surface-card p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-text">Log in</h1>
          <p className="text-sm text-text-muted">
            Track your income, expenses, and investments.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
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
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
