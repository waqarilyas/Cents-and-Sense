/**
 * Currency Helpers — Comprehensive Test Suite
 * Tests multi-currency grouping, balance aggregation, formatting,
 * subscription cost normalization, and sorting.
 */
import {
  groupAccountsByCurrency,
  getTotalBalanceByCurrency,
  getMonthlyStatsByCurrency,
  filterTransactionsByCurrency,
  getUniqueCurrencies,
  getUniqueCurrenciesFromAccounts,
  formatCurrencyAmount,
  groupBudgetsByCurrency,
  groupGoalsByCurrency,
  groupSubscriptionsByCurrency,
  getSubscriptionTotalByCurrency,
  getCurrencyDisplay,
  sortCurrencies,
} from "../../lib/utils/currencyHelpers";

import {
  Account,
  Transaction,
  Budget,
  Goal,
  Subscription,
} from "../../lib/database";

// ============================================================
// Test Fixtures
// ============================================================
const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: "acc-1",
  name: "Test Account",
  type: "checking",
  balance: 1000,
  currency: "USD",
  isDefault: false,
  createdAt: Date.now(),
  ...overrides,
});

const makeTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction => ({
  id: "txn-1",
  accountId: "acc-1",
  categoryId: "cat-1",
  amount: 50,
  currency: "USD",
  description: "Test",
  date: new Date(2025, 5, 15).getTime(),
  type: "expense",
  createdAt: Date.now(),
  ...overrides,
});

const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
  id: "bud-1",
  categoryId: "cat-1",
  budget_limit: 500,
  currency: "USD",
  period: "monthly",
  allowCarryover: false,
  lastCarryoverAmount: 0,
  lastPeriodEnd: 0,
  createdAt: Date.now(),
  ...overrides,
});

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "goal-1",
  name: "Test Goal",
  targetAmount: 1000,
  currentAmount: 250,
  currency: "USD",
  deadline: Date.now() + 86400000 * 90,
  createdAt: Date.now(),
  ...overrides,
});

const makeSubscription = (
  overrides: Partial<Subscription> = {},
): Subscription => ({
  id: "sub-1",
  name: "Test Sub",
  amount: 10,
  currency: "USD",
  categoryId: "cat-1",
  frequency: "monthly",
  startDate: Date.now(),
  nextDueDate: Date.now() + 86400000 * 30,
  isActive: true,
  reminderDays: 3,
  createdAt: Date.now(),
  ...overrides,
});

// ============================================================
// groupAccountsByCurrency
// ============================================================
describe("groupAccountsByCurrency", () => {
  it("groups accounts by their currency", () => {
    const accounts = [
      makeAccount({ id: "a1", currency: "USD" }),
      makeAccount({ id: "a2", currency: "EUR" }),
      makeAccount({ id: "a3", currency: "USD" }),
    ];
    const grouped = groupAccountsByCurrency(accounts);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["USD"]).toHaveLength(2);
    expect(grouped["EUR"]).toHaveLength(1);
  });

  it("returns empty object for empty array", () => {
    expect(groupAccountsByCurrency([])).toEqual({});
  });

  it("handles single currency", () => {
    const accounts = [makeAccount()];
    const grouped = groupAccountsByCurrency(accounts);
    expect(Object.keys(grouped)).toHaveLength(1);
  });
});

// ============================================================
// getTotalBalanceByCurrency
// ============================================================
describe("getTotalBalanceByCurrency", () => {
  it("sums balances per currency", () => {
    const accounts = [
      makeAccount({ balance: 1000, currency: "USD" }),
      makeAccount({ balance: 500, currency: "USD" }),
      makeAccount({ balance: 200, currency: "EUR" }),
    ];
    const totals = getTotalBalanceByCurrency(accounts);
    expect(totals["USD"]).toBe(1500);
    expect(totals["EUR"]).toBe(200);
  });

  it("handles negative balances (credit cards)", () => {
    const accounts = [
      makeAccount({ balance: 1000, currency: "USD" }),
      makeAccount({ balance: -500, currency: "USD" }),
    ];
    const totals = getTotalBalanceByCurrency(accounts);
    expect(totals["USD"]).toBe(500);
  });

  it("returns empty object for no accounts", () => {
    expect(getTotalBalanceByCurrency([])).toEqual({});
  });
});

