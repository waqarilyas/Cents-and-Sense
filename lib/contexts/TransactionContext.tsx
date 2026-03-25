import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Transaction, getDatabase, Account } from "../database";
import { getMonthlyStatsByCurrency } from "../utils/currencyHelpers";
import { widgetService } from "../services/WidgetService";
import {
  validateAmount,
  validateString,
  validateDate,
  validateId,
  validateTransactionType,
  ValidationError,
} from "../utils/validation";
import { Alert } from "react-native";

interface TransactionContextType {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  addTransaction: (
    accountId: string,
    categoryId: string,
    amount: number,
    description: string,
    date: number,
    type: "income" | "expense",
  ) => Promise<void>;
  updateTransaction: (
    id: string,
    accountId: string,
    categoryId: string,
    amount: number,
    description: string,
    date: number,
    type: "income" | "expense",
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransaction: (id: string) => Transaction | undefined;
  getTransactionsByAccount: (accountId: string) => Transaction[];
  getTransactionsByCategory: (categoryId: string) => Transaction[];
  getTransactionsByDateRange: (
    startDate: number,
    endDate: number,
  ) => Transaction[];
  getTransactionsByType: (type: "income" | "expense") => Transaction[];
  getMonthlyStats: () => { income: number; expense: number; balance: number };
  getMonthlyStatsByCurrency: () => Record<
    string,
    { income: number; expense: number; balance: number }
  >;
  refreshTransactions: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined,
);

export function TransactionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = await getDatabase();
      const result = await db.getAllAsync<Transaction>(
        "SELECT * FROM transactions WHERE deletedAt IS NULL ORDER BY date DESC, createdAt DESC",
      );
      setTransactions(result || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load transactions",
      );
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const addTransaction = useCallback(
    async (
      accountId: string,
      categoryId: string,
      amount: number,
      description: string,
      date: number,
      type: "income" | "expense",
    ) => {
      try {
        // Validate all inputs
        const validAccountId = validateId(accountId, "accountId");
        const validCategoryId = validateId(categoryId, "categoryId");
        const validAmount = validateAmount(amount, "amount", {
          allowZero: false,
          allowNegative: false,
          max: 999999999,
        });
        const validDescription = validateString(description, "description", {
          maxLength: 500,
        });
        const validDate = validateDate(date, "date");
        const validType = validateTransactionType(type);

        const db = await getDatabase();
        const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // Start database transaction for atomicity
        await db.execAsync("BEGIN TRANSACTION");

        try {
          // Verify account exists
          const account = await db.getFirstAsync<Account>(
            "SELECT * FROM accounts WHERE id = ?",
            [validAccountId],
          );
          if (!account) {
            throw new Error("Account not found");
          }

          // Verify category exists
          const category = await db.getFirstAsync<{ id: string }>(
            "SELECT id FROM categories WHERE id = ?",
            [validCategoryId],
          );
          if (!category) {
            throw new Error("Category not found");
          }

          const currency = account.currency;
          const balanceChange =
            validType === "income" ? validAmount : -validAmount;

          // Insert transaction
          await db.runAsync(
            "INSERT INTO transactions (id, accountId, categoryId, amount, currency, description, date, type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              id,
              validAccountId,
              validCategoryId,
              validAmount,
              currency,
              validDescription,
              validDate,
              validType,
              Date.now(),
              Date.now(),
            ],
          );

          // Update account balance in same transaction
          await db.runAsync(
            "UPDATE accounts SET balance = balance + ? WHERE id = ?",
            [balanceChange, validAccountId],
          );

          // Commit transaction
          await db.execAsync("COMMIT");

          // Reload data
          await loadTransactions();

          // Update widgets
          widgetService
            .updateAllWidgets()
            .catch((err) => console.warn("Failed to update widgets:", err));
        } catch (error) {
          // Rollback on any error
          await db.execAsync("ROLLBACK");
          throw error;
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
          throw error;
        }
        const message =
          error instanceof Error ? error.message : "Failed to add transaction";
        setError(message);
        throw error;
      }
    },
    [loadTransactions],
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      accountId: string,
      categoryId: string,
      amount: number,
      description: string,
      date: number,
      type: "income" | "expense",
    ) => {
      try {
        // Validate all inputs
        const validId = validateId(id, "id");
        const validAccountId = validateId(accountId, "accountId");
        const validCategoryId = validateId(categoryId, "categoryId");
        const validAmount = validateAmount(amount, "amount", {
          allowZero: false,
          allowNegative: false,
          max: 999999999,
        });
        const validDescription = validateString(description, "description", {
          maxLength: 500,
        });
        const validDate = validateDate(date, "date");
        const validType = validateTransactionType(type);

        const db = await getDatabase();

        // Start database transaction for atomicity
        await db.execAsync("BEGIN TRANSACTION");

        try {
          // Get the old transaction
          const oldTx = await db.getFirstAsync<Transaction>(
            "SELECT * FROM transactions WHERE id = ?",
            [validId],
          );
          if (!oldTx) {
            throw new Error("Transaction not found");
          }

          // Verify new account exists
          const account = await db.getFirstAsync<Account>(
            "SELECT * FROM accounts WHERE id = ?",
            [validAccountId],
          );
          if (!account) {
            throw new Error("Account not found");
          }

          // Verify new category exists
          const category = await db.getFirstAsync<{ id: string }>(
            "SELECT id FROM categories WHERE id = ?",
            [validCategoryId],
          );
          if (!category) {
            throw new Error("Category not found");
          }

          const currency = account.currency;

          // Revert old transaction's balance impact
          if (oldTx.accountId) {
            const oldBalanceChange =
              oldTx.type === "income" ? -oldTx.amount : oldTx.amount;
            await db.runAsync(
              "UPDATE accounts SET balance = balance + ? WHERE id = ?",
              [oldBalanceChange, oldTx.accountId],
            );
          }

          // Update the transaction
          await db.runAsync(
            "UPDATE transactions SET accountId = ?, categoryId = ?, amount = ?, currency = ?, description = ?, date = ?, type = ?, updatedAt = ? WHERE id = ?",
            [
              validAccountId,
              validCategoryId,
              validAmount,
              currency,
              validDescription,
              validDate,
              validType,
              Date.now(),
              validId,
            ],
          );

          // Apply new transaction's balance impact
          const newBalanceChange =
            validType === "income" ? validAmount : -validAmount;
          await db.runAsync(
            "UPDATE accounts SET balance = balance + ? WHERE id = ?",
            [newBalanceChange, validAccountId],
          );

          // Verify balance is valid for non-credit card accounts
          const updatedAccount = await db.getFirstAsync<Account>(
            "SELECT * FROM accounts WHERE id = ?",
            [validAccountId],
          );
          if (
            updatedAccount &&
            updatedAccount.type !== "credit_card" &&
            updatedAccount.balance < 0
          ) {
            throw new Error("Insufficient funds");
          }

          // Commit transaction
          await db.execAsync("COMMIT");

          // Reload data
          await loadTransactions();

          // Update widgets
          widgetService
            .updateAllWidgets()
            .catch((err) => console.warn("Failed to update widgets:", err));
        } catch (error) {
          // Rollback on any error
          await db.execAsync("ROLLBACK");
          throw error;
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
          throw error;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update transaction";
        setError(message);
        throw error;
      }
    },
    [loadTransactions],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      try {
        const validId = validateId(id, "id");
        const db = await getDatabase();

        // Start database transaction for atomicity
        await db.execAsync("BEGIN TRANSACTION");

        try {
          // Get the transaction to revert its balance impact
          const tx = await db.getFirstAsync<Transaction>(
            "SELECT * FROM transactions WHERE id = ?",
            [validId],
          );
          if (!tx) {
            throw new Error("Transaction not found");
          }

          // Delete the transaction
          const now = Date.now();
          await db.runAsync(
            "UPDATE transactions SET deletedAt = ?, updatedAt = ? WHERE id = ?",
            [now, now, validId],
          );

          // Revert the transaction's balance impact
          if (tx.accountId) {
            const balanceChange = tx.type === "income" ? -tx.amount : tx.amount;
            await db.runAsync(
              "UPDATE accounts SET balance = balance + ? WHERE id = ?",
              [balanceChange, tx.accountId],
            );
          }

          // Commit transaction
          await db.execAsync("COMMIT");

          // Reload data
          await loadTransactions();

          // Update widgets
          widgetService
            .updateAllWidgets()
            .catch((err) => console.warn("Failed to update widgets:", err));
        } catch (error) {
          // Rollback on any error
          await db.execAsync("ROLLBACK");
          throw error;
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
          throw error;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to delete transaction";
        setError(message);
        throw error;
      }
    },
    [loadTransactions],
  );

  const getTransaction = useCallback(
    (id: string) => {
      return transactions.find((t) => t.id === id);
    },
    [transactions],
  );

  const getTransactionsByCategory = useCallback(
    (categoryId: string) => {
      return transactions.filter((t) => t.categoryId === categoryId);
    },
    [transactions],
  );

  const getTransactionsByDateRange = useCallback(
    (startDate: number, endDate: number) => {
      return transactions.filter(
        (t) => t.date >= startDate && t.date <= endDate,
      );
    },
    [transactions],
  );

  const getTransactionsByAccount = useCallback(
    (accountId: string) => {
      return transactions.filter((t) => t.accountId === accountId);
    },
    [transactions],
  );

  const getTransactionsByType = useCallback(
    (type: "income" | "expense") => {
      return transactions.filter((t) => t.type === type);
    },
    [transactions],
  );

  const getMonthlyStats = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      const transactionDate = new Date(t.date);
      if (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      ) {
        if (t.type === "income") {
          income += t.amount;
        } else {
          expense += t.amount;
        }
      }
    });

    return { income, expense, balance: income - expense };
  }, [transactions]);

  const getMonthlyStatsByCurrencyMethod = useCallback(() => {
    return getMonthlyStatsByCurrency(transactions);
  }, [transactions]);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        loading,
        error,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransaction,
        getTransactionsByAccount,
        getTransactionsByCategory,
        getTransactionsByDateRange,
        getTransactionsByType,
        getMonthlyStats,
        getMonthlyStatsByCurrency: getMonthlyStatsByCurrencyMethod,
        refreshTransactions: loadTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error("useTransactions must be used within TransactionProvider");
  }
  return context;
}
