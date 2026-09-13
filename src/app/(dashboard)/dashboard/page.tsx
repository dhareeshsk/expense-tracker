"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
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
import {
  TrendingUp,
  TrendingDown,
  LineChart as LineChartIcon,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Budget } from "@/lib/types";
import { CardGridSkeleton, Skeleton } from "@/components/skeleton";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

type PeriodType = "day" | "month" | "year";

type Summary = {
  periodType: PeriodType;
  year: number;
  month: number;
  date: string;
  periodLabel: string;
  previousPeriodLabel: string;
  periodRange: { from: string; to: string };
  totalIncome: number;
  totalExpense: number;
  totalInvestment: number;
  netBalance: number;
  previous: {
    totalIncome: number;
    totalExpense: number;
    totalInvestment: number;
    netBalance: number;
  };
  typeIds: { income: string | null; expense: string | null; investment: string | null };
  expenseByCategory: { categoryId: string; name: string; color: string | null; total: number }[];
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [dayValue, setDayValue] = useState(todayIso());
  const now = new Date();
  const [monthYear, setMonthYear] = useState(now.getUTCFullYear());
  const [monthValue, setMonthValue] = useState(now.getUTCMonth());
  const [yearValue, setYearValue] = useState(now.getUTCFullYear());

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("periodType", periodType);
    if (periodType === "day") params.set("date", dayValue);
    if (periodType === "month") {
      params.set("year", String(monthYear));
      params.set("month", String(monthValue));
    }
    if (periodType === "year") params.set("year", String(yearValue));
    return params.toString();
  }, [periodType, dayValue, monthYear, monthValue, yearValue]);

  useEffect(() => {
    fetch(`/api/dashboard-summary?${queryParams}`)
      .then((res) => res.json())
      .then(setSummary);
  }, [queryParams]);

  useEffect(() => {
    fetch("/api/budgets")
      .then((res) => res.json())
      .then(setBudgets);
  }, []);

  function stepPeriod(direction: -1 | 1) {
    if (periodType === "day") {
      const d = new Date(`${dayValue}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + direction);
      setDayValue(d.toISOString().slice(0, 10));
    } else if (periodType === "month") {
      let newMonth = monthValue + direction;
      let newYear = monthYear;
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      setMonthValue(newMonth);
      setMonthYear(newYear);
    } else {
      setYearValue((y) => y + direction);
    }
  }

  function goToTransactions(params: Record<string, string>) {
    const search = new URLSearchParams(params);
    router.push(`/transactions?${search.toString()}`);
  }

  if (!summary) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
        <CardGridSkeleton count={4} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
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

  const { from, to } = summary.periodRange;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">Dashboard</h1>
          <p className="text-sm text-text-muted">{summary.periodLabel} overview</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            className="rounded-md border border-border px-2 py-1.5 text-sm"
          >
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>

          <div className="flex items-center gap-1 rounded-md border border-border px-1">
            <button
              type="button"
              onClick={() => stepPeriod(-1)}
              aria-label="Previous period"
              className="rounded p-1.5 hover:bg-surface-muted"
            >
              <ChevronLeft size={16} />
            </button>

            {periodType === "day" && (
              <input
                type="date"
                value={dayValue}
                onChange={(e) => setDayValue(e.target.value)}
                className="border-0 px-1 py-1 text-sm focus:outline-none"
              />
            )}
            {periodType === "month" && (
              <input
                type="month"
                value={`${monthYear}-${String(monthValue + 1).padStart(2, "0")}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-").map(Number);
                  if (!y || !m) return;
                  setMonthYear(y);
                  setMonthValue(m - 1);
                }}
                className="border-0 px-1 py-1 text-sm focus:outline-none"
              />
            )}
            {periodType === "year" && (
              <input
                type="number"
                value={yearValue}
                onChange={(e) => setYearValue(Number(e.target.value) || yearValue)}
                className="w-20 border-0 px-1 py-1 text-sm focus:outline-none"
              />
            )}

            <button
              type="button"
              onClick={() => stepPeriod(1)}
              aria-label="Next period"
              className="rounded p-1.5 hover:bg-surface-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
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
                    ? "border-budget-critical/30 bg-budget-critical-soft text-budget-critical"
                    : "border-budget-warn/30 bg-budget-warn-soft text-budget-warn"
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
        <SummaryCard
          label="Income"
          value={summary.totalIncome}
          previousValue={summary.previous.totalIncome}
          tone="income"
          icon={TrendingUp}
          higherIsBetter
          onClick={
            summary.typeIds.income
              ? () => goToTransactions({ transactionTypeId: summary.typeIds.income!, from, to })
              : undefined
          }
        />
        <SummaryCard
          label="Expenses"
          value={summary.totalExpense}
          previousValue={summary.previous.totalExpense}
          tone="expense"
          icon={TrendingDown}
          higherIsBetter={false}
          onClick={
            summary.typeIds.expense
              ? () => goToTransactions({ transactionTypeId: summary.typeIds.expense!, from, to })
              : undefined
          }
        />
        <SummaryCard
          label="Invested"
          value={summary.totalInvestment}
          previousValue={summary.previous.totalInvestment}
          tone="investment"
          icon={LineChartIcon}
          higherIsBetter
          onClick={
            summary.typeIds.investment
              ? () =>
                  goToTransactions({ transactionTypeId: summary.typeIds.investment!, from, to })
              : undefined
          }
        />
        <SummaryCard
          label="Net balance"
          value={summary.netBalance}
          previousValue={summary.previous.netBalance}
          tone={summary.netBalance >= 0 ? "income" : "expense"}
          icon={Wallet}
          higherIsBetter
          onClick={() => goToTransactions({ from, to })}
        />
      </div>
      <p className="-mt-4 text-xs text-text-faint">
        vs {summary.previousPeriodLabel} · click a card or a pie segment to view those
        transactions
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-card p-4">
          <h2 className="mb-4 text-sm font-medium text-text">
            Expense breakdown by category
          </h2>
          {summary.expenseByCategory.length === 0 ? (
            <p className="text-sm text-text-muted">No expenses this period.</p>
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
                  cursor="pointer"
                  onClick={(entry) => {
                    const categoryId = (entry as { payload?: { categoryId?: string } }).payload
                      ?.categoryId;
                    if (categoryId) goToTransactions({ categoryId, from, to });
                  }}
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

        <div className="rounded-lg border border-border bg-surface-card p-4">
          <h2 className="mb-4 text-sm font-medium text-text">
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

function AnimatedInr({ value }: { value: number }) {
  const reduceMotion = usePrefersReducedMotion();
  const motionValue = useMotionValue(reduceMotion ? value : 0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20 });
  const display = useTransform(spring, (v) => formatInr(Math.round(v)));

  useEffect(() => {
    motionValue.set(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run whenever the target value changes
  }, [value]);

  return <motion.span>{display}</motion.span>;
}

function SummaryCard({
  label,
  value,
  previousValue,
  tone,
  icon: Icon,
  higherIsBetter,
  onClick,
}: {
  label: string;
  value: number;
  previousValue: number;
  tone: "income" | "expense" | "investment";
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  higherIsBetter: boolean;
  onClick?: () => void;
}) {
  const delta = value - previousValue;
  const pctChange =
    previousValue !== 0
      ? (delta / Math.abs(previousValue)) * 100
      : value !== 0
        ? 100
        : 0;
  const isFlat = Math.abs(pctChange) < 0.5;
  const isGoodChange = higherIsBetter ? delta >= 0 : delta <= 0;

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`w-full rounded-lg border border-border bg-surface-card p-4 text-left ${
        onClick ? "cursor-pointer transition-colors hover:bg-surface-muted" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{label}</p>
        <Icon size={16} style={{ color: SERIES_COLORS[tone] }} />
      </div>
      <p
        className="mt-1 text-xl font-semibold"
        style={{ color: SERIES_COLORS[tone] }}
      >
        <AnimatedInr value={value} />
      </p>
      {!isFlat && (
        <p
          className={`mt-1 flex items-center gap-1 text-xs font-medium ${
            isGoodChange ? "text-budget-good" : "text-budget-critical"
          }`}
        >
          {delta >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(pctChange).toFixed(0)}% vs last period
        </p>
      )}
    </Wrapper>
  );
}