// ============================================================
// getMonthlyStatsByCurrency
// ============================================================
describe("getMonthlyStatsByCurrency", () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  it("calculates income, expense, and balance for current month", () => {
    const txns = [
      makeTransaction({
        amount: 3000,
        type: "income",
        currency: "USD",
        date: new Date(year, month, 5).getTime(),
      }),
      makeTransaction({
        amount: 100,
        type: "expense",
        currency: "USD",
        date: new Date(year, month, 10).getTime(),
      }),
      makeTransaction({
        amount: 200,
        type: "expense",
        currency: "USD",
        date: new Date(year, month, 15).getTime(),
      }),
    ];
    const stats = getMonthlyStatsByCurrency(txns, month, year);
    expect(stats["USD"].income).toBe(3000);
    expect(stats["USD"].expense).toBe(300);
    expect(stats["USD"].balance).toBe(2700);
  });

  it("separates currencies in stats", () => {
    const txns = [
      makeTransaction({
        amount: 100,
        type: "expense",
        currency: "USD",
        date: new Date(year, month, 5).getTime(),
      }),
      makeTransaction({
        amount: 50,
        type: "expense",
        currency: "EUR",
        date: new Date(year, month, 5).getTime(),
      }),
    ];
    const stats = getMonthlyStatsByCurrency(txns, month, year);
    expect(stats["USD"].expense).toBe(100);
    expect(stats["EUR"].expense).toBe(50);
  });

  it("excludes transactions from other months", () => {
    const otherMonth = month === 0 ? 1 : month - 1;
    const txns = [
      makeTransaction({
        amount: 100,
        type: "expense",
        currency: "USD",
        date: new Date(year, otherMonth, 5).getTime(),
      }),
    ];
    const stats = getMonthlyStatsByCurrency(txns, month, year);
    expect(stats["USD"]).toBeUndefined();
  });
});

// ============================================================
// filterTransactionsByCurrency
// ============================================================
describe("filterTransactionsByCurrency", () => {
  it("returns only transactions with specified currency", () => {
    const txns = [
      makeTransaction({ currency: "USD" }),
      makeTransaction({ currency: "EUR", id: "txn-2" }),
      makeTransaction({ currency: "USD", id: "txn-3" }),
    ];
    const filtered = filterTransactionsByCurrency(txns, "USD");
    expect(filtered).toHaveLength(2);
    for (const t of filtered) {
      expect(t.currency).toBe("USD");
    }
  });

  it("returns empty for no matches", () => {
    const txns = [makeTransaction({ currency: "USD" })];
    expect(filterTransactionsByCurrency(txns, "EUR")).toHaveLength(0);
  });
});

// ============================================================
// getUniqueCurrencies / getUniqueCurrenciesFromAccounts
// ============================================================
describe("getUniqueCurrencies", () => {
  it("returns sorted unique currencies from transactions", () => {
    const txns = [
      makeTransaction({ currency: "EUR" }),
      makeTransaction({ currency: "USD" }),
      makeTransaction({ currency: "EUR", id: "txn-2" }),
    ];
    const unique = getUniqueCurrencies(txns);
    expect(unique).toEqual(["EUR", "USD"]);
  });

  it("returns empty for no transactions", () => {
    expect(getUniqueCurrencies([])).toEqual([]);
  });
});

describe("getUniqueCurrenciesFromAccounts", () => {
  it("returns sorted unique currencies from accounts", () => {
    const accounts = [
      makeAccount({ currency: "PKR" }),
      makeAccount({ currency: "USD" }),
      makeAccount({ currency: "PKR", id: "a2" }),
    ];
    const unique = getUniqueCurrenciesFromAccounts(accounts);
    expect(unique).toEqual(["PKR", "USD"]);
  });
});

// ============================================================
// groupBudgetsByCurrency / groupGoalsByCurrency / groupSubscriptionsByCurrency
// ============================================================
describe("groupBudgetsByCurrency", () => {
  it("groups budgets by currency", () => {
    const budgets = [
      makeBudget({ currency: "USD" }),
      makeBudget({ currency: "EUR", id: "bud-2" }),
    ];
    const grouped = groupBudgetsByCurrency(budgets);
    expect(Object.keys(grouped)).toHaveLength(2);
  });
});

describe("groupGoalsByCurrency", () => {
  it("groups goals by currency", () => {
    const goals = [
      makeGoal({ currency: "USD" }),
      makeGoal({ currency: "PKR", id: "goal-2" }),
    ];
    const grouped = groupGoalsByCurrency(goals);
    expect(Object.keys(grouped)).toHaveLength(2);
  });
});

