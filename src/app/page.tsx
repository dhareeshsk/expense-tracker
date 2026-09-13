import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

const FEATURES = [
  {
    title: "Categorized tracking",
    body: "Log income, expenses, and investments with custom categories and colors.",
  },
  {
    title: "Budget alerts",
    body: "Set a monthly limit per category and get warned before you go over.",
  },
  {
    title: "Shared expenses",
    body: "Split select bills — rent, EMI, groceries — with a household, without sharing everything.",
  },
  {
    title: "Install as an app",
    body: "Add it to your home screen and use it like a native app, online or off.",
  },
];

const STEPS = [
  { step: "1", label: "Sign up", body: "Create a free account in seconds." },
  { step: "2", label: "Log transactions", body: "Add income, expenses, and investments as they happen." },
  { step: "3", label: "See your dashboard", body: "Track spend by category, month, and household." },
];

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Track income, expenses, and shared bills - in one place
        </h1>
        <p className="mt-4 max-w-xl text-base text-text-muted">
          A simple, private way to see where your money goes each month, set
          budgets that actually warn you, and split shared costs with family
          or roommates.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Sign up free
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border px-6 py-3 text-sm font-semibold text-text hover:bg-surface-muted"
          >
            Log in
          </Link>
        </div>
        <Link
          href="/tools/calculators"
          className="mt-4 text-sm text-text-muted underline hover:text-primary"
        >
          Or try our free calculators — no signup needed
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-border bg-surface-card p-5"
          >
            <h3 className="text-sm font-semibold text-text">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm text-text-muted">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="py-12">
        <h2 className="text-center text-lg font-semibold text-text">
          How it works
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                {s.step}
              </div>
              <p className="mt-3 text-sm font-medium text-text">{s.label}</p>
              <p className="mt-1 text-sm text-text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-center py-16 text-center">
        <h2 className="text-xl font-semibold text-text">
          Ready to see where your money goes?
        </h2>
        <Link
          href="/signup"
          className="mt-5 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Sign up free
        </Link>
      </section>
    </div>
  );
}
