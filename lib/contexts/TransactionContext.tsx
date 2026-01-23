import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Transaction, getDatabase } from "../database";

interface TransactionContextType {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  addTransaction: (
    categoryId: string,
    amount: number,
    description: string,
    date: number,
    type: "income" | "expense",
    accountId?: string,
    currency?: string,
  ) => Promise<void>;
  updateTransaction: (
    id: string,
    categoryId: string,
    amount: number,
    description: string,
    date: number,
    type: "income" | "expense",
    accountId?: string,
    currency?: string,
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransaction: (id: string) => Transaction | undefined;
  getTransactionsByCategory: (categoryId: string) => Transaction[];
  getTransactionsByDateRange: (
    startDate: number,
    endDate: number,
  ) => Transaction[];
  getTransactionsByType: (type: "income" | "expense") => Transaction[];
  getMonthlyStats: () => { income: number; expense: number; balance: number };
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
        "SELECT * FROM transactions ORDER BY date DESC, createdAt DESC",
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

  // Helper function to update account balance
  const updateAccountBalance = async (
    accountId: string,
    amount: number,
    type: "income" | "expense",
    operation: "add" | "remove",
  ) => {
    const db = await getDatabase();
    // For income: add increases balance, remove decreases
    // For expense: add decreases balance, remove increases
    const balanceChange =
      type === "income"
        ? operation === "add"
          ? amount
          : -amount
        : operation === "add"
          ? -amount
          : amount;

    await db.runAsync(
      "UPDATE accounts SET balance = balance + ? WHERE id = ?",
      [balanceChange, accountId],
    );
  };

  const addTransaction = useCallback(
    async (
      categoryId: string,
      amount: number,
      description: string,
      date: number,
      type: "income" | "expense",
      accountId?: string,
      currency: string = "USD",
    ) => {
      try {
        setError(null);
        const id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const db = await getDatabase();
        await db.runAsync(
          "INSERT INTO transactions (id, accountId, categoryId, amount, currency, description, date, type, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            id,
            accountId || null,
            categoryId,
            amount,
            currency,
            description,
            date,
            type,
            Date.now(),
          ],
        );

        // Update account balance if accountId is provided
        if (accountId) {
          await updateAccountBalance(accountId, amount, type, "add");
        }

        await loadTransactions();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add transaction";
        setError(message);
        throw err;
      }
    },
    [loadTransactions],
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      categoryId: string,
      amount: number,
      description: string,
      date: number,
      type: "income" | "expense",
      accountId?: string,
      currency: string = "USD",
    ) => {
      try {
        setError(null);
        const db = await getDatabase();

        // Get the old transaction to revert its balance impact
        const oldTx = transactions.find((t) => t.id === id);

        // Revert old transaction's balance impact
        if (oldTx?.accountId) {
          await updateAccountBalance(
            oldTx.accountId,
            oldTx.amount,
            oldTx.type,
            "remove",
          );
        }

        // Update the transaction
        await db.runAsync(
          "UPDATE transactions SET accountId = ?, categoryId = ?, amount = ?, currency = ?, description = ?, date = ?, type = ? WHERE id = ?",
          [
            accountId || null,
            categoryId,
            amount,
            currency,
            description,
            date,
            type,
            id,
          ],
        );

        // Apply new transaction's balance impact
        if (accountId) {
          await updateAccountBalance(accountId, amount, type, "add");
        }

        await loadTransactions();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update transaction";
        setError(message);
        throw err;
      }
    },
    [loadTransactions, transactions],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const db = await getDatabase();

        // Get the transaction to revert its balance impact
        const tx = transactions.find((t) => t.id === id);

        await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);

        // Revert the transaction's balance impact
        if (tx?.accountId) {
          await updateAccountBalance(
            tx.accountId,
            tx.amount,
            tx.type,
            "remove",
          );
        }

        await loadTransactions();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete transaction";
        setError(message);
        throw err;
      }
    },
    [loadTransactions, transactions],
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
        getTransactionsByCategory,
        getTransactionsByDateRange,
        getTransactionsByType,
        getMonthlyStats,
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