describe("groupSubscriptionsByCurrency", () => {
  it("groups subscriptions by currency", () => {
    const subs = [
      makeSubscription({ currency: "USD" }),
      makeSubscription({ currency: "EUR", id: "sub-2" }),
    ];
    const grouped = groupSubscriptionsByCurrency(subs);
    expect(Object.keys(grouped)).toHaveLength(2);
  });
});

// ============================================================
// getSubscriptionTotalByCurrency (frequency normalization)
// ============================================================
describe("getSubscriptionTotalByCurrency", () => {
  it("sums monthly subscriptions as-is", () => {
    const subs = [
      makeSubscription({ amount: 10, frequency: "monthly", currency: "USD" }),
      makeSubscription({
        amount: 20,
        frequency: "monthly",
        currency: "USD",
        id: "sub-2",
      }),
    ];
    const totals = getSubscriptionTotalByCurrency(subs, "monthly");
    expect(totals["USD"]).toBeCloseTo(30, 1);
  });

  it("converts daily to monthly (×30)", () => {
    const subs = [
      makeSubscription({ amount: 1, frequency: "daily", currency: "USD" }),
    ];
    const totals = getSubscriptionTotalByCurrency(subs, "monthly");
    expect(totals["USD"]).toBeCloseTo(30, 0);
  });

  it("converts weekly to monthly (×4.33)", () => {
    const subs = [
      makeSubscription({ amount: 10, frequency: "weekly", currency: "USD" }),
    ];
    const totals = getSubscriptionTotalByCurrency(subs, "monthly");
    expect(totals["USD"]).toBeCloseTo(43.3, 0);
  });

  it("converts yearly to monthly (÷12)", () => {
    const subs = [
      makeSubscription({ amount: 120, frequency: "yearly", currency: "USD" }),
    ];
    const totals = getSubscriptionTotalByCurrency(subs, "monthly");
    expect(totals["USD"]).toBeCloseTo(10, 1);
  });

  it("converts to yearly frequency", () => {
    const subs = [
      makeSubscription({ amount: 10, frequency: "monthly", currency: "USD" }),
    ];
    const totals = getSubscriptionTotalByCurrency(subs, "yearly");
    expect(totals["USD"]).toBeCloseTo(120, 1);
  });

  it("excludes inactive subscriptions", () => {
    const subs = [makeSubscription({ amount: 10, isActive: false })];
    const totals = getSubscriptionTotalByCurrency(subs);
    expect(totals["USD"]).toBeUndefined();
  });

  it("handles multiple currencies", () => {
    const subs = [
      makeSubscription({ amount: 10, currency: "USD" }),
      makeSubscription({ amount: 5, currency: "EUR", id: "sub-2" }),
    ];
    const totals = getSubscriptionTotalByCurrency(subs, "monthly");
    expect(totals["USD"]).toBeCloseTo(10, 1);
    expect(totals["EUR"]).toBeCloseTo(5, 1);
  });
});

// ============================================================
// getCurrencyDisplay
// ============================================================
describe("getCurrencyDisplay", () => {
  it("returns flag + code for known currencies", () => {
    const display = getCurrencyDisplay("USD");
    expect(display).toContain("USD");
  });

  it("returns just the code for unknown currencies", () => {
    expect(getCurrencyDisplay("XYZ")).toBe("XYZ");
  });
});

// ============================================================
// sortCurrencies
// ============================================================
describe("sortCurrencies", () => {
  it("puts the default currency first", () => {
    const sorted = sortCurrencies(["EUR", "USD", "GBP"], "USD");
    expect(sorted[0]).toBe("USD");
  });

  it("sorts remaining currencies alphabetically", () => {
    const sorted = sortCurrencies(["GBP", "EUR", "USD", "AUD"], "USD");
    expect(sorted[0]).toBe("USD");
    expect(sorted[1]).toBe("AUD");
    expect(sorted[2]).toBe("EUR");
    expect(sorted[3]).toBe("GBP");
  });

  it("handles empty array", () => {
    expect(sortCurrencies([], "USD")).toEqual([]);
  });

  it("handles default not in list", () => {
    const sorted = sortCurrencies(["EUR", "GBP"], "USD");
    expect(sorted).toEqual(["EUR", "GBP"]);
  });
});

// ============================================================
// formatCurrencyAmount (from currencyHelpers)
// ============================================================
describe("formatCurrencyAmount (helpers)", () => {
  it("formats with symbol prefix", () => {
    const result = formatCurrencyAmount(100, "USD");
    expect(result).toContain("$");
  });

  it("falls back for unknown currency", () => {
    const result = formatCurrencyAmount(100, "XYZ");
    expect(result).toContain("100");
    expect(result).toContain("XYZ");
  });
});
