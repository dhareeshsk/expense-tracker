export type TransactionType = {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
};

export type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
};

export type Budget = {
  id: string;
  categoryId: string;
  monthlyLimit: string;
  alertThreshold: number;
  category: Category;
  spent: number;
};

export type Transaction = {
  id: string;
  transactionTypeId: string;
  transactionType: TransactionType;
  amount: string;
  date: string;
  note: string | null;
  paymentMethod: string | null;
  categoryId: string;
  category: Category;
  householdId: string | null;
};

export type HouseholdMemberInfo = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
};

export type Household = {
  id: string;
  name: string;
  createdAt: string;
  members: HouseholdMemberInfo[];
  invites?: { id: string; email: string }[];
};

export type HouseholdInviteForMe = {
  id: string;
  householdId: string;
  householdName: string;
  createdAt: string;
};

export type HouseholdBudget = {
  id: string;
  householdId: string;
  categoryName: string;
  monthlyLimit: string;
  alertThreshold: number;
  spent: number;
};

export type CalculatorType = "EXPENSE_SPLIT" | "BUDGET";

export type Calculator = {
  id: string;
  type: CalculatorType;
  name: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseSplitLineItem = {
  id: string;
  amount: number;
  category: string;
  paidBy: string;
};

export type ExpenseSplitData = {
  people: string[];
  lineItems: ExpenseSplitLineItem[];
  advances: Record<string, number>;
  comments: string;
};

export type BudgetCalcPeriodType = "daily" | "monthly" | "yearly" | "custom";

export type BudgetCalcLineItem = {
  id: string;
  category: string;
  amount: number;
};

export type BudgetCalcData = {
  periodType: BudgetCalcPeriodType;
  customFrom?: string;
  customTo?: string;
  lineItems: BudgetCalcLineItem[];
};

export type ReminderStatus = "PENDING" | "PAID" | "MISSED";
export type RecurrenceInterval = "WEEKLY" | "MONTHLY" | "CUSTOM_DAYS";

export type Reminder = {
  id: string;
  label: string;
  category: string;
  amount: string;
  dueDate: string;
  status: ReminderStatus;
  isRecurring: boolean;
  recurrenceInterval: RecurrenceInterval | null;
  customIntervalDays: number | null;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  type: "household" | "budget_alert" | "reminder";
  message: string;
  relatedId: string | null;
  isRead: boolean;
  createdAt: string;
};
