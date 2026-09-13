export type LocalCalculatorType = "EXPENSE_SPLIT" | "BUDGET";

export type LocalCalculator = {
  id: string;
  type: LocalCalculatorType;
  name: string;
  data: Record<string, unknown>;
  updatedAt: string;
};

const STORAGE_KEY = "expense-tracker:local-calculators";

function readAll(): LocalCalculator[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: LocalCalculator[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — fail silently,
    // the calculator still works for the current page session.
  }
}

export function listLocalCalculators(type?: LocalCalculatorType): LocalCalculator[] {
  const all = readAll();
  return type ? all.filter((c) => c.type === type) : all;
}

export function getLocalCalculator(id: string): LocalCalculator | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function saveLocalCalculator(
  input: Pick<LocalCalculator, "type" | "name" | "data"> & { id?: string },
): LocalCalculator {
  const all = readAll();
  const id = input.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const existingIndex = all.findIndex((c) => c.id === id);
  const record: LocalCalculator = {
    id,
    type: input.type,
    name: input.name,
    data: input.data,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    all[existingIndex] = record;
  } else {
    all.push(record);
  }
  writeAll(all);
  return record;
}

export function deleteLocalCalculator(id: string) {
  writeAll(readAll().filter((c) => c.id !== id));
}
