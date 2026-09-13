export type TransactionType = "income" | "expense" | "investment";

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
  type: TransactionType;
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
