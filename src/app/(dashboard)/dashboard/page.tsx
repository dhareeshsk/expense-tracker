"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Budget } from "@/lib/types";

type Summary = {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  totalInvestment: number;
  netBalance: number;
  expenseByCategory: { name: string; color: string | null; total: number }[];
  monthlyTrend: {
    year: number;
    month: number;
    income: number;
    expense: number;
    investment: number;
  }[];
};

const SERIES_COLORS = {
  income: "#2a78d6",
  expense: "#eb6834",
  investment: "#1baf7a",
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    fetch("/api/dashboard-summary")
      .then((res) => res.json())
      .then(setSummary);
    fetch("/api/budgets")
      .then((res) => res.json())
      .then(setBudgets);
  }, []);

  if (!summary) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  const alerts = budgets
    .map((budget) => {
      const limit = Number(budget.monthlyLimit);
      const ratio = limit > 0 ? budget.spent / limit : 0;
      return { budget, ratio };
    })
    .filter(({ ratio, budget }) => ratio * 100 >= budget.alertThreshold)
    .sort((a, b) => b.ratio - a.ratio);

  const trendData = summary.monthlyTrend.map((entry) => ({
    label: MONTH_LABELS[entry.month],
    income: entry.income,
    expense: entry.expense,
    investment: entry.investment,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {MONTH_LABELS[summary.month]} {summary.year} overview
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(({ budget, ratio }) => {
            const isOver = ratio >= 1;
            return (
              <div
                key={budget.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                  isOver
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <span>
                  {isOver ? "Over budget: " : "Approaching limit: "}
                  <span className="font-medium">{budget.category.name}</span>{" "}
                  — ₹{budget.spent.toLocaleString("en-IN")} of ₹
                  {Number(budget.monthlyLimit).toLocaleString("en-IN")} (
                  {Math.round(ratio * 100)}%)
                </span>
                <Link href="/budgets" className="font-medium underline">
                  Manage
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Income" value={summary.totalIncome} tone="income" />
        <SummaryCard
          label="Expenses"
          value={summary.totalExpense}
          tone="expense"
        />
        <SummaryCard
          label="Invested"
          value={summary.totalInvestment}
          tone="investment"
        />
        <SummaryCard
          label="Net balance"
          value={summary.netBalance}
          tone={summary.netBalance >= 0 ? "income" : "expense"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-medium text-gray-900">
            Expense breakdown by category
          </h2>
          {summary.expenseByCategory.length === 0 ? (
            <p className="text-sm text-gray-500">No expenses this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={summary.expenseByCategory}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {summary.expenseByCategory.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color ?? "#898781"}
                      stroke="#fcfcfb"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatInr(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-medium text-gray-900">
            Last 12 months
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData}>
              <CartesianGrid vertical={false} stroke="#e1e0d9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#898781" }}
                axisLine={{ stroke: "#c3c2b7" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#898781" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(value) => formatInr(Number(value))} />
              <Legend />
              <Bar dataKey="income" fill={SERIES_COLORS.income} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill={SERIES_COLORS.expense} radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="investment"
                fill={SERIES_COLORS.investment}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "investment";
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className="mt-1 text-xl font-semibold"
        style={{ color: SERIES_COLORS[tone] }}
      >
        {formatInr(value)}
      </p>
    </div>
  );
}
