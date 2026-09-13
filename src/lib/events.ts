const TRANSACTIONS_CHANGED = "expense-tracker:transactions-changed";

export function emitTransactionsChanged() {
  window.dispatchEvent(new Event(TRANSACTIONS_CHANGED));
}

export function onTransactionsChanged(handler: () => void) {
  window.addEventListener(TRANSACTIONS_CHANGED, handler);
  return () => window.removeEventListener(TRANSACTIONS_CHANGED, handler);
}
