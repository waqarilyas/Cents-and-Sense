import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Transaction, getDatabase, Account } from "../database";
import { getMonthlyStatsByCurrency } from "../utils/currencyHelpers";

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
  getMonthlyStatsByCurrency: () => Record<string, { income: number; expense: number; balance: number }>;
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
      accountId: string,
      categoryId: string,
      amount: number,
      description: string,
      date: number,
      type: "income" | "expense",
    ) => {
      // Get currency from account
      const db = await getDatabase();
      const account = await db.getFirstAsync<Account>(
        "SELECT * FROM accounts WHERE id = ? LIMIT 1",
        [accountId],
      );

      if (!account) {
        throw new Error("Account not found");
      }

      const currency = account.currency;
      const id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newTransaction: Transaction = {
        id,
        accountId,
        categoryId,
        amount,
        currency,
        description,
        date,
        type,
        createdAt: Date.now(),
      };

      // Optimistic update - add to UI immediately
      setTransactions((prev) => [newTransaction, ...prev]);
      setError(null);

      try {
        await db.runAsync(
          "INSERT INTO transactions (id, accountId, categoryId, amount, currency, description, date, type, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            id,
            accountId,
            categoryId,
            amount,
            currency,
            description,
            date,
            type,
            Date.now(),
          ],
        );

        // Update account balance (accountId is always provided)
        await updateAccountBalance(accountId, amount, type, "add");
      } catch (err) {
        // Rollback on error - remove the transaction
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        const message =
          err instanceof Error ? err.message : "Failed to add transaction";
        setError(message);
        throw err;
      }
    },
    [],
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
      // Get the old transaction for rollback
      const oldTx = transactions.find((t) => t.id === id);
      if (!oldTx) {
        throw new Error("Transaction not found");
      }

      // Get currency from account
      const db = await getDatabase();
      const account = await db.getFirstAsync<Account>(
        "SELECT * FROM accounts WHERE id = ? LIMIT 1",
        [accountId],
      );

      if (!account) {
        throw new Error("Account not found");
      }

      const currency = account.currency;

      // Create updated transaction
      const updatedTx: Transaction = {
        ...oldTx,
        categoryId,
        amount,
        currency,
        description,
        date,
        type,
        accountId,
      };

      // Optimistic update - update in UI immediately
      setTransactions((prev) => prev.map((t) => (t.id === id ? updatedTx : t)));
      setError(null);

      try {
        // Revert old transaction's balance impact (oldTx always has accountId now)
        if (oldTx.accountId) {
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
            accountId,
            categoryId,
            amount,
            currency,
            description,
            date,
            type,
            id,
          ],
        );

        // Apply new transaction's balance impact (accountId is always provided)
        await updateAccountBalance(accountId, amount, type, "add");
      } catch (err) {
        // Rollback on error - restore old transaction
        setTransactions((prev) => prev.map((t) => (t.id === id ? oldTx : t)));
        const message =
          err instanceof Error ? err.message : "Failed to update transaction";
        setError(message);
        throw err;
      }
    },
    [transactions],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      // Get the transaction to revert its balance impact
      const tx = transactions.find((t) => t.id === id);
      if (!tx) {
        throw new Error("Transaction not found");
      }

      // Optimistic update - remove from UI immediately
      const previousTransactions = [...transactions];
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setError(null);

      try {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);

        // Revert the transaction's balance impact
        if (tx.accountId) {
          await updateAccountBalance(
            tx.accountId,
            tx.amount,
            tx.type,
            "remove",
          );
        }
      } catch (err) {
        // Rollback on error
        setTransactions(previousTransactions);
        const message =
          err instanceof Error ? err.message : "Failed to delete transaction";
        setError(message);
        throw err;
      }
    },
    [transactions],
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
