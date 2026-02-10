import { Account, Transaction, Budget, Goal, Subscription } from "../database";
import { getCurrency } from "../currencies";

/**
 * Group accounts by currency
 */
export function groupAccountsByCurrency(
  accounts: Account[],
): Record<string, Account[]> {
  return accounts.reduce(
    (acc, account) => {
      if (!acc[account.currency]) {
        acc[account.currency] = [];
      }
      acc[account.currency].push(account);
      return acc;
    },
    {} as Record<string, Account[]>,
  );
}

/**
 * Calculate total balance per currency from accounts
 */
export function getTotalBalanceByCurrency(
  accounts: Account[],
): Record<string, number> {
  return accounts.reduce(
    (acc, account) => {
      acc[account.currency] = (acc[account.currency] || 0) + account.balance;
      return acc;
    },
    {} as Record<string, number>,
  );
}

/**
 * Get monthly stats per currency
 */
export function getMonthlyStatsByCurrency(
  transactions: Transaction[],
  month?: number,
  year?: number,
): Record<string, { income: number; expense: number; balance: number }> {
  const now = new Date();
  const targetMonth = month !== undefined ? month : now.getMonth();
  const targetYear = year !== undefined ? year : now.getFullYear();

  return transactions
    .filter((t) => {
      const date = new Date(t.date);
      return (
        date.getMonth() === targetMonth && date.getFullYear() === targetYear
      );
    })
    .reduce(
      (acc, t) => {
        if (!acc[t.currency]) {
          acc[t.currency] = { income: 0, expense: 0, balance: 0 };
        }
        if (t.type === "income") {
          acc[t.currency].income += t.amount;
        } else {
          acc[t.currency].expense += t.amount;
        }
        acc[t.currency].balance =
          acc[t.currency].income - acc[t.currency].expense;
        return acc;
      },
      {} as Record<
        string,
        { income: number; expense: number; balance: number }
      >,
    );
}

/**
 * Filter transactions by currency
 */
export function filterTransactionsByCurrency(
  transactions: Transaction[],
  currency: string,
): Transaction[] {
  return transactions.filter((t) => t.currency === currency);
}

/**
 * Get unique currencies from transactions
 */
export function getUniqueCurrencies(transactions: Transaction[]): string[] {
  const currencies = new Set(transactions.map((t) => t.currency));
  return Array.from(currencies).sort();
}

/**
 * Get unique currencies from accounts
 */
export function getUniqueCurrenciesFromAccounts(accounts: Account[]): string[] {
  const currencies = new Set(accounts.map((a) => a.currency));
  return Array.from(currencies).sort();
}

/**
 * Format currency with proper symbol and formatting
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string,
): string {
  const currency = getCurrency(currencyCode);
  if (!currency) {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }

  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits,
  });

  return `${currency.symbol}${formattedAmount}`;
}

/**
 * Group budgets by currency
 */
export function groupBudgetsByCurrency(
  budgets: Budget[],
): Record<string, Budget[]> {
  return budgets.reduce(
    (acc, budget) => {
      if (!acc[budget.currency]) {
        acc[budget.currency] = [];
      }
      acc[budget.currency].push(budget);
      return acc;
    },
    {} as Record<string, Budget[]>,
  );
}

/**
 * Group goals by currency
 */
export function groupGoalsByCurrency(goals: Goal[]): Record<string, Goal[]> {
  return goals.reduce(
    (acc, goal) => {
      if (!acc[goal.currency]) {
        acc[goal.currency] = [];
      }
      acc[goal.currency].push(goal);
      return acc;
    },
    {} as Record<string, Goal[]>,
  );
}

/**
 * Group subscriptions by currency
 */
export function groupSubscriptionsByCurrency(
  subscriptions: Subscription[],
): Record<string, Subscription[]> {
  return subscriptions.reduce(
    (acc, sub) => {
      if (!acc[sub.currency]) {
        acc[sub.currency] = [];
      }
      acc[sub.currency].push(sub);
      return acc;
    },
    {} as Record<string, Subscription[]>,
  );
}

/**
 * Calculate total for subscriptions by currency
 */
export function getSubscriptionTotalByCurrency(
  subscriptions: Subscription[],
  frequency: "daily" | "weekly" | "monthly" | "yearly" = "monthly",
): Record<string, number> {
  return subscriptions
    .filter((s) => s.isActive)
    .reduce(
      (acc, sub) => {
        let amount = sub.amount;

        // Convert to monthly equivalent
        switch (sub.frequency) {
          case "daily":
            amount = amount * 30;
            break;
          case "weekly":
            amount = amount * 4.33;
            break;
          case "yearly":
            amount = amount / 12;
            break;
          // monthly is already correct
        }

        // Convert to requested frequency
        switch (frequency) {
          case "daily":
            amount = amount / 30;
            break;
          case "weekly":
            amount = amount / 4.33;
            break;
          case "yearly":
            amount = amount * 12;
            break;
          // monthly is already correct
        }

        acc[sub.currency] = (acc[sub.currency] || 0) + amount;
        return acc;
      },
      {} as Record<string, number>,
    );
}

/**
 * Get currency display with flag
 */
export function getCurrencyDisplay(currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  if (!currency) return currencyCode;
  return `${currency.flag || ""} ${currencyCode}`.trim();
}

/**
 * Sort currencies by preference (user's default first, then alphabetically)
 */
export function sortCurrencies(
  currencies: string[],
  defaultCurrency: string,
): string[] {
  return currencies.sort((a, b) => {
    if (a === defaultCurrency) return -1;
    if (b === defaultCurrency) return 1;
    return a.localeCompare(b);
  });
}
