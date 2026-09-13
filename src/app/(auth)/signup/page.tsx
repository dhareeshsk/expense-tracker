"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useToast } from "@/components/toast-provider";
import { Spinner } from "@/components/spinner";

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = useMemo(
    () => /\S+@\S+\.\S+/.test(email.trim()) && password.length >= 8,
    [email, password],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Something went wrong";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Account created, but automatic login failed. Please log in.");
      router.push("/login");
      return;
    }

    toast.success("Account created");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-surface-card p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-text">Sign up</h1>
          <p className="text-sm text-text-muted">
            Create your private expense tracker account.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

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
            <label className="block text-sm font-medium text-text">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-text-faint">At least 8 characters.</p>
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
            {isSubmitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
